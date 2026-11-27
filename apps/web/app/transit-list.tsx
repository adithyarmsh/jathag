"use client";

// "Transits" on the chart page (step 0.5.1, design spec §6.8; from the 0.3.7 card, D-113, D-115, FR-TR-01/03):
// "Where the planets are today". Today's table (Planet · Sign · From Moon · From Lagna, with ordinals;
// "(R)" after a retrograde planet's sign, never on Rahu or Ketu) beside (desktop) or above (phones) the
// "Next sign changes" card: the next three days with a sign change, then "All sign changes, next 10 years"
// as an opener with every change of Saturn, Jupiter, Rahu and Ketu in enters / moves back / enters again
// wording (D-099), drawn only when opened. Sade Sati has its own section (sade-sati-section.tsx).

import { useState } from "react";
import { fill } from "@/lib/chart-format";
import { houseOrdinal, nextSignChanges } from "@/lib/chart-sections";
import type { ListContext } from "@/lib/list-context";
import { positionRows, signChangeGroups } from "@/lib/transit-view";
import { ChartSection, Chevron, Sep } from "./list-bits";

export function TransitList({ ctx }: { ctx: ListContext }) {
  const tr = ctx.t.chartPage.transits;
  const c = ctx.t.lists.transits.columns;
  const [allOpen, setAllOpen] = useState(false);
  const caption = fill(ctx.t.lists.transits.positionsCaption, { date: ctx.date(ctx.result.transits.asOf) });
  const next = nextSignChanges(ctx);

  return (
    <ChartSection id="transits" eyebrow={tr.eyebrow} heading={tr.heading} intro={tr.oneLiner}>
      <div className="transit-grid mt-6">
        <div className="card-outer p-4 lg:p-6">
          <h3 id="transit-positions-title" className="sr-only">
            {ctx.t.lists.transits.positionsTitle}
          </h3>
          <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-labelledby="transit-positions-title">
            <table className="data-table w-full border-collapse text-left">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{c.planet}</th>
                  <th scope="col">{c.sign}</th>
                  <th scope="col">{tr.fromMoon}</th>
                  <th scope="col">{tr.fromLagna}</th>
                </tr>
              </thead>
              <tbody>
                {positionRows(ctx).map((r) => (
                  <tr key={r.code}>
                    <th scope="row">{r.name}</th>
                    <td>
                      {r.sign}
                      {r.retrograde === ctx.t.chart.retrograde && (
                        <>
                          {" "}
                          <abbr title={ctx.t.chart.retrogradeLabel} className="no-underline">
                            {ctx.t.chart.southChart.retrogradeMark}
                          </abbr>
                        </>
                      )}
                    </td>
                    <td className="tabular-nums">{houseOrdinal(Number(r.fromMoon), ctx)}</td>
                    <td className="tabular-nums">{houseOrdinal(Number(r.fromLagna), ctx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] leading-5 text-muted">{caption}</p>
        </div>

        <div className="card-outer p-4 lg:p-6">
          <h3 className="type-label">{tr.nextTitle}</h3>
          {next.length === 0 ? (
            <p className="mt-3 text-[15px]">{ctx.t.lists.transits.signChangesSummary}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {next.map((n) => (
                <li key={n.key} className="dated-row">
                  <span className="dated-row-date">{n.date}</span>
                  <Sep />
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          )}
          <div className={allOpen ? "opener mt-4 opener-open" : "opener mt-4"}>
            <button type="button" className="opener-button" aria-expanded={allOpen} aria-controls={allOpen ? "all-sign-changes" : undefined} onClick={() => setAllOpen((o) => !o)}>
              <span className="opener-summary font-semibold">{tr.allTitle}</span>
              <Chevron open={allOpen} />
            </button>
            {allOpen && (
              <div id="all-sign-changes" className="opener-body">
                <p className="text-[13px] leading-5 text-muted">{ctx.t.lists.transits.signChangesIntro}</p>
                {signChangeGroups(ctx).map((g) => (
                  <div key={g.planet} className="mt-4">
                    <h4 id={`sign-changes-${g.planet}`} className="sub-list-label">
                      {g.name}
                    </h4>
                    {g.rows.length === 0 ? (
                      <p className="text-[14px] text-muted">{ctx.t.lists.transits.noSignChanges}</p>
                    ) : (
                      <ol aria-labelledby={`sign-changes-${g.planet}`} className="airy-list text-[14px]">
                        {g.rows.map((r) => (
                          <li key={r.key} className="dated-row">
                            <span className="dated-row-date">{r.date}</span>
                            <Sep />
                            <span>{r.text}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ChartSection>
  );
}
