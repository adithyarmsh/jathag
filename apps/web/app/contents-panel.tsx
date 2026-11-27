"use client";

// The contents panel of the chart page (step 0.5.1, D-138 Q1–Q3; replaces the SectionNav of spec §3.10).
//
// Desktop (≥ 1024 px): a slim sticky column at the left of the content with one short dash per section,
// the current one longer and in accent, the others muted. Clicking or tapping the column, or hovering it
// with a mouse, opens a card ("CONTENTS" + the seven sections, the current one highlighted). It closes on
// Esc, a click outside, choosing an item, or the mouse leaving (only when the mouse opened it). The column
// is one real button ("Contents", aria-expanded); when it is opened by click or keyboard, focus moves to
// the current item, and Esc gives it back to the button.
//
// Phones and tablets: a small floating "Contents" button in the bottom corner (44 px; hidden while the
// footer is on screen, so it never covers it) opens the same list as a bottom panel (spec §3.11 sheet
// pattern): role="dialog", focus trapped inside, Esc or the scrim closes it, focus back to the button.
//
// Items are links to the section anchors (#right-now …), so they work without JavaScript. With it,
// choosing one scrolls smoothly (instantly with reduced motion), moves focus to the section's heading and
// puts the section in the address (replaceState: Back still goes to the page before). The current item
// follows the scroll: an IntersectionObserver on the sections triggers lib/contents.ts activeIndex.

import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Messages } from "@/lib/i18n";
import { activeIndex, headingId, SECTIONS, type SectionId } from "@/lib/contents";
import { trapFocusIndex } from "@/lib/shell";
import { CloseIcon } from "@/components/icons";

const FOCUSABLE = 'a[href], button:not([disabled])';
/** The reading line: about a third down the screen, well below the sticky header (60 / 68 px). */
const readingLine = () => Math.min(260, Math.max(140, Math.round(window.innerHeight * 0.3)));

type Text = Messages["chartPage"]["contents"];

/**
 * The current section while scrolling. `sections` changes whenever the sections are drawn anew (a new
 * result remounts some of them), so the observer always watches the elements on screen.
 */
export function useActiveSection(sections: unknown): SectionId {
  const [active, setActive] = useState<SectionId>("chart");
  useEffect(() => {
    if (!sections || typeof IntersectionObserver === "undefined") return;
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => e !== null);
    if (els.length === 0) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const tops = els.map((e) => e.getBoundingClientRect().top);
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        setActive(SECTIONS[activeIndex(tops, readingLine(), atBottom)]!);
      });
    };
    // Fires whenever a section crosses one of these lines; no scroll listener is needed.
    // A thin band at the reading line: a section entering or leaving it changes the current one.
    const line = readingLine();
    const io = new IntersectionObserver(measure, { rootMargin: `-${line}px 0px -${window.innerHeight - line - 1}px 0px` });
    els.forEach((e) => io.observe(e));
    measure();
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [sections]);
  return active;
}

/** Scroll to a section, focus its heading and put it in the address (without a history entry). */
export function goToSection(id: SectionId) {
  const section = document.getElementById(id);
  if (!section) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  document.getElementById(headingId(id))?.focus({ preventScroll: true });
  window.history.replaceState(window.history.state, "", `#${id}`);
}

function ContentsList({ t, active, onChoose }: { t: Text; active: SectionId; onChoose: (id: SectionId, e: MouseEvent) => void }) {
  return (
    <ol className="contents-list">
      {SECTIONS.map((id) => (
        <li key={id}>
          <a
            href={`#${id}`}
            aria-current={active === id ? "true" : undefined}
            className="contents-item"
            onClick={(e) => onChoose(id, e)}
          >
            <span className="contents-item-text">{t.items[id]}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function ContentsPanel({ t, active }: { t: Text; active: SectionId }) {
  return (
    <>
      <DesktopContents t={t} active={active} />
      <PhoneContents t={t} active={active} />
    </>
  );
}

/** Desktop: the dash column and its card. */
export function DesktopContents({ t, active, initiallyOpen = false }: { t: Text; active: SectionId; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState<null | "hover" | "click">(initiallyOpen ? "click" : null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const close = useCallback((focusBack: boolean) => {
    setOpen(null);
    if (focusBack) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    if (open === "click") wrapRef.current?.querySelector<HTMLElement>('.contents-item[aria-current="true"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(false);
    };
    const onFocus = (e: FocusEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open, close]);

  return (
    <div
      ref={wrapRef}
      className="contents-rail"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && !open) setOpen("hover");
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && open === "hover") setOpen(null);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.button}
        aria-expanded={open !== null}
        aria-controls={`${id}-card`}
        className="contents-dashes"
        onClick={() => setOpen((o) => (o === "click" ? null : "click"))}
      >
        {SECTIONS.map((s) => (
          <span key={s} aria-hidden="true" className={s === active ? "contents-dash contents-dash-current" : "contents-dash"} />
        ))}
      </button>
      <nav id={`${id}-card`} aria-label={t.label} hidden={open === null} className="contents-card">
        <p aria-hidden="true" className="contents-eyebrow">
          {t.title}
        </p>
        <ContentsList
          t={t}
          active={active}
          onChoose={(s, e) => {
            e.preventDefault();
            setOpen(null);
            goToSection(s);
          }}
        />
      </nav>
    </div>
  );
}

/** Phones and tablets: the floating button and the bottom panel. */
export function PhoneContents({ t, active, initiallyOpen = false }: { t: Text; active: SectionId; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [footerShown, setFooterShown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Out of the footer's way: the button hides while the footer is on screen.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setFooterShown(entries.some((e) => e.isIntersecting)));
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const close = useCallback((focusBack: boolean) => {
    setOpen(false);
    if (focusBack) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>('.contents-item[aria-current="true"]')?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const to = trapFocusIndex(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey);
      if (to !== null) {
        e.preventDefault();
        items[to]?.focus();
      }
    };
    // Wider than a tablet: the desktop column takes over.
    const mq = window.matchMedia("(min-width: 64rem)");
    const onWide = () => mq.matches && close(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open, close]);

  return (
    <div className="contents-phone">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-sheet`}
        className="contents-fab"
        data-hidden={footerShown && !open ? "true" : undefined}
        onClick={() => setOpen(true)}
      >
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 7h14M5 12h10M5 17h12" />
        </svg>
        {t.button}
      </button>
      {open && (
        <div className="contents-scrim" onClick={() => close(true)}>
          <div
            ref={sheetRef}
            id={`${id}-sheet`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            className="contents-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={`${id}-title`} className="contents-eyebrow">
                {t.title}
              </h2>
              <button type="button" aria-label={t.close} className="icon-button" onClick={() => close(true)}>
                <CloseIcon />
              </button>
            </div>
            <nav aria-label={t.label}>
              <ContentsList
                t={t}
                active={active}
                onChoose={(s, e) => {
                  e.preventDefault();
                  setOpen(false);
                  // After the panel has closed and the page scrolls again
                  requestAnimationFrame(() => goToSection(s));
                }}
              />
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

/** A link to another section of the page (e.g. Right now → Sade Sati): the same smooth jump and focus move. */
export function JumpLink({ to, className, children }: { to: SectionId; className?: string; children: ReactNode }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        goToSection(to);
      }}
    >
      {children}
    </a>
  );
}
