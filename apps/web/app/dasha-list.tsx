"use client";

// "Dasha periods" on the chart page (step 0.5.1, design spec §6.5; from the 0.3.7 list, D-113, FR-TM-01…04):
// "Your life in nine chapters". One opener row per Mahadasha from birth (spec §3.9): planet, years
// ("2011 – 2027"), length ("16 yrs") and a bar whose length is years / 20 (gold for the current one). The
// current row is highlighted with "You are here"; the one running at birth says "Began before birth, on
// <date>"; periods that ended before birth are not shown (D-113 item 3). A row opens to its Antardashas
// (start dates; the current one "· now"), and each Antardasha to its Pratyantardashas. Sub-rows are only
// put on the page when opened (up to 729 Pratyantardashas otherwise). No link to the timeline page yet (0.6.1).

import { useState } from "react";
import { fill } from "@/lib/chart-format";
import { mahaRowViews } from "@/lib/chart-sections";
import { antardashaRows, pratyantardashaRows, type PeriodRow } from "@/lib/dasha-view";
import type { DashaLevel, ListContext } from "@/lib/list-context";
import { ChartSection, Chevron, Marker, Sep } from "./list-bits";

/** "Antardashas (medium-term) in the Venus Mahadasha" */
function subLabel(child: DashaLevel, parent: PeriodRow, ctx: ListContext) {
  const t = ctx.t.lists;
  return fill(t.subListLabel, { levels: t.levelsPlural[child], term: t.terms[child], lord: parent.lordName, level: t.levels[parent.level] });
}

export function DashaList({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists;
  const d = ctx.t.chartPage.dashas;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const opensLabel = (row: PeriodRow, child: DashaLevel) => fill(t.opensLabel, { levels: t.levelsPlural[child], lord: row.lordName, level: t.levels[row.level] });

  /** A shorter period: planet + start date (true start when it began before birth), "· now" when current. */
  function shortRow(r: PeriodRow) {
    return (
      <span className="sub-row-text">
        <span className="sub-row-lord">{r.lordName}</span>
        <Sep />
        <span className="tabular-nums">
          {r.start}
          {r.current && <span className="font-semibold">{d.nowSuffix}</span>}
        </span>
        {r.beganBeforeBirth && (
          <>
            <Sep />
            <Marker>{t.beganBeforeBirth}</Marker>
          </>
        )}
        {r.current && <span className="sr-only">, {t.youAreHere}</span>}
      </span>
    );
  }

  const renderPratyantar = (r: PeriodRow) => (
    <li key={r.key} className={r.current ? "sub-row sub-row-current sub-row-3" : "sub-row sub-row-3"}>
      {shortRow(r)}
    </li>
  );

  const renderAntar = (r: PeriodRow) => {
    const isOpen = open.has(r.key);
    const subId = `dasha-sub-${r.key}`;
    return (
      <li key={r.key}>
        <button
          type="button"
          className={r.current ? "sub-row sub-row-opener sub-row-current sub-row-2" : "sub-row sub-row-opener sub-row-2"}
          aria-expanded={isOpen}
          aria-controls={isOpen ? subId : undefined}
          onClick={() => toggle(r.key)}
        >
          {shortRow(r)}
          <span className="sr-only"> ({opensLabel(r, "pratyantardasha")})</span>
          <Chevron open={isOpen} />
        </button>
        {isOpen && (
          <div id={subId} className="opener-body">
            <p id={`${subId}-label`} className="sr-only">
              {subLabel("pratyantardasha", r, ctx)}
            </p>
            <ol aria-labelledby={`${subId}-label`}>{pratyantardashaRows(ctx, r.path[0]!, r.path[1]!).map(renderPratyantar)}</ol>
          </div>
        )}
      </li>
    );
  };

  return (
    <ChartSection id="dashas" eyebrow={d.eyebrow} heading={d.heading} intro={d.oneLiner}>
      <p id="dasha-maha-label" className="sr-only">
        {fill(t.levelLabel, { level: t.levelsPlural.mahadasha, term: t.terms.mahadasha })}
      </p>
      <ol aria-labelledby="dasha-maha-label" className="mt-6 flex flex-col gap-2">
        {mahaRowViews(ctx).map((m) => {
          const r = m.row;
          const isOpen = open.has(r.key);
          const subId = `dasha-sub-${r.key}`;
          return (
            <li key={r.key} className={r.current ? "opener opener-current" : "opener"}>
              <button
                type="button"
                className="opener-button maha-row"
                aria-expanded={isOpen}
                aria-controls={isOpen ? subId : undefined}
                onClick={() => toggle(r.key)}
              >
                <span className="maha-lord">{r.lordName}</span>
                <Sep />
                <span className="maha-years tabular-nums">
                  {m.years}
                  <span className="sr-only">
                    {" "}
                    ({r.range})
                  </span>
                </span>
                <span aria-hidden="true" className="maha-bar">
                  <span className={r.current ? "maha-bar-fill maha-bar-current" : "maha-bar-fill"} style={{ width: `${m.barFraction * 100}%` }} />
                </span>
                <Sep />
                <span className="maha-length tabular-nums">{m.length}</span>
                {m.note && (
                  <>
                    <Sep />
                    <span className={r.current ? "maha-note maha-note-current" : "maha-note"}>{m.note}</span>
                  </>
                )}
                <span className="sr-only"> ({opensLabel(r, "antardasha")})</span>
                <Chevron open={isOpen} />
              </button>
              {isOpen && (
                <div id={subId} className="opener-body">
                  <p id={`${subId}-label`} className="sub-list-label">
                    {subLabel("antardasha", r, ctx)}
                  </p>
                  <ol aria-labelledby={`${subId}-label`} className="antar-grid">
                    {antardashaRows(ctx, r.path[0]!).map(renderAntar)}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </ChartSection>
  );
}
