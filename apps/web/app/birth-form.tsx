"use client";

// The full birth form (step 0.4.6, design spec §5.2, D-134), grown out of the 0.2.13 / 0.2.15 form.
// Face of the card: Name · Date of birth (+ the old-clock "i" when it applies) · Time of birth ·
// Place of birth · Chart style · the "Advanced settings" link · "See my chart" · the privacy line.
// No visible heading (a hidden one names the form). Advanced settings opens inside the card
// (advanced-settings.tsx): coordinates · "Which clock?" (only when it applies) · birth-time
// certainty (two choices switched off) · seconds.
//
// "See my chart" sends the details to POST /api/chart (lib/chart-request.ts) and shows the result
// below the form, as before (until the chart page, 0.5.1). The NAME is never sent to the server (it
// only appears in the result cards' details line). Remembered in this browser only (NFR-PRIV-01): the
// chart style, under localStorage "chartStyle" (FR-IN-10), and, from step 0.4.7 (D-136), the inputs
// of every successful chart as a saved profile (components/profiles-store.ts; never the results).
//
// Saved profiles come back through the URL with only their id: "/?profile=<id>" (Open: filled and
// calculated at once) and "/?edit=<id>" (Edit: filled, not calculated, with an "Editing …" line; the
// next successful "See my chart" updates that profile). The id is taken out of the address bar again
// as soon as the profile is loaded.
//
// Checks show as the user goes (once the date is complete or a field is left), and "See my chart"
// never calculates while something is wrong: it moves focus to the first field to fix instead,
// opening Advanced settings when that field is inside it.

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import type { ChartResponse, PlaceSuggestion } from "@jathag/api";
import { errorFor, type FieldError, type FormField } from "@/lib/api-errors";
import { earlyClockNote } from "@/lib/clock-note";
import { chosenClockNote, clockChoiceView, effectiveClock } from "@/lib/clock-choice";
import type { ClockId } from "@/lib/clock-rule";
import { birthDate, daysInMonth, isUsableDate, usableYear } from "@/lib/birth-date";
import { birthSummary } from "@/lib/birth-summary";
import type { RepeatedTime } from "@/lib/chart-request";
import { birthFromForm, EMPTY_FORM, formFromBirth, requestFromForm, type FormValues } from "@/lib/form-values";
import { readChartStyle, saveChartStyle, type ChartStyle } from "@/lib/chart-style";
import { fill, formatUtcOffset } from "@/lib/chart-format";
import { formatCoordinateShort, parseCoordinate } from "@/lib/coordinates";
import { checkDate, checkTime, firstProblem, type DatePart, type TimePart } from "@/lib/form-checks";
import { shownOffsetSeconds } from "@/lib/place-offset";
import { listContext } from "@/lib/list-context";
import { profileFromUrl } from "@/lib/profile-link";
import { HOURS, MINUTES, SECONDS, to24h, withSeconds, type Period } from "@/lib/time-12h";
import type { Messages } from "@/lib/i18n";
import { Button, buttonClass } from "@/components/button";
import { Divider } from "@/components/divider";
import { findProfile, markOpened, saveFromForm } from "@/components/profiles-store";
import { Toggle } from "@/components/toggle";
import { AdvancedSettings } from "./advanced-settings";
import { ChartStyleChoice } from "./chart-style-choice";
import { ClockNoteButton } from "./clock-note-button";
import { PlaceSearch } from "./place-search";
import { PlanetTable } from "./planet-table";
import { DashaList } from "./dasha-list";
import { LifeAreaList } from "./life-area-list";
import { RightNow } from "./right-now";
import { TransitList } from "./transit-list";
import { SouthChart, type BirthShown } from "./south-chart";

type Errors = Partial<Record<FormField, string>>;
type Group = "date" | "time" | "place" | "lat" | "lng";

const two = (n: number) => String(n).padStart(2, "0");

function ErrorText({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="field-error mt-2">
      {text}
    </p>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="advanced-chevron">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** True when focus has left the element (and everything inside it). */
const left = (e: FocusEvent<HTMLElement>) => !e.currentTarget.contains(e.relatedTarget as Node | null);

/** Desktop (≥ 1024 px): the Month list uses short names there (spec §5.2). */
const DESKTOP = "(min-width: 64rem)";
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const useDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );

/** The remembered chart style, read once after the page has loaded (the server always draws South). */
const noSubscribe = () => () => {};
const useStoredChartStyle = () =>
  useSyncExternalStore(
    noSubscribe,
    () => readChartStyle(window.localStorage),
    () => "south" as ChartStyle,
  );

interface Result {
  data: ChartResponse;
  summary: string;
  birth: BirthShown;
  style: ChartStyle;
}

/** What the form starts with: empty, or a saved profile (Open or Edit). */
interface Start {
  /** A new key starts the form afresh (Cancel, or a profile loaded after the page came up). */
  key: number;
  values: FormValues;
  repeatedTime: RepeatedTime | null;
  /** Edit: the profile the next successful "See my chart" updates. */
  editing: { id: string; name: string } | null;
  /** Open: calculate as soon as the form is filled. */
  calculate: boolean;
}

const EMPTY_START: Start = { key: 0, values: EMPTY_FORM, repeatedTime: null, editing: null, calculate: false };

export function BirthForm({ t }: { t: Messages }) {
  const [start, setStart] = useState<Start>(EMPTY_START);

  // A profile from /profiles: "?profile=<id>" or "?edit=<id>" (read once the page is in the browser;
  // the server always draws the empty form).
  useEffect(() => {
    const link = profileFromUrl(window.location.search);
    if (!link) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    const profile = findProfile(link.id);
    if (!profile) return;
    const { values, repeatedTime } = formFromBirth(profile.birth, profile.name);
    if (link.mode === "open") markOpened(profile.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loaded from storage, which only exists in the browser
    setStart({
      key: 1,
      values,
      repeatedTime,
      editing: link.mode === "edit" ? { id: profile.id, name: profile.name } : null,
      calculate: link.mode === "open",
    });
  }, []);

  return (
    <BirthFormBody
      key={start.key}
      t={t}
      start={start}
      onCancelEdit={() => setStart((s) => ({ ...EMPTY_START, key: s.key + 1 }))}
    />
  );
}

function BirthFormBody({ t, start, onCancelEdit }: { t: Messages; start: Start; onCancelEdit: () => void }) {
  const f = t.form;
  const a = f.advanced;
  const id = useId();
  const ids = {
    title: `${id}-title`,
    name: `${id}-name`,
    day: `${id}-day`,
    month: `${id}-month`,
    year: `${id}-year`,
    hour: `${id}-hour`,
    minute: `${id}-minute`,
    second: `${id}-second`,
    period: `${id}-am`, // the AM option: first of the AM | PM pair
    timeHint: `${id}-time-hint`,
    place: `${id}-place`,
    dateError: `${id}-date-error`,
    timeError: `${id}-time-error`,
    placeError: `${id}-place-error`,
    formError: `${id}-form-error`,
    repeated: `${id}-repeated`,
    advancedToggle: `${id}-adv-toggle`,
  };
  const advIds = {
    panel: `${id}-adv`,
    manual: `${id}-manual`,
    lat: `${id}-lat`,
    lng: `${id}-lng`,
    offset: `${id}-offset`,
    latError: `${id}-lat-error`,
    lngError: `${id}-lng-error`,
    clockLegend: `${id}-clock`,
    clockPrefix: `${id}-clock-opt`,
    seconds: `${id}-seconds`,
  };
  const init = start.values;

  const desktop = useDesktop();
  const storedStyle = useStoredChartStyle();

  const [name, setName] = useState(init.name);
  const [day, setDay] = useState(init.day);
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [second, setSecond] = useState(init.second);
  const [period, setPeriod] = useState<Period | null>(init.period);
  const [place, setPlace] = useState<PlaceSuggestion | null>(init.place);
  /** Edit mode (D-136 item 3): the profile the next successful "See my chart" updates. */
  const [editing, setEditing] = useState(start.editing);
  /** The user's own pick; null = the remembered one (South the first time). */
  const [styleChoice, setStyleChoice] = useState<ChartStyle | null>(null);
  const chartStyle = styleChoice ?? storedStyle;
  // Advanced settings
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualOn, setManualOn] = useState(init.manualOn);
  const [lat, setLat] = useState(init.lat);
  const [lng, setLng] = useState(init.lng);
  const [utcOffset, setUtcOffset] = useState(init.utcOffset);
  /** The "Which clock?" pick; null = the default. Reset when the date or the place changes. */
  const [clockChoice, setClockChoice] = useState<ClockId | null>(init.clockChoice);
  const [secondsOn, setSecondsOn] = useState(init.secondsOn);

  const [ambiguous, setAmbiguous] = useState(false);
  /** Messages from the API (by field). */
  const [serverErrors, setServerErrors] = useState<Errors>({});
  /** Which groups may show their live check (left once with something in them, or after "See my chart"). */
  const [shown, setShown] = useState<Record<Group, boolean>>({ date: false, time: false, place: false, lat: false, lng: false });
  const [submitting, setSubmitting] = useState(false);
  /** State C: the request did not reach the server (or no answer came back). */
  const [unreachable, setUnreachable] = useState(false);
  /** The repeated-time choice of the last attempt, for "Try again". */
  const lastRepeated = useRef<RepeatedTime | null>(start.repeatedTime);
  const [result, setResult] = useState<Result | null>(null);
  /** Heading of the chart (the first result card): the page scrolls there after calculating. */
  const resultHeading = useRef<HTMLHeadingElement>(null);
  /** Dates and words for the 0.3.7 lists, worked out once per result. */
  const lists = useMemo(() => (result ? listContext(result.data, t) : null), [result, t]);

  const fullDate = birthDate(day, month, year);
  const date = fullDate && isUsableDate(fullDate) ? fullDate : null;
  const time = to24h(hour, minute, period);
  const yearNumber = usableYear(year);
  const maxDay = daysInMonth(month ? Number(month) : null, /^\d{4}$/.test(year) ? Number(year) : null);

  // Live checks (D-094 items 3–4).
  const dateCheck = checkDate(day, month, year, { missing: t.missing, errors: t.errors, months: f.date.months });
  const timeCheck = checkTime(hour, minute, period, t);
  const latValue = manualOn ? parseCoordinate(lat, "lat") : null;
  const lngValue = manualOn ? parseCoordinate(lng, "lng") : null;
  const dateComplete = Boolean(day && month && year.length === 4);
  const dateLive = dateCheck && (shown.date || dateCheck.immediate || dateComplete) ? dateCheck : null;
  const timeLive = timeCheck && shown.time ? timeCheck : null;

  const dateMessage = serverErrors.date ?? dateLive?.message;
  const timeMessage = serverErrors.time ?? timeLive?.message;
  const placeMessage = manualOn ? undefined : (serverErrors.place ?? (!place && shown.place ? t.missing.place : undefined));
  const latMessage = manualOn && latValue === null && shown.lat ? t.missing.latitude : undefined;
  const lngMessage = manualOn && lngValue === null && shown.lng ? t.missing.longitude : undefined;
  const dateBad = (p: DatePart) => Boolean(serverErrors.date || dateLive?.parts.includes(p));
  const timeBad = (p: TimePart) => Boolean(serverErrors.time || timeLive?.parts.includes(p));

  // "Which clock?" (inside Advanced settings) and the "i" note: never with typed coordinates.
  const clockView = useMemo(
    () => (manualOn ? null : clockChoiceView(place, date, a.clock, t.clockNote)),
    [manualOn, place, date, a.clock, t.clockNote],
  );
  const note = useMemo(
    () => (manualOn ? null : earlyClockNote(place, date, yearNumber, t.clockNote)),
    [manualOn, place, date, yearNumber, t.clockNote],
  );
  const noteText = note ? (chosenClockNote(clockView, clockChoice, t.clockNote, a.clock.labels) ?? note.text) : "";

  // The UTC offset under the place: the clock the chart will use in a window (the default, or the
  // one picked in Advanced settings), else the zone on that date.
  const offset = useMemo(() => {
    if (!place) return "";
    const used = effectiveClock(clockView, clockChoice);
    return formatUtcOffset(used ? used.utcOffsetSeconds : shownOffsetSeconds(place, date, time));
  }, [place, clockView, clockChoice, date, time]);

  // After a successful calculation: scroll smoothly down to the chart, the first result card
  // (instantly with reduced motion); the card is scrolled to and its heading gets the focus.
  useEffect(() => {
    const heading = resultHeading.current;
    if (!result || !heading) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.focus({ preventScroll: true });
    (heading.closest("section") ?? heading).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [result]);

  /** Any change to the birth clears that field's API message, the "which one?" question and state C. */
  function changed(field: FormField) {
    setServerErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
    setAmbiguous(false);
    setUnreachable(false);
    // A new date or place may change the clock question: back to its default (D-134).
    if (field === "date" || field === "place") setClockChoice(null);
  }

  const show = (g: Group) => setShown((s) => (s[g] ? s : { ...s, [g]: true }));

  // Move keyboard focus after the messages are on screen (so screen readers read them with the field).
  const pendingFocus = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el =
      target === "first-invalid"
        ? formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
        : document.getElementById(target);
    if (!el) return;
    if (!el.closest(".advanced-panel")) {
      el.focus();
      return;
    }
    // Inside Advanced settings, which may still be opening (240 ms): focus now without scrolling (the
    // panel's hidden overflow would swallow it), then bring the field into view once it is open.
    el.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }), reduce ? 0 : 260);
  });

  /** Open Advanced settings and move focus to one of its fields. */
  function openAdvancedAt(target: string) {
    setAdvancedOpen(true);
    pendingFocus.current = target;
  }

  /** The "i" note's link: to the selected option of the "Which clock?" choice. */
  function goToClock() {
    const selected = effectiveClock(clockView, clockChoice);
    if (selected) openAdvancedAt(`${advIds.clockPrefix}-${selected.id}`);
  }

  /** State D's link (and the checkbox): typed coordinates instead of the place search. */
  function setManual(on: boolean) {
    setManualOn(on);
    changed("place");
  }

  async function calculate(repeatedTime: RepeatedTime | null) {
    // Something wrong: don't calculate; show every message and go to the first field to fix.
    const problem0 = firstProblem(
      dateCheck,
      timeCheck,
      manualOn ? { manual: true, latOk: latValue !== null, lngOk: lngValue !== null } : { manual: false, placeChosen: Boolean(place) },
    );
    if (problem0 || !date || !time) {
      setShown({ date: true, time: true, place: true, lat: true, lng: true });
      if (problem0?.inAdvanced) openAdvancedAt(problem0.field === "lat" ? advIds.lat : advIds.lng);
      else if (problem0) pendingFocus.current = ids[problem0.field as Exclude<typeof problem0.field, "lat" | "lng">];
      return;
    }
    setServerErrors({});
    setUnreachable(false);
    setSubmitting(true);
    lastRepeated.current = repeatedTime;
    const fullTime = withSeconds(time, secondsOn ? second : null);
    const values: FormValues = { name, day, month, year, hour, minute, second, period, secondsOn, place, manualOn, lat, lng, utcOffset, clockChoice };
    const body = requestFromForm(values, clockView, repeatedTime)!;
    const placeLabel =
      manualOn && latValue !== null && lngValue !== null
        ? fill(t.chart.manualPlace, { lat: formatCoordinateShort(latValue, "lat"), lng: formatCoordinateShort(lngValue, "lng") })
        : place!.label;
    let problem: FieldError | null = null;
    let offline = false;
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.chart) {
        const shownBirth = birthSummary({ name, date, time: fullTime, place: placeLabel, repeatedTime }, t);
        setResult({ data: data as ChartResponse, summary: shownBirth.summary, birth: shownBirth.birth, style: chartStyle });
        saveChartStyle(window.localStorage, chartStyle);
        // Kept as a saved profile, in this browser only (D-136): the inputs, never the results.
        const birth = birthFromForm(values, clockView, repeatedTime);
        if (birth) saveFromForm(birth, name, editing?.id ?? null, t.profiles.defaultName);
        setEditing(null);
        setAmbiguous(false);
      } else {
        problem = errorFor(data?.error?.code, t.errors);
        // With typed coordinates, place problems belong to the coordinates, not the (unused) search box.
        if (manualOn && problem.field === "place") problem = { ...problem, field: "form" };
      }
    } catch {
      offline = true;
    }
    setSubmitting(false);
    if (offline) {
      setResult(null); // never leave an older chart under a new error
      setUnreachable(true);
    } else if (problem) {
      setResult(null);
      if (problem.code === "AMBIGUOUS_LOCAL_TIME") {
        setAmbiguous(true);
      } else {
        if (problem.field !== "form") pendingFocus.current = "first-invalid";
        setServerErrors({ [problem.field]: problem.message });
      }
    }
  }

  // Open (D-136 item 2): calculate at once with the saved details (once, also in React's dev double run).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!start.calculate || autoStarted.current) return;
    autoStarted.current = true;
    void calculate(start.repeatedTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only once, with the values the form started with
  }, []);

  const dateDescribedBy = dateMessage ? ids.dateError : undefined;
  const timeDescribedBy = [ids.timeHint, timeMessage ? ids.timeError : null, ambiguous ? ids.repeated : null].filter(Boolean).join(" ");

  // The Day list: only days that exist for the chosen month and year. A day chosen earlier that no
  // longer exists (31 → April) stays visible, flagged, until it is changed.
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);
  if (day && Number(day) > maxDay) dayOptions.push(Number(day));
  const monthNames = desktop ? f.date.monthsShort : f.date.months;

  const timeSelect = (
    which: "hour" | "minute" | "second",
    value: string,
    set: (v: string) => void,
    options: readonly number[],
    placeholder: string | null,
    label: string,
  ) => (
    <div className="w-[4.75rem] sm:w-[5.25rem]">
      <label htmlFor={ids[which]} className="sr-only">
        {label}
      </label>
      <span className="select-wrap">
        <select
          id={ids[which]}
          value={value}
          aria-invalid={which !== "second" && timeBad(which) ? true : undefined}
          aria-describedby={timeDescribedBy}
          onChange={(e) => {
            set(e.target.value);
            changed("time");
          }}
          className="form-input form-select tabular-nums"
        >
          {placeholder !== null && <option value="">{placeholder}</option>}
          {options.map((n) => (
            <option key={n} value={String(n)}>
              {which === "hour" ? n : two(n)}
            </option>
          ))}
        </select>
      </span>
    </div>
  );

  return (
    <>
      <section className="birth-form card-outer p-4 sm:p-6 lg:p-7">
        {/* No visible heading (D-134 item 1); this one names the form for screen readers. */}
        <h2 id={ids.title} className="sr-only">
          {f.srTitle}
        </h2>

        <form
          ref={formRef}
          noValidate
          aria-labelledby={ids.title}
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void calculate(null);
          }}
        >
          {/* Edit mode (D-136 item 3): one small line above the fields, with a quiet way out */}
          {editing && (
            <div className="notice flex items-center justify-between gap-3 py-1 pr-2 text-[13px] leading-5">
              <p className="py-2">{fill(f.editing.line, { name: editing.name })}</p>
              <button type="button" className="editing-cancel shrink-0 px-2" onClick={onCancelEdit}>
                {f.editing.cancel}
              </button>
            </div>
          )}

          {/* Name: not required, never sent (D-134 item 2) */}
          <div>
            <label htmlFor={ids.name} className="form-label">
              {f.name.label}
            </label>
            <input
              id={ids.name}
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input mt-2"
            />
          </div>

          {/* Date of birth: Day and Month dropdowns, Year typed (D-094 item 3) + the old-clock "i" */}
          <fieldset
            aria-describedby={dateDescribedBy}
            onBlur={(e) => {
              if (left(e) && (day || month || year)) show("date");
            }}
          >
            <legend className="sr-only">{f.date.label}</legend>
            <div className="relative flex min-h-6 items-center gap-2">
              <span aria-hidden="true" className="form-label">
                {f.date.label}
              </span>
              {note && (
                <ClockNoteButton
                  label={t.clockNote.buttonLabel}
                  text={noteText}
                  more={place ? undefined : t.clockNote.choosePlaceFirst}
                  link={place && clockView ? { label: t.clockNote.changeLink, onClick: goToClock } : undefined}
                />
              )}
            </div>
            <div className="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)_4.75rem] gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] sm:gap-3">
              <div>
                <label htmlFor={ids.day} className="sr-only">
                  {f.date.day}
                </label>
                <span className="select-wrap">
                  <select
                    id={ids.day}
                    value={day}
                    aria-invalid={dateBad("day") || undefined}
                    aria-describedby={dateDescribedBy}
                    onChange={(e) => {
                      setDay(e.target.value);
                      changed("date");
                    }}
                    className="form-input form-select tabular-nums"
                  >
                    <option value="">{f.date.dayPlaceholder}</option>
                    {dayOptions.map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              <div>
                <label htmlFor={ids.month} className="sr-only">
                  {f.date.month}
                </label>
                <span className="select-wrap">
                  <select
                    id={ids.month}
                    value={month}
                    aria-invalid={dateBad("month") || undefined}
                    aria-describedby={dateDescribedBy}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      changed("date");
                    }}
                    className="form-input form-select"
                  >
                    <option value="">{f.date.monthPlaceholder}</option>
                    {monthNames.map((label, i) => (
                      <option key={f.date.months[i]} value={String(i + 1)}>
                        {label}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              <div>
                <label htmlFor={ids.year} className="sr-only">
                  {f.date.year}
                </label>
                <input
                  id={ids.year}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder={f.date.yearPlaceholder}
                  value={year}
                  aria-invalid={dateBad("year") || undefined}
                  aria-describedby={dateDescribedBy}
                  onChange={(e) => {
                    setYear(e.target.value.replace(/\D/g, ""));
                    changed("date");
                  }}
                  className="form-input tabular-nums"
                />
              </div>
            </div>
            <div aria-live="polite">
              <ErrorText id={ids.dateError} text={dateMessage} />
            </div>
          </fieldset>

          {/* Time of birth: Hour : Minute (: Second) and AM | PM, neither pre-selected (D-094 item 2) */}
          <fieldset
            aria-describedby={timeDescribedBy}
            onBlur={(e) => {
              if (left(e) && (hour || minute || period)) show("time");
            }}
          >
            <legend className="form-label">{f.time.label}</legend>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-3">
              <div className="flex items-center gap-1.5">
                {timeSelect("hour", hour, setHour, HOURS, f.time.hourPlaceholder, f.time.hour)}
                <span aria-hidden="true" className="text-lg font-semibold">
                  :
                </span>
                {timeSelect("minute", minute, setMinute, MINUTES, f.time.minutePlaceholder, f.time.minute)}
                {secondsOn && (
                  <>
                    <span aria-hidden="true" className="text-lg font-semibold">
                      :
                    </span>
                    {timeSelect("second", second, setSecond, SECONDS, null, f.time.second)}
                  </>
                )}
              </div>
              <Toggle
                label={f.time.period}
                options={[
                  { value: "am", label: f.time.am },
                  { value: "pm", label: f.time.pm },
                ]}
                value={period}
                onChange={(p) => {
                  setPeriod(p);
                  changed("time");
                }}
                firstId={ids.period}
                describedBy={timeDescribedBy}
                invalid={timeBad("period")}
                className="w-[7.5rem] shrink-0"
              />
            </div>
            <p id={ids.timeHint} className="field-hint mt-2">
              {f.time.hint}
            </p>
            <div aria-live="polite">
              <ErrorText id={ids.timeError} text={timeMessage} />
            </div>
            {/* State E. Clocks went back (AMBIGUOUS_LOCAL_TIME): which of the two? Then calculate again. */}
            <div aria-live="polite">
              {ambiguous && (
                <div id={ids.repeated} className="mt-3 rounded-md border border-line bg-raised p-4">
                  <p className="text-sm font-semibold">{f.repeatedTime.question}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["earlier", "later"] as const).map((r) => (
                      <Button key={r} variant="quiet" disabled={submitting} onClick={() => void calculate(r)}>
                        {f.repeatedTime[r]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <div>
            <PlaceSearch
              t={f.place}
              searchError={t.errors.search}
              inputId={ids.place}
              place={place}
              offset={offset}
              onChange={(p) => {
                setPlace(p);
                changed("place");
              }}
              onLeave={(hasText) => {
                if (hasText) show("place");
              }}
              error={placeMessage ?? null}
              errorId={ids.placeError}
              disabled={manualOn}
              onEnterCoordinates={() => {
                setManual(true);
                openAdvancedAt(advIds.lat);
              }}
            />
            <div aria-live="polite">
              <ErrorText id={ids.placeError} text={placeMessage} />
            </div>
          </div>

          <ChartStyleChoice t={f.chartStyle} name={`${id}-style`} value={chartStyle} onChange={setStyleChoice} />

          <div>
            {/* "Advanced settings": a small text link directly above "See my chart" (D-134 item 3) */}
            <button
              id={ids.advancedToggle}
              type="button"
              aria-expanded={advancedOpen}
              aria-controls={advIds.panel}
              onClick={() => setAdvancedOpen((o) => !o)}
              className="advanced-toggle"
            >
              {a.toggle}
              <ChevronIcon />
            </button>
            <AdvancedSettings
              t={a}
              comingSoon={t.hero.comingSoon}
              ids={advIds}
              open={advancedOpen}
              manualOn={manualOn}
              onManual={setManual}
              lat={lat}
              lng={lng}
              offset={utcOffset}
              onLat={(v) => {
                setLat(v);
                changed("form");
              }}
              onLng={(v) => {
                setLng(v);
                changed("form");
              }}
              onOffset={(v) => {
                setUtcOffset(v);
                changed("form");
              }}
              latError={latMessage}
              lngError={lngMessage}
              onCoordLeave={(axis) => {
                if ((axis === "lat" ? lat : lng).trim()) show(axis);
              }}
              clock={clockView}
              clockChoice={clockChoice}
              onClock={(c) => {
                setClockChoice(c);
                setServerErrors((e) => ({ ...e, form: undefined }));
                setUnreachable(false);
              }}
              secondsOn={secondsOn}
              onSeconds={(on) => {
                setSecondsOn(on);
                changed("time");
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              aria-describedby={serverErrors.form ? ids.formError : undefined}
              className={buttonClass("primary", true, "btn-busy w-full")}
            >
              {f.submit}
            </button>
            {/* State B: calculating */}
            <div aria-live="polite">
              {submitting && (
                <div className="mt-4">
                  <p className="text-[15px] leading-6 font-semibold">{f.calculating.title}</p>
                  <div className="busy-bar mt-2" />
                  <p className="field-hint mt-2">{f.calculating.text}</p>
                </div>
              )}
            </div>
            <div role="alert">
              <ErrorText id={ids.formError} text={serverErrors.form} />
              {/* State C: the calculator could not be reached */}
              {unreachable && (
                <div className="mt-4 rounded-md border border-line bg-raised p-4">
                  <p className="text-[15px] leading-6 font-semibold">{f.unreachable.title}</p>
                  <p className="field-hint mt-1">{f.unreachable.text}</p>
                  <Button variant="quiet" className="mt-3" disabled={submitting} onClick={() => void calculate(lastRepeated.current)}>
                    {f.unreachable.retry}
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs leading-[18px] text-muted">{f.privacy}</p>
          </div>
        </form>
      </section>

      {/* The result stays under the form until the chart page (0.5.1, D-134 item 10) */}
      {result && <Divider inGrid className="lg:col-span-2" />}
      {result && (
        <SouthChart
          ref={resultHeading}
          result={result.data}
          birth={result.birth}
          summary={result.summary}
          note={result.style === "north" ? f.chartStyle.northNote : undefined}
          t={t.chart}
        />
      )}
      {result && <Divider inGrid className="lg:col-span-2" />}
      {result && <PlanetTable result={result.data} summary={result.summary} t={t.chart} />}
      {/* Step 0.3.7 (D-113): plain lists below the table. Keyed by the calculation moment, so a new
          chart starts with every list closed. */}
      {lists && (
        <>
          <Divider inGrid className="lg:col-span-2" />
          <RightNow ctx={lists} />
          <Divider inGrid className="lg:col-span-2" />
          <DashaList key={`d-${lists.result.dashas.asOf}`} ctx={lists} />
          <Divider inGrid className="lg:col-span-2" />
          <TransitList key={`t-${lists.result.dashas.asOf}`} ctx={lists} />
          <Divider inGrid className="lg:col-span-2" />
          <LifeAreaList ctx={lists} />
        </>
      )}
    </>
  );
}
