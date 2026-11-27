"use client";

// The small circled "i" next to the date (FR-IN-09, D-092, kept by D-134 item 5). Shown only for
// births in a "Which clock?" window. Opens on click and on tap (phones have no hover); closes with
// Escape, a second tap, or a tap/click outside. Colour: ink, i.e. black in light mode and ivory in dark
// mode (deliberately not the gold accent). From 0.4.6 the note ends with a link "Change it in Advanced
// settings" (when a place is chosen), which closes the note and hands over to the form.

import { useEffect, useId, useRef, useState } from "react";

export function ClockNoteButton({
  label,
  text,
  more,
  link,
}: {
  label: string;
  text: string;
  /** An optional second line (e.g. "Once you've chosen the place, …"). */
  more?: string;
  /** The link at the end of the note; the form opens Advanced settings and moves focus there. */
  link?: { label: string; onClick: () => void };
}) {
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
        <span className="block">{text}</span>
        {more && <span className="mt-2 block">{more}</span>}
        {link && (
          <button
            type="button"
            className="clock-note-link"
            onClick={() => {
              setOpen(false);
              link.onClick();
            }}
          >
            {link.label}
          </button>
        )}
      </span>
    </span>
  );
}
