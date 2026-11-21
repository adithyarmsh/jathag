"use client";

// The minimal birth form (step 0.2.13, D-092): date, exact time (hours and minutes) and place.
// "See my chart" sends them to POST /api/chart (always the DEFAULT clock, no clock choice is sent)
// and shows the planet table below. Nothing about the birth is stored in the browser: it lives only
// in this component's memory and is gone when the page is closed or reloaded (NFR-PRIV-01).

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChartResponse, PlaceSuggestion } from "@jathag/api";
import { errorFor, networkError, type FieldError, type FormField } from "@/lib/api-errors";
import { clockNote } from "@/lib/clock-note";
import { clockQuestion } from "@/lib/clock-rule";
import { birthDate, isUsableDate } from "@/lib/birth-date";
import { fill } from "@/lib/chart-format";
import type { Messages } from "@/lib/i18n";
import { ClockNoteButton } from "./clock-note-button";
import { PlaceSearch } from "./place-search";
import { PlanetTable } from "./planet-table";

type Errors = Partial<Record<FormField, string>>;
type Repeated = "earlier" | "later";

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
    <p id={id} className="field-error mt-2 text-sm">
      {text}
    </p>
  );
}

export function BirthForm({ t }: { t: Messages }) {
  const f = t.form;
  const id = useId();
  const ids = {
    day: `${id}-day`,
    month: `${id}-month`,
    year: `${id}-year`,
    time: `${id}-time`,
    timeHint: `${id}-time-hint`,
    dateError: `${id}-date-error`,
    timeError: `${id}-time-error`,
    placeError: `${id}-place-error`,
    formError: `${id}-form-error`,
    repeated: `${id}-repeated`,
  };

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<PlaceSuggestion | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [repeated, setRepeated] = useState<Repeated | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ data: ChartResponse; summary: string } | null>(null);
  const tableHeading = useRef<HTMLHeadingElement>(null);

  const date = birthDate(day, month, year);

  // The "i" note: worked out in the browser with the API's own rule, as soon as date and place are set.
  const note = useMemo(() => {
    if (!place || !date || !isUsableDate(date)) return null;
    return clockNote(clockQuestion(place, date), t.clockNote);
  }, [place, date, t.clockNote]);

  useEffect(() => {
    if (result) tableHeading.current?.focus();
  }, [result]);

  /** Any change to the birth clears that field's message and the "which one?" question. */
  function changed(field: FormField) {
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
    setAmbiguous(false);
    setRepeated(null);
  }

  // After a failed "See my chart", move keyboard focus to the first field with a message.
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useRef(false);
  useEffect(() => {
    if (!focusError.current) return;
    focusError.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  async function calculate(repeatedTime: Repeated | null) {
    const missing: Errors = {};
    if (!date) missing.date = t.missing.date;
    if (!time) missing.time = t.missing.time;
    if (!place) missing.place = t.missing.place;
    if (Object.keys(missing).length) {
      focusError.current = true;
      setErrors(missing);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const body = {
      date,
      time,
      place: {
        geonameId: place!.geonameId,
        lat: place!.lat,
        lng: place!.lng,
        timeZone: place!.timeZone,
        countryCode: place!.countryCode,
        admin1Code: place!.admin1Code,
        admin2Code: place!.admin2Code,
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
        const [y, m, d] = date!.split("-").map(Number);
        const when = `${d} ${f.date.months[m! - 1]} ${y}`;
        const which = repeatedTime
          ? ` (${repeatedTime === "earlier" ? f.repeatedTime.summaryEarlier : f.repeatedTime.summaryLater})`
          : "";
        setResult({ data: data as ChartResponse, summary: fill(t.chart.summary, { date: when, time: time + which, place: place!.label }) });
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
        focusError.current = problem.field !== "form";
        setErrors({ [problem.field]: problem.message });
      }
    }
  }

  function chooseRepeated(r: Repeated) {
    setRepeated(r);
    void calculate(r);
  }

  const dateDescribedBy = errors.date ? ids.dateError : undefined;
  const timeDescribedBy = [ids.timeHint, errors.time ? ids.timeError : null, ambiguous ? ids.repeated : null].filter(Boolean).join(" ");

  return (
    <>
      <section aria-labelledby="birth-form-title" className="card-outer rounded-[24px] bg-card p-6 shadow-soft sm:p-8 lg:p-10">
        <h2 id="birth-form-title" className="font-serif text-[32px] leading-[1.1] font-medium text-balance">
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
          {/* Date of birth: day, month, year (plain fields, so old years are quick to type) */}
          <fieldset aria-describedby={dateDescribedBy}>
            <legend className="sr-only">{f.date.label}</legend>
            <div className="relative flex items-center gap-2">
              <span aria-hidden="true" className="font-semibold">
                {f.date.label}
              </span>
              {note && <ClockNoteButton label={t.clockNote.buttonLabel} text={note.text} />}
            </div>
            <div className="mt-2 grid grid-cols-[3.5rem_minmax(0,1fr)_4.75rem] gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] sm:gap-3">
              <div>
                <label htmlFor={ids.day} className="block text-sm text-muted">
                  {f.date.day}
                </label>
                <input
                  id={ids.day}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={2}
                  value={day}
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={dateDescribedBy}
                  onChange={(e) => {
                    setDay(e.target.value.replace(/\D/g, ""));
                    changed("date");
                  }}
                  className="form-input mt-1"
                />
              </div>
              <div>
                <label htmlFor={ids.month} className="block text-sm text-muted">
                  {f.date.month}
                </label>
                <select
                  id={ids.month}
                  value={month}
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={dateDescribedBy}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    changed("date");
                  }}
                  className="form-input mt-1"
                >
                  <option value="">{f.date.monthPlaceholder}</option>
                  {f.date.months.map((name, i) => (
                    <option key={name} value={String(i + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={ids.year} className="block text-sm text-muted">
                  {f.date.year}
                </label>
                <input
                  id={ids.year}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={year}
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={dateDescribedBy}
                  onChange={(e) => {
                    setYear(e.target.value.replace(/\D/g, ""));
                    changed("date");
                  }}
                  className="form-input mt-1"
                />
              </div>
            </div>
            <ErrorText id={ids.dateError} text={errors.date} />
          </fieldset>

          {/* Time of birth: hours and minutes only (D-092) */}
          <div>
            <label htmlFor={ids.time} className="block font-semibold">
              {f.time.label}
            </label>
            <p id={ids.timeHint} className="mt-1 text-sm text-muted">
              {f.time.hint}
            </p>
            <input
              id={ids.time}
              type="time"
              step={60}
              value={time}
              aria-invalid={errors.time ? true : undefined}
              aria-describedby={timeDescribedBy}
              onChange={(e) => {
                setTime(e.target.value.slice(0, 5));
                changed("time");
              }}
              className="form-input mt-2 max-w-[12rem]"
            />
            <ErrorText id={ids.timeError} text={errors.time} />
            {/* Clocks went back (AMBIGUOUS_LOCAL_TIME): ask which of the two it was, then calculate again */}
            <div aria-live="polite">
              {ambiguous && (
                <div
                  id={ids.repeated}
                  role="radiogroup"
                  aria-labelledby={`${ids.repeated}-q`}
                  className="mt-3 rounded-xl border border-field-border p-4"
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
                          className="mt-1 accent-[var(--accent-text)]"
                        />
                        <span>{f.repeatedTime[r]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <PlaceSearch
            t={f.place}
            searchError={t.errors.search}
            place={place}
            onChange={(p) => {
              setPlace(p);
              changed("place");
            }}
            error={errors.place ?? null}
            errorId={ids.placeError}
          />
          <ErrorText id={ids.placeError} text={errors.place} />

          <div>
            <button
              type="submit"
              disabled={submitting}
              aria-describedby={errors.form ? ids.formError : undefined}
              className="w-full cursor-pointer rounded-full bg-accent-text px-6 py-3.5 text-base font-semibold text-card transition-opacity disabled:cursor-wait disabled:opacity-70"
            >
              {submitting ? f.submitting : f.submit}
            </button>
            <div role="alert">
              <ErrorText id={ids.formError} text={errors.form} />
            </div>
          </div>
        </form>

        <p className="mt-8 flex gap-2.5 border-t border-line pt-5 text-sm leading-relaxed text-muted">
          <LockIcon />
          <span>{f.privacy}</span>
        </p>
      </section>

      {result && <PlanetTable ref={tableHeading} result={result.data} summary={result.summary} t={t.chart} />}
    </>
  );
}
