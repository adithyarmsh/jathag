"use client";

// The full birth form (step 0.4.6, design spec §5.2, D-134), grown out of the 0.2.13 / 0.2.15 form.
// Face of the card: Name · Date of birth (+ the old-clock "i" when it applies) · Time of birth ·
// Place of birth · Chart style · the "Advanced settings" link · "See my chart" · the privacy line.
// No visible heading (a hidden one names the form). Advanced settings opens inside the card
// (advanced-settings.tsx): coordinates · "Which clock?" (only when it applies) · birth-time
// certainty (two choices switched off) · seconds.
//
// One component, two places (step 0.5.1, D-138 Q4 B): the home page (BirthForm) and the "Edit details"
// panel of the chart page (BirthFormCard in edit mode, filled with a profile). "See my chart" sends the
// details to POST /api/chart (lib/chart-request.ts); the NAME is never sent to the server. On success the
// inputs are kept as a saved profile (D-136; components/profiles-store.ts, never the results) and the
// chart style under localStorage "chartStyle" (FR-IN-10), then `onDone` gets the result:
// - home: the result goes to /chart?profile=<id> in this page's memory (components/chart-handoff.ts);
// - edit: the chart page shows the new result in place and closes the panel.
// Errors (states C and E, the API's field messages) stay in the form, as before.
//
// Old links "/?profile=<id>" and "/?edit=<id>" (0.4.7) are sent on to /chart (replace, so Back does not loop).
//
// Checks show as the user goes (once the date is complete or a field is left), and "See my chart"
// never calculates while something is wrong: it moves focus to the first field to fix instead,
// opening Advanced settings when that field is inside it.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import type { ChartResponse, PlaceSuggestion } from "@jathag/api";
import { errorFor, type FieldError, type FormField } from "@/lib/api-errors";
import { earlyClockNote } from "@/lib/clock-note";
import { chosenClockNote, clockChoiceView, effectiveClock } from "@/lib/clock-choice";
import type { ClockId } from "@/lib/clock-rule";
import { birthDate, daysInMonth, isUsableDate, usableYear } from "@/lib/birth-date";
import type { RepeatedTime } from "@/lib/chart-request";
import { chartHref, SAMPLE_HREF } from "@/lib/chart-page";
import { birthFromForm, EMPTY_FORM, requestFromForm, typedCoordinates, type FormValues } from "@/lib/form-values";
import type { ChartStyle } from "@/lib/chart-style";
import { formatUtcOffset } from "@/lib/chart-format";
import { dmsToDecimal, switchFormat, type CoordFormat, type DmsParts, type DmsValues } from "@/lib/coordinates";
import { checkDate, checkTime, firstProblem, type DatePart, type TimePart } from "@/lib/form-checks";
import { shownOffsetSeconds } from "@/lib/place-offset";
import { profileFromUrl } from "@/lib/profile-link";
import type { BirthInputs } from "@/lib/profiles";
import { HOURS, MINUTES, SECONDS, to24h, type Period } from "@/lib/time-12h";
import type { Messages } from "@/lib/i18n";
import { Button, buttonClass } from "@/components/button";
import { leaveHandoff } from "@/components/chart-handoff";
import { setChartStyle, useChartStyle } from "@/components/chart-style-store";
import { lookupNearest, nearestForProfile } from "@/components/nearest-place";
import { saveFromForm } from "@/components/profiles-store";
import { Toggle } from "@/components/toggle";
import { AdvancedSettings, dmsBoxId, type DmsError } from "./advanced-settings";
import { ChartStyleChoice } from "./chart-style-choice";
import { ClockNoteButton } from "./clock-note-button";
import { PlaceSearch } from "./place-search";

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

/** What a successful "See my chart" hands on (the profile is already saved). */
export interface FormDone {
  /** The saved profile (D-136): new, updated, or the one being edited. */
  id: string;
  /** The profile's name ("My chart" when none was typed). */
  name: string;
  birth: BirthInputs;
  result: ChartResponse;
  style: ChartStyle;
}

/** What the form starts with: empty (home) or a saved profile (the chart page's edit panel). */
export interface FormStart {
  values: FormValues;
  repeatedTime: RepeatedTime | null;
}

const EMPTY_START: FormStart = { values: EMPTY_FORM, repeatedTime: null };

/** The home page's form: after a successful calculation it opens the chart page (D-138). */
export function BirthForm({ t }: { t: Messages }) {
  const router = useRouter();

  // 0.4.7 links to the home form ("?profile=<id>", "?edit=<id>") now belong to the chart page.
  useEffect(() => {
    const link = profileFromUrl(window.location.search);
    if (link) router.replace(chartHref(link.id, link.mode === "edit"));
  }, [router]);

  return (
    <BirthFormCard
      t={t}
      start={EMPTY_START}
      editing={null}
      onDone={(done) => {
        leaveHandoff({ id: done.id, name: done.name, birth: done.birth, result: done.result });
        router.push(chartHref(done.id));
      }}
    />
  );
}

/**
 * The form card itself. `editing`: the profile the edit panel updates (D-136 item 3), with a Cancel
 * button and "Update chart"; null on the home page (with the "See a sample chart" link).
 */
export function BirthFormCard({
  t,
  start,
  editing,
  onDone,
  onCancel,
}: {
  t: Messages;
  start: FormStart;
  editing: { id: string; name: string } | null;
  onDone: (done: FormDone) => void;
  onCancel?: () => void;
}) {
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
  // The remembered style (lib/chart-style.ts via components/chart-style-store.ts): the same one the
  // chart page's South / North toggle shows and changes (D-143 item 1).
  const storedStyle = useChartStyle();

  const [name, setName] = useState(init.name);
  const [day, setDay] = useState(init.day);
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [second, setSecond] = useState(init.second);
  const [period, setPeriod] = useState<Period | null>(init.period);
  const [place, setPlace] = useState<PlaceSuggestion | null>(init.place);
  /** The user's own pick; null = the remembered one (South the first time). */
  const [styleChoice, setStyleChoice] = useState<ChartStyle | null>(null);
  const chartStyle = styleChoice ?? storedStyle;
  // Advanced settings
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualOn, setManualOn] = useState(init.manualOn);
  const [coordFormat, setCoordFormat] = useState<CoordFormat>(init.coordFormat);
  const [dms, setDms] = useState<DmsValues>(init.dms);
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

  const fullDate = birthDate(day, month, year);
  const date = fullDate && isUsableDate(fullDate) ? fullDate : null;
  const time = to24h(hour, minute, period);
  const yearNumber = usableYear(year);
  const maxDay = daysInMonth(month ? Number(month) : null, /^\d{4}$/.test(year) ? Number(year) : null);

  // Live checks (D-094 items 3–4).
  const dateCheck = checkDate(day, month, year, { missing: t.missing, errors: t.errors, months: f.date.months });
  const timeCheck = checkTime(hour, minute, period, t);
  const typed = typedCoordinates({ coordFormat, dms, lat, lng });
  const latValue = manualOn ? typed.lat : null;
  const lngValue = manualOn ? typed.lng : null;
  const dateComplete = Boolean(day && month && year.length === 4);
  const dateLive = dateCheck && (shown.date || dateCheck.immediate || dateComplete) ? dateCheck : null;
  const timeLive = timeCheck && shown.time ? timeCheck : null;

  const dateMessage = serverErrors.date ?? dateLive?.message;
  const timeMessage = serverErrors.time ?? timeLive?.message;
  const placeMessage = manualOn ? undefined : (serverErrors.place ?? (!place && shown.place ? t.missing.place : undefined));
  const latMessage = manualOn && coordFormat === "dd" && latValue === null && shown.lat ? t.missing.latitude : undefined;
  const lngMessage = manualOn && coordFormat === "dd" && lngValue === null && shown.lng ? t.missing.longitude : undefined;
  // DMS (step 0.5.2): which box is wrong and why, in plain words (spec §3.4).
  const dmsError = (axis: "lat" | "lng"): DmsError | undefined => {
    if (!manualOn || coordFormat !== "dms" || !shown[axis]) return undefined;
    const r = dmsToDecimal(dms[axis], axis);
    if ("value" in r) return undefined;
    const words = {
      degrees: axis === "lat" ? t.missing.dmsDegreesLat : t.missing.dmsDegreesLng,
      minutes: t.missing.dmsMinutes,
      seconds: t.missing.dmsSeconds,
      pole: axis === "lat" ? t.missing.dmsPoleLat : t.missing.dmsPoleLng,
    };
    return { message: words[r.problem], part: r.part };
  };
  const latDmsError = dmsError("lat");
  const lngDmsError = dmsError("lng");
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

  /** The first box of a coordinate to fix (DMS: the box with the problem; DD: the one field). */
  function coordinateTarget(axis: "lat" | "lng"): string {
    const axisId = axis === "lat" ? advIds.lat : advIds.lng;
    if (coordFormat !== "dms") return axisId;
    const r = dmsToDecimal(dms[axis], axis);
    return dmsBoxId(axisId, "part" in r ? r.part : "d");
  }

  /** DMS ↔ DD: what is typed is converted; text that cannot be converted is kept as typed (lib/coordinates.ts). */
  function changeFormat(to: CoordFormat) {
    if (to === coordFormat) return;
    const next = switchFormat(to, { dd: { lat, lng }, dms });
    setLat(next.dd.lat);
    setLng(next.dd.lng);
    setDms(next.dms);
    setCoordFormat(to);
    changed("form");
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
      if (problem0?.inAdvanced) openAdvancedAt(coordinateTarget(problem0.field === "lat" ? "lat" : "lng"));
      else if (problem0) pendingFocus.current = ids[problem0.field as Exclude<typeof problem0.field, "lat" | "lng">];
      return;
    }
    setServerErrors({});
    setUnreachable(false);
    setSubmitting(true);
    lastRepeated.current = repeatedTime;
    const values: FormValues = { name, day, month, year, hour, minute, second, period, secondsOn, place, manualOn, coordFormat, dms, lat, lng, utcOffset, clockChoice };
    const body = requestFromForm(values, clockView, repeatedTime)!;
    // Typed coordinates: the nearest place is looked up alongside (D-144), never waited for here.
    const coords = manualOn && latValue !== null && lngValue !== null ? { lat: latValue, lng: lngValue } : null;
    if (coords) void lookupNearest(coords.lat, coords.lng);
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
        setChartStyle(chartStyle);
        // Kept as a saved profile, in this browser only (D-136): the inputs, never the results.
        const birth = birthFromForm(values, clockView, repeatedTime)!;
        const saved = saveFromForm(birth, name, editing?.id ?? null, t.profiles.defaultName, editing?.name);
        if (coords) void nearestForProfile(saved.id, coords);
        setAmbiguous(false);
        setSubmitting(false);
        onDone({ id: saved.id, name: saved.name, birth, result: data as ChartResponse, style: chartStyle });
        return;
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
      setUnreachable(true);
    } else if (problem) {
      if (problem.code === "AMBIGUOUS_LOCAL_TIME") {
        setAmbiguous(true);
      } else {
        if (problem.field !== "form") pendingFocus.current = "first-invalid";
        setServerErrors({ [problem.field]: problem.message });
      }
    }
  }

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
      <section className={editing ? "birth-form" : "birth-form card-outer p-4 sm:p-6 lg:p-7"}>
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
                openAdvancedAt(coordFormat === "dms" ? dmsBoxId(advIds.lat, "d") : advIds.lat);
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
                if (coordFormat === "dms" || (axis === "lat" ? lat : lng).trim()) show(axis);
              }}
              coordFormat={coordFormat}
              onFormat={changeFormat}
              dms={dms}
              onDms={(axis, parts: DmsParts) => {
                setDms((d) => ({ ...d, [axis]: parts }));
                changed("form");
              }}
              latDmsError={latDmsError}
              lngDmsError={lngDmsError}
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
              {editing ? f.editing.submit : f.submit}
            </button>
            {editing && onCancel && (
              <Button variant="quiet" className="mt-3 w-full" onClick={onCancel}>
                {f.editing.cancel}
              </Button>
            )}
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
            {/* D-138 Q7: a look at a made-up chart, home page only */}
            {!editing && (
              <p className="mt-3 text-center">
                <Link href={SAMPLE_HREF} className="sample-link">
                  {f.sampleLink}
                </Link>
              </p>
            )}
            <p className="mt-3 text-center text-xs leading-[18px] text-muted">{f.privacy}</p>
          </div>
        </form>
      </section>

    </>
  );
}
