// Small shared pieces for the step 0.3.7 list cards (D-113): the outer card, the text markers and the
// opener arrow. Provisional layout (D-093), Still Water look since 0.4.5; markers are words, never colour alone (NFR-ACC-01).

import type { ReactNode } from "react";

export function ListCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="card-outer p-4 sm:p-6 lg:col-span-2">
      <h2 id={id} className="type-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** "You are here", "Began before birth", "current Mahadasha": a small pill with words in it. */
export function Marker({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <span className={strong ? "list-marker list-marker-strong" : "list-marker"}>{children}</span>;
}

/** A separator only screen readers hear (", "), where the visible gap is CSS spacing. */
export function Sep() {
  return <span className="sr-only">, </span>;
}

/** The arrow on an opener: points right when closed, down when open (decoration only). */
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`list-chevron ${open ? "list-chevron-open" : ""}`}>
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
