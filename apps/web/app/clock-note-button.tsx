"use client";

// The small circled "i" next to the date (FR-IN-09, D-092). Shown only for births in a
// "Which clock?" window. Opens on click and on tap (phones have no hover); closes with Escape, a
// second tap, or a tap/click outside. Colour: ink, i.e. black in light mode and ivory in dark mode
// (deliberately not the gold accent).

import { useEffect, useId, useRef, useState } from "react";

export function ClockNoteButton({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noteId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="clock-note">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={noteId}
        onClick={() => setOpen((o) => !o)}
        className="clock-note-button"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]">
          <circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="6.1" r="1.15" fill="currentColor" />
          <path d="M10 9v5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <span id={noteId} role="note" hidden={!open} className="clock-note-popover">
        {text}
      </span>
    </span>
  );
}
