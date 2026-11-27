"use client";

// Place of birth: type-ahead over POST /api/places/search (FR-IN-04, D-087–D-089, D-091).
// Accessible combobox (WAI-ARIA "combobox with listbox popup"): arrow keys move, Enter picks,
// Escape closes; options can be tapped. Searches start at 3 characters and wait about 0.25 s after
// the last key (each search costs server time, D-091). Results are shown in the API's order.
// The search text is sent in a POST body only and is never stored in the browser.
// 0.4.6 (spec §5.2, D-134): two hints (town above the box, "add the state after a comma" below), a muted
// "also known as Bombay" line when an old name matched (D-091 item 4), the chosen place on one line
// ("13° 05′ N · 80° 17′ E · Asia/Kolkata (UTC+5:30)"), the "Enter coordinates yourself" link when
// nothing is found (state D), and a set-aside look while coordinates are typed in Advanced settings.

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceSuggestion as PlaceSearchResult } from "@jathag/api";
import { fill } from "@/lib/chart-format";
import { formatCoordinateShort } from "@/lib/coordinates";
import { alsoKnownAsLine } from "@/lib/place-suggestion";
import type { Messages } from "@/lib/i18n";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

type Status = "idle" | "searching" | "done" | "error";

export function PlaceSearch({
  t,
  searchError,
  inputId,
  place,
  offset,
  onChange,
  onLeave,
  error,
  errorId,
  disabled = false,
  onEnterCoordinates,
}: {
  t: Messages["form"]["place"];
  searchError: string;
  /** Id of the text box (the form moves focus here when no place is chosen). */
  inputId: string;
  place: PlaceSearchResult | null;
  /** The UTC offset to show for the chosen place, e.g. "UTC+5:30" (worked out by the form, D-094 item 6). */
  offset: string;
  onChange: (place: PlaceSearchResult | null) => void;
  /** Called when the text box loses focus; true if it has text in it. */
  onLeave: (hasText: boolean) => void;
  /** A friendly message for this field (from the form), or null. */
  error: string | null;
  errorId: string;
  /** True while "Enter coordinates yourself" is ticked: the search is switched off and set aside. */
  disabled?: boolean;
  /** "Enter coordinates yourself" under "No places found" (state D). */
  onEnterCoordinates: () => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const hint2Id = `${id}-hint2`;
  const asideId = `${id}-aside`;
  const chosenId = `${id}-chosen`;

  const [text, setText] = useState(place?.label ?? ""); // a saved profile comes with its place (0.4.7)
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop a pending search when the component goes away.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  function search(query: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("searching");
    fetch("/api/places/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: PlaceSearchResult[] };
        if (controller.signal.aborted) return;
        setResults(data.results);
        setActive(-1);
        setStatus("done");
        setOpen(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResults([]);
        setStatus("error");
        setOpen(false);
      });
  }

  function onType(value: string) {
    setText(value);
    if (place) onChange(null); // editing the text un-chooses the place
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    if (value.trim().length < MIN_CHARS) {
      setResults([]);
      setStatus("idle");
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => search(value.trim()), DEBOUNCE_MS);
  }

  function choose(p: PlaceSearchResult) {
    setText(p.label);
    setOpen(false);
    setActive(-1);
    setStatus("idle");
    onChange(p);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && results.length) setOpen(true);
      setActive((i) => (results.length ? (i + 1) % results.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open && results.length) setOpen(true);
      setActive((i) => (results.length ? (i <= 0 ? results.length - 1 : i - 1) : -1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && results[active]) {
        e.preventDefault(); // pick the place, don't submit the form
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  }

  const showList = open && results.length > 0;
  const liveText =
    status === "searching"
      ? t.searching
      : status === "error"
        ? searchError
        : status === "done" && results.length === 0
          ? t.noResults
          : status === "done"
            ? results.length === 1
              ? t.resultsCountOne
              : fill(t.resultsCount, { count: results.length })
            : "";
  // Visible status: searching / search failed (the result count is for screen readers only); "no
  // places found" is shown with its "Enter coordinates yourself" link below.
  const visibleStatus = status === "searching" || status === "error";
  const noResults = status === "done" && results.length === 0;

  const describedBy = [hintId, hint2Id, place ? chosenId : null, disabled ? asideId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`relative ${disabled ? "opacity-50" : ""}`.trim()}>
      <label htmlFor={inputId} className="form-label">
        {t.label}
      </label>
      <p id={hintId} className="field-hint mt-0.5">
        {t.hintAbove}
      </p>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={error && !disabled ? true : undefined}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={text}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          onLeave(text.trim().length > 0);
        }}
        onFocus={() => {
          if (!place && results.length) setOpen(true);
        }}
        className="form-input mt-2 disabled:cursor-not-allowed"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t.label}
        hidden={!showList || disabled}
        className="absolute right-0 left-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-card py-1 shadow-[var(--shadow-pop)]"
      >
        {results.map((r, i) => (
          <li
            key={r.geonameId}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown would blur the input (closing the list) before the click lands
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(r)}
            onMouseEnter={() => setActive(i)}
            className={`cursor-pointer px-3 py-2.5 text-[15px] leading-snug ${i === active ? "bg-accent-soft text-ink" : ""}`}
          >
            {r.label}
            {alsoKnownAsLine(r, t) && <span className="block text-[13px] leading-5 text-muted">{alsoKnownAsLine(r, t)}</span>}
          </li>
        ))}
      </ul>
      <p id={hint2Id} className="field-hint mt-1.5">
        {t.hintBelow}
      </p>
      <p aria-live="polite" className={visibleStatus ? "mt-2 text-sm text-muted" : "sr-only"}>
        {liveText}
      </p>
      {noResults && !disabled && (
        <p className="mt-1 text-sm text-muted">
          {t.noResults}{" "}
          <button type="button" className="clock-note-link mt-0" onClick={onEnterCoordinates}>
            {t.enterCoordinates}
          </button>
        </p>
      )}
      {place && !disabled && (
        <p id={chosenId} className="mt-2 text-[13px] leading-5 text-muted tabular-nums">
          {fill(t.chosen, {
            lat: formatCoordinateShort(place.lat, "lat"),
            lng: formatCoordinateShort(place.lng, "lng"),
            timeZone: place.timeZone,
            offset,
          })}
        </p>
      )}
      {disabled && (
        <p id={asideId} className="field-hint mt-1">
          {t.setAside}
        </p>
      )}
    </div>
  );
}
