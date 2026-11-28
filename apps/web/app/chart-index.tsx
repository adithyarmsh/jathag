"use client";

// The index under every drawn chart (step 0.5.2, design spec §7.3, D-130, D-143 item 8): eyebrow
// "INDEX", the twelve short sign names with their full names and the planet abbreviations with their
// names, all from en.json (translatable later, D-063). ONE component for South and North, D1 and D9.
// Desktop (≥ 1024 px): always open (the opener row is hidden by CSS). Phones and tablets: collapsed
// behind an opener ("What the letters mean", spec §3.9) in the same place, so Right now stays close.

import { useId, useState } from "react";
import type { Messages } from "@/lib/i18n";
import { TABLE_BODIES } from "@/lib/chart-format";
import { Chevron } from "./list-bits";

export function indexEntries(t: Messages["chart"]) {
  const signs = t.signsShort.map((a, i) => ({ a, n: t.signs[i]! }));
  const planets = [
    ...TABLE_BODIES.map((code) => ({ a: t.abbreviations[code], n: code === "La" ? t.index.lagna : t.bodies[code] })),
    { a: t.southChart.retrogradeMark, n: t.index.retrograde },
  ];
  return { signs, planets };
}

export function ChartIndex({ t }: { t: Messages["chart"] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { signs, planets } = indexEntries(t);
  const list = (items: { a: string; n: string }[]) => (
    <ul className="chart-index-grid">
      {items.map((g) => (
        <li key={g.a}>
          <span className="font-semibold text-ink">{g.a}</span> <span className="text-muted">{g.n}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="chart-index" data-open={open || undefined}>
      <button type="button" className="chart-index-opener opener-button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen((o) => !o)}>
        <span className="opener-summary text-[14px] leading-[22px] font-semibold">{t.index.opener}</span>
        <Chevron open={open} />
      </button>
      <div id={`${id}-body`} className="chart-index-body">
        <p className="type-label">{t.index.eyebrow}</p>
        <p className="chart-index-heading">{t.index.signs}</p>
        {list(signs)}
        <p className="chart-index-heading">{t.index.planets}</p>
        {list(planets)}
      </div>
    </div>
  );
}
