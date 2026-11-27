"use client";

// InfoPopup, the "i" (design spec §3.8, the InfoPopup board; step 0.5.1 builds the "term" kind, D-139
// item 2). A 44 × 44 button with a 20 px circled "i" (outlined accent-text; filled accent while open),
// named by the question it answers ("What is the Lagna?") and carrying aria-expanded. The panel: card,
// 1 px line, radius 12, shadow-pop, an accent-soft header band with the title in Fraunces, the body, an
// optional muted line.
//
// It floats above the page (position: fixed, placed under its "i" by lib/info-popup.ts, kept inside the
// screen edges, following the "i" when the page scrolls): nothing moves when it opens, and no card or
// scroll box can clip it. It stays in the DOM right after its button, so keyboard order is unchanged.
//
// Opening: hovering the "i" with a mouse, or click / tap / Enter / Space. Closing: Esc, a click, tap or
// focus outside, the trigger again (when opened on purpose), or the mouse leaving the "i" and the panel
// for a moment (only when the mouse opened it). Opened on purpose, focus moves into the panel, and Esc
// gives it back to the "i". Not the old-clock "i" next to the date (that one stays).

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { HOVER_CLOSE_DELAY, nextPopupState, popupPosition, type PopupEvent, type PopupState } from "@/lib/info-popup";

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
  /** Line the panel up with the left ("start") or right ("end") edge of its "i". */
  align?: "start" | "end";
}) {
  const [state, setState] = useState<PopupState>("closed");
  const [place, setPlace] = useState<CSSProperties | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);
  const id = useId();
  const open = state !== "closed";

  const send = useCallback((e: PopupEvent) => setState((s) => nextPopupState(s, e)), []);

  // Place the panel under its "i" before it is painted, and keep it there while the page scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const placeIt = () => {
      const b = buttonRef.current?.getBoundingClientRect();
      if (b) setPlace(popupPosition(b, document.documentElement.clientWidth, align));
    };
    placeIt();
    window.addEventListener("scroll", placeIt, { passive: true, capture: true });
    window.addEventListener("resize", placeIt);
    return () => {
      window.removeEventListener("scroll", placeIt, { capture: true });
      window.removeEventListener("resize", placeIt);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    if (state === "click") panelRef.current?.focus({ preventScroll: true });
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) send("outside");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        send("escape");
        buttonRef.current?.focus();
      }
    };
    // Focus leaving the panel and the button (Tab past it) closes it too.
    const onFocus = (e: FocusEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) send("outside");
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open, state, send]);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  return (
    <span
      ref={wrapRef}
      className="info-wrap"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(leaveTimer.current);
        send("pointer-enter");
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(leaveTimer.current);
        leaveTimer.current = window.setTimeout(() => send("pointer-leave-timeout"), HOVER_CLOSE_DELAY);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => send("trigger")}
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
        style={open && place ? place : undefined}
        className="info-panel"
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
