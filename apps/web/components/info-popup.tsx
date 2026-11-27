"use client";

// InfoPopup, the "i" (design spec §3.8, the InfoPopup board; step 0.5.1 builds the "term" kind). A 44 × 44
// button with a 20 px circled "i" (outlined accent-text; filled accent while open), named by the question
// it answers ("What is the Lagna?") and carrying aria-expanded. The panel: card, 1 px line, radius 12,
// shadow-pop, an accent-soft header band with the title in Fraunces, the body, an optional muted line.
// Opens on click, tap and Enter/Space (a real button); closes with Esc, a tap or click outside, or the
// trigger. Focus moves into the panel when it opens and back to the trigger when it closes (Esc or
// outside). Phones: below its trigger at the full width of the nearest positioned box; desktop: under its
// "i" (`align` says which edge it lines up with). Not the old-clock "i" next to the date (that one stays).

import { useEffect, useId, useRef, useState } from "react";

export function InfoPopup({
  label,
  title,
  body,
  more,
  align = "start",
}: {
  /** The button's name: the question, e.g. "What is the Lagna?" */
  label: string;
  title: string;
  body: string;
  more?: string;
  /** Desktop: line the panel up with the left ("start") or right ("end") edge of its tile. */
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    // Focus leaving the panel and the button (Tab past it) closes it too.
    const onFocus = (e: FocusEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="info-wrap">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="info-button"
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="info-icon">
          <circle cx="10" cy="10" r="9" className="info-icon-ring" />
          <circle cx="10" cy="6.2" r="1.15" className="info-icon-dot" />
          <path d="M10 9.2v5.4" className="info-icon-stem" />
        </svg>
      </button>
      <div
        ref={panelRef}
        id={`${id}-panel`}
        role="dialog"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        hidden={!open}
        className={`info-panel ${align === "end" ? "info-panel-end" : ""}`.trim()}
      >
        <p id={`${id}-title`} className="info-panel-title">
          {title}
        </p>
        <div className="info-panel-body">
          <p>{body}</p>
          {more && <p className="info-panel-more">{more}</p>}
        </div>
      </div>
    </span>
  );
}
