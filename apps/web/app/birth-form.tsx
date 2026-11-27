"use client";

// The minimal birth form (steps 0.2.13 and 0.2.15; D-092, D-094): date, exact time and place.
// "See my chart" sends them to POST /api/chart (always the DEFAULT clock, no clock choice is sent)
// and shows the planet table below. Nothing about the birth is stored in the browser: it lives only
// in this component's memory and is gone when the page is closed or reloaded (NFR-PRIV-01).
//
// 0.2.15: Day and Month are dropdowns (Day only lists days that exist), Year is typed; time is
// Hour and Minute pick-lists plus AM | PM buttons with neither pre-selected; problems show as the
// user goes (once the date is complete or a field is left), and "See my chart" never calculates
// while something is wrong: it moves focus to the first field to fix instead.

import { useEffect, useId, useMemo, useRef, useState, type FocusEvent } from "react";
import type { ChartResponse, PlaceSuggestion } from "@jathag/api";
import { errorFor, networkError, type FieldError, type FormField } from "@/lib/api-errors";
import { earlyClockNote } from "@/lib/clock-note";
import { birthDate, daysInMonth, isUsableDate, usableYear } from "@/lib/birth-date";
import { fill, formatUtcOffset } from "@/lib/chart-format";
import { checkDate, checkTime, type DatePart, type TimePart } from "@/lib/form-checks";
import { shownOffsetSeconds } from "@/lib/place-offset";
import { listContext } from "@/lib/list-context";
import { HOURS, MINUTES, to12hText, to24h, type Period } from "@/lib/time-12h";
import type { Messages } from "@/lib/i18n";
import { buttonClass } from "@/components/button";
import { Divider } from "@/components/divider";
import { ClockNoteButton } from "./clock-note-button";
import { PlaceSearch } from "./place-search";
import { PlanetTable } from "./planet-table";
import { DashaList } from "./dasha-list";
import { LifeAreaList } from "./life-area-list";
import { RightNow } from "./right-now";
import { TransitList } from "./transit-list";
import { SouthChart, type BirthShown } from "./south-chart";

type Errors = Partial<Record<FormField, string>>;
type Repeated = "earlier" | "later";
type Group = "date" | "time" | "place";

const two = (n: number) => String(n).padStart(2, "0");

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-accent">
      <rect x="4" y="9" width="12" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ErrorText({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="field-error mt-2">
      {text}
    </p>
  );
}

/** True when focus has left the element (and everything inside it). */
const left = (e: FocusEvent<HTMLElement>) => !e.currentTarget.contains(e.relatedTarget as Node | null);

export function BirthForm({ t }: { t: Messages }) {
  const f = t.form;
  const id = useId();
  const ids = {
    day: `${id}-day`,
    month: `${id}-month`,
    year: `${id}-year`,
    hour: `${id}-hour`,
    minute: `${id}-minute`,
    period: `${id}-am`, // the AM button: first of the AM | PM pair
    periodLabel: `${id}-period-label`,
    timeLegend: `${id}-time-legend`,
    timeHint: `${id}-time-hint`,
    periodHint: `${id}-period-hint`,
    place: `${id}-place`,
    dateError: `${id}-date-error`,
    timeError: `${id}-time-error`,
    placeError: `${id}-place-error`,
    formError: `${id}-form-error`,
    repeated: `${id}-repeated`,
  };

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<Period | null>(null);
  const [place, setPlace] = useState<PlaceSuggestion | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [repeated, setRepeated] = useState<Repeated | null>(null);
  /** Messages from the API (by field). */
  const [serverErrors, setServerErrors] = useState<Errors>({});
  /** Which groups may show their live check (left once with something in them, or after "See my chart"). */
  const [shown, setShown] = useState<Record<Group, boolean>>({ date: false, time: false, place: false });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ data: ChartResponse; summary: string; birth: BirthShown } | null>(null);
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
  const dateComplete = Boolean(day && month && year.length === 4);
  const dateLive = dateCheck && (shown.date || dateCheck.immediate || dateComplete) ? dateCheck : null;
  const timeLive = timeCheck && shown.time ? timeCheck : null;
  const placeLive = !place && shown.place;

  const dateMessage = serverErrors.date ?? dateLive?.message;
  const timeMessage = serverErrors.time ?? timeLive?.message;
  const placeMessage = serverErrors.place ?? (placeLive ? t.missing.place : undefined);
  const dateBad = (p: DatePart) => Boolean(serverErrors.date || dateLive?.parts.includes(p));
  const timeBad = (p: TimePart) => Boolean(serverErrors.time || timeLive?.parts.includes(p));

  // The "i" note: as soon as the date (or a whole year) falls in a window, before a place is chosen.
  const note = useMemo(
    () => earlyClockNote(place, date, yearNumber, t.clockNote),
    [place, date, yearNumber, t.clockNote],
  );

  // The UTC offset under the place: the default clock in a window, else the zone on that date.
  const offset = useMemo(
    () => (place ? formatUtcOffset(shownOffsetSeconds(place, date, time)) : ""),
    [place, date, time],
  );

  // After a successful calculation: scroll smoothly down to the chart, the first result card
  // (instantly with reduced motion); the card is scrolled to and its heading gets the focus.
  useEffect(() => {
    const heading = resultHeading.current;
    if (!result || !heading) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.focus({ preventScroll: true });
    (heading.closest("section") ?? heading).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [result]);

  /** Any change to the birth clears that field's API message and the "which one?" question. */
  function changed(field: FormField) {
    setServerErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
    setAmbiguous(false);
    setRepeated(null);
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
    el?.focus();
  });

  async function calculate(repeatedTime: Repeated | null) {
    // Something wrong: don't calculate; show every message and go to the first field to fix.
    if (dateCheck || timeCheck || !place || !date || !time) {
      setShown({ date: true, time: true, place: true });
      pendingFocus.current = dateCheck
        ? ids[dateCheck.parts[0]!]
        : timeCheck
          ? ids[timeCheck.parts[0]!]
          : ids.place;
      return;
    }
    setServerErrors({});
    setSubmitting(true);
    const body = {
      date,
      time,
      place: {
        geonameId: place.geonameId,
        lat: place.lat,
        lng: place.lng,
        timeZone: place.timeZone,
        countryCode: place.countryCode,
        admin1Code: place.admin1Code,
        admin2Code: place.admin2Code,
      },
      ...(repeatedTime ? { repeatedTime } : {}),
    };
    let problem: FieldError | null = null;
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.chart) {
        const [y, m, d] = date.split("-").map(Number);
        const when = `${d} ${f.date.months[m! - 1]} ${y}`;
        const which = repeatedTime
          ? ` (${repeatedTime === "earlier" ? f.repeatedTime.summaryEarlier : f.repeatedTime.summaryLater})`
          : "";
        const shownTime = fill(t.chart.summaryTime, { time12: to12hText(time, f.time.am, f.time.pm), time24: time });
        setResult({
          data: data as ChartResponse,
          summary: fill(t.chart.summary, { date: when, time: shownTime + which, place: place.label }),
          birth: { date: when, time: to12hText(time, f.time.am, f.time.pm), place: place.label },
        });
        setAmbiguous(false);
      } else {
        problem = errorFor(data?.error?.code, t.errors);
      }
    } catch {
      problem = networkError(t.errors);
    }
    setSubmitting(false);
    if (problem) {
      setResult(null); // never leave an older chart under a new error
      if (problem.code === "AMBIGUOUS_LOCAL_TIME") {
        setAmbiguous(true);
        setRepeated(null);
      } else {
        if (problem.field !== "form") pendingFocus.current = "first-invalid";
        setServerErrors({ [problem.field]: problem.message });
      }
    }
  }

  function chooseRepeated(r: Repeated) {
    setRepeated(r);
    void calculate(r);
  }

  const dateDescribedBy = dateMessage ? ids.dateError : undefined;
  const timeDescribedBy = [ids.timeHint, timeMessage ? ids.timeError : null, ambiguous ? ids.repeated : null].filter(Boolean).join(" ");
  const periodDescribedBy = [ids.periodHint, timeMessage ? ids.timeError : null].filter(Boolean).join(" ");

  // The Day list: only days that exist for the chosen month and year. A day chosen earlier that no
  // longer exists (31 → April) stays visible, flagged, until it is changed.
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);
  if (day && Number(day) > maxDay) dayOptions.push(Number(day));

  return (
    <>
      <section
        aria-labelledby="birth-form-title"
        className="card-outer p-4 sm:p-6 lg:p-7"
      >
        <h2 id="birth-form-title" className="type-h2 text-balance">
          {f.title}
        </h2>
        <p className="mt-2 leading-relaxed text-muted">{f.subtitle}</p>

        <form
          ref={formRef}
          noValidate
          className="mt-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void calculate(ambiguous ? repeated : null);
          }}
        >
          {/* Date of birth: Day and Month dropdowns, Year typed (D-094 item 3) */}
          <fieldset
            aria-describedby={dateDescribedBy}
            onBlur={(e) => {
              if (left(e) && (day || month || year)) show("date");
            }}
          >
            <legend className="sr-only">{f.date.label}</legend>
            <div className="relative flex items-center gap-2">
              <span aria-hidden="true" className="font-semibold">
                {f.date.label}
              </span>
              {note && <ClockNoteButton label={t.clockNote.buttonLabel} text={note.text} />}
            </div>
            <div className="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)_4.25rem] gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] sm:gap-3">
              <div>
                <label htmlFor={ids.day} className="field-label">
                  {f.date.day}
                </label>
                <span className="select-wrap mt-1">
                  <select
                    id={ids.day}
                    value={day}
                    aria-invalid={dateBad("day") || undefined}
                    aria-describedby={dateDescribedBy}
                    onChange={(e) => {
                      setDay(e.target.value);
                      changed("date");
                    }}
                    className="form-input form-select"
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
                <label htmlFor={ids.month} className="field-label">
                  {f.date.month}
                </label>
                <span className="select-wrap mt-1">
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
                    {f.date.months.map((name, i) => (
                      <option key={name} value={String(i + 1)}>
                        {name}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              <div>
                <label htmlFor={ids.year} className="field-label">
                  {f.date.year}
                </label>
                <input
                  id={ids.year}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={year}
                  aria-invalid={dateBad("year") || undefined}
                  aria-describedby={dateDescribedBy}
                  onChange={(e) => {
                    setYear(e.target.value.replace(/\D/g, ""));
                    changed("date");
                  }}
                  className="form-input mt-1"
                />
              </div>
            </div>
            <div aria-live="polite">
              <ErrorText id={ids.dateError} text={dateMessage} />
            </div>
          </fieldset>

          {/* Time of birth: Hour, Minute, AM | PM (D-094 item 2). No AM/PM is pre-selected. */}
          <fieldset
            aria-describedby={timeDescribedBy}
            onBlur={(e) => {
              if (left(e) && (hour || minute || period)) show("time");
            }}
          >
            <legend id={ids.timeLegend} className="block font-semibold">
              {f.time.label}
            </legend>
            <p id={ids.timeHint} className="field-hint mt-1">
              {f.time.hint}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-3">
              <div className="flex items-end gap-1.5">
                <div className="w-[5.25rem] sm:w-[5.5rem]">
                  <label htmlFor={ids.hour} className="field-label">
                    {f.time.hour}
                  </label>
                  <span className="select-wrap mt-1">
                    <select
                      id={ids.hour}
                      value={hour}
                      aria-invalid={timeBad("hour") || undefined}
                      aria-describedby={timeDescribedBy}
                      onChange={(e) => {
                        setHour(e.target.value);
                        changed("time");
                      }}
                      className="form-input form-select"
                    >
                      <option value="">{f.time.hourPlaceholder}</option>
                      {HOURS.map((h) => (
                        <option key={h} value={String(h)}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
                <span aria-hidden="true" className="pb-2.5 text-lg font-semibold">
                  :
                </span>
                <div className="w-[5.25rem] sm:w-[5.5rem]">
                  <label htmlFor={ids.minute} className="field-label">
                    {f.time.minute}
                  </label>
                  <span className="select-wrap mt-1">
                    <select
                      id={ids.minute}
                      value={minute}
                      aria-invalid={timeBad("minute") || undefined}
                      aria-describedby={timeDescribedBy}
                      onChange={(e) => {
                        setMinute(e.target.value);
                        changed("time");
                      }}
                      className="form-input form-select"
                    >
                      <option value="">{f.time.minutePlaceholder}</option>
                      {MINUTES.map((m) => (
                        <option key={m} value={String(m)}>
                          {two(m)}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
              </div>
              <div>
                <span id={ids.periodLabel} className="field-label">
                  {f.time.period}
                </span>
                <div
                  role="group"
                  aria-labelledby={ids.periodLabel}
                  aria-describedby={periodDescribedBy}
                  data-invalid={timeBad("period") || undefined}
                  className="period-group mt-1"
                >
                  {(["am", "pm"] as const).map((p) => (
                    <button
                      key={p}
                      id={p === "am" ? ids.period : `${id}-pm`}
                      type="button"
                      aria-pressed={period === p}
                      aria-describedby={periodDescribedBy}
                      onClick={() => {
                        setPeriod(p);
                        changed("time");
                      }}
                      className="period-button"
                    >
                      {p === "am" ? f.time.am : f.time.pm}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p id={ids.periodHint} className="field-hint mt-2">
              {f.time.periodHint}
            </p>
            <div aria-live="polite">
              <ErrorText id={ids.timeError} text={timeMessage} />
            </div>
            {/* Clocks went back (AMBIGUOUS_LOCAL_TIME): ask which of the two it was, then calculate again */}
            <div aria-live="polite">
              {ambiguous && (
                <div
                  id={ids.repeated}
                  role="radiogroup"
                  aria-labelledby={`${ids.repeated}-q`}
                  className="mt-3 rounded-md border border-line bg-raised p-4"
                >
                  <p id={`${ids.repeated}-q`} className="text-sm font-semibold">
                    {f.repeatedTime.question}
                  </p>
                  <div className="mt-3 space-y-2">
                    {(["earlier", "later"] as const).map((r) => (
                      <label key={r} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
                        <input
                          type="radio"
                          name={`${id}-repeated`}
                          value={r}
                          checked={repeated === r}
                          disabled={submitting}
                          onChange={() => chooseRepeated(r)}
                          className="mt-1 accent-[var(--accent)]"
                        />
                        <span>{f.repeatedTime[r]}</span>
                      </label>
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
            />
            <div aria-live="polite">
              <ErrorText id={ids.placeError} text={placeMessage} />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              aria-describedby={serverErrors.form ? ids.formError : undefined}
              className={buttonClass("primary", true, "btn-busy w-full")}
            >
              {submitting ? f.submitting : f.submit}
            </button>
            <div role="alert">
              <ErrorText id={ids.formError} text={serverErrors.form} />
            </div>
          </div>
        </form>

        <p className="mt-8 flex gap-2.5 border-t border-line pt-5 text-sm leading-relaxed text-muted">
          <LockIcon />
          <span>{f.privacy}</span>
        </p>
      </section>

      {/* The star divider between the big cards (design spec §3.6, step 0.4.5) */}
      {result && <Divider inGrid className="lg:col-span-2" />}
      {result && <SouthChart ref={resultHeading} result={result.data} birth={result.birth} summary={result.summary} t={t.chart} />}
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
