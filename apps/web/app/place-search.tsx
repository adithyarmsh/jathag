"use client";

// Place of birth: type-ahead over POST /api/places/search (FR-IN-04, D-087–D-089, D-091).
// Accessible combobox (WAI-ARIA "combobox with listbox popup"): arrow keys move, Enter picks,
// Escape closes; options can be tapped. Searches start at 3 characters and wait about 0.25 s after
// the last key (each search costs server time, D-091). Results are shown in the API's order.
// The search text is sent in a POST body only and is never stored in the browser.

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceSuggestion as PlaceSearchResult } from "@jathag/api";
import { fill, formatCoordinate } from "@/lib/chart-format";
import type { Messages } from "@/lib/i18n";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

type Status = "idle" | "searching" | "done" | "error";

export function PlaceSearch({
  t,
  searchError,
  place,
  onChange,
  error,
  errorId,
}: {
  t: Messages["form"]["place"];
  searchError: string;
  place: PlaceSearchResult | null;
  onChange: (place: PlaceSearchResult | null) => void;
  /** A friendly message for this field (from the form), or null. */
  error: string | null;
  errorId: string;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const chosenId = `${id}-chosen`;

  const [text, setText] = useState("");
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
  // Visible status: searching / no results / search failed (the result count is for screen readers only).
  const visibleStatus = status === "searching" || status === "error" || (status === "done" && results.length === 0);

  const describedBy = [hintId, place ? chosenId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="relative">
      <label htmlFor={inputId} className="block font-semibold">
        {t.label}
      </label>
      <p id={hintId} className="mt-1 text-sm text-muted">
        {t.hint}
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
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={text}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={() => {
          if (!place && results.length) setOpen(true);
        }}
        className="form-input mt-2"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t.label}
        hidden={!showList}
        className="absolute right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-card py-1 shadow-soft"
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
          </li>
        ))}
      </ul>
      <p aria-live="polite" className={visibleStatus ? "mt-2 text-sm text-muted" : "sr-only"}>
        {liveText}
      </p>
      {place && (
        <p id={chosenId} className="mt-2 text-xs text-muted">
          {fill(t.chosen, {
            lat: formatCoordinate(place.lat, "lat"),
            lng: formatCoordinate(place.lng, "lng"),
            timeZone: place.timeZone,
          })}
        </p>
      )}
    </div>
  );
}
