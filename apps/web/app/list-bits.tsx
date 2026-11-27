// Small shared pieces of the chart page's sections (step 0.3.7, D-113; chart page 0.5.1, D-138): the
// section frame (eyebrow, heading, one-liner; an anchor the contents panel scrolls to), the text markers,
// the opener arrow and the progress bar. Still Water look; markers are words, never colour alone (NFR-ACC-01).

import type { ReactNode } from "react";
import { headingId, type SectionId } from "@/lib/contents";
import { Reveal } from "@/components/reveal";

/**
 * One section of the chart page: an anchored <section> (works without JavaScript), the eyebrow, the
 * heading (focusable, so the contents panel can move focus to it) and the one-liner. Fades up once when it
 * scrolls into view (components/reveal.tsx).
 */
export function ChartSection({
  id,
  eyebrow,
  heading,
  intro,
  level = 2,
  children,
  className = "",
}: {
  id: SectionId;
  eyebrow: string;
  heading: string;
  intro?: ReactNode;
  level?: 1 | 2;
  children: ReactNode;
  className?: string;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <Reveal as="section" id={id} labelledBy={headingId(id)} className={`chart-section ${className}`.trim()}>
      <p className="type-label">{eyebrow}</p>
      <H id={headingId(id)} tabIndex={-1} className={`${level === 1 ? "type-h1" : "type-h2"} section-heading mt-2`}>
        {heading}
      </H>
      {intro && <p className="section-intro">{intro}</p>}
      {children}
    </Reveal>
  );
}

/** "You are here", "Began before birth", "Now": a small pill with words in it. */
export function Marker({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <span className={strong ? "list-marker list-marker-strong" : "list-marker"}>{children}</span>;
}

/** A separator only screen readers hear (", "), where the visible gap is CSS spacing. */
export function Sep() {
  return <span className="sr-only">, </span>;
}

/** The arrow on an opener: points down when closed and turns 180° when open (decoration only, spec §3.9). */
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`list-chevron ${open ? "list-chevron-open" : ""}`}>
      <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Progress (spec §3.7): track `line`, fill in the level colour, pill ends; the level also shows in the
 * height (`bar-1/2/3`) and in the text that always goes with it. Fills from 0 when its section comes into
 * view (motion 5, only with motion allowed).
 */
export function ProgressBar({ fraction, level, label, valueText }: { fraction: number; level: 1 | 2 | 3; label: string; valueText: string }) {
  const percent = Math.round(fraction * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className={`bar bar-${level}`}
    >
      <div className="bar-fill" style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}
