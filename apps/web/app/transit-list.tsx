"use client";

// "Transits and Sade Sati" (step 0.3.7, D-113 item 4, FR-TR-01…03; 0.3.7.1, D-115 item 6: the sign
// changes are collapsed by default, one opener per planet, rows drawn only when opened; looser spacing;
// 0.3.7.2, D-117 items 1–2: every Sade Sati period is its own opener, phases and dips inside, indented): today's positions of the 9 grahas,
// the sign changes of Saturn, Jupiter, Rahu and Ketu exactly as the chart API returns them, the Sade
// Sati status and every Sade Sati period with its phases; each period opens to show Saturn's sign
// changes inside it (drawn only when opened). Dates on the clock at birth (D-098, D-099 item 6).

import { useState } from "react";
import { fill } from "@/lib/chart-format";
import type { ListContext } from "@/lib/list-context";
import { positionRows, sadeSatiPeriodViews, sadeSatiIntro, sadeSatiStatus, signChangeGroups, signChangeSummary } from "@/lib/transit-view";
import { Chevron, ListCard, Marker, Sep } from "./list-bits";
import { Cell } from "./planet-table";
import { SadeSatiStatusBlock } from "./right-now";

export function TransitList({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists;
  const tr = t.transits;
  const c = tr.columns;
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const [signsOpen, setSignsOpen] = useState<ReadonlySet<string>>(new Set());
  const toggleSigns = (p: string) =>
    setSignsOpen((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  const periods = sadeSatiPeriodViews(ctx);

  return (
    <ListCard id="transit-list-title" title={tr.title}>
      <p className="mt-1 text-sm text-muted">{fill(t.clockPointer, { offset: ctx.offset })}</p>

      {/* Today's positions (FR-TR-01) */}
      <h3 id="transit-positions-title" className="list-subheading mt-5">
        {tr.positionsTitle}
      </h3>
      <p className="text-sm text-muted">{fill(tr.positionsCaption, { date: ctx.date(ctx.result.transits.asOf) })}</p>
      <p className="mt-2 text-xs text-muted sm:hidden">{ctx.t.chart.scrollHint}</p>
      <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-labelledby="transit-positions-title">
        <table className="planet-table list-table w-full min-w-[440px] border-collapse text-left text-[15px]">
          <caption className="sr-only">{fill(tr.positionsCaption, { date: ctx.date(ctx.result.transits.asOf) })}</caption>
          <thead>
            <tr>
              <th scope="col">{c.planet}</th>
              <th scope="col">{c.sign}</th>
              <th scope="col">{c.fromMoon}</th>
              <th scope="col">{c.fromLagna}</th>
              <th scope="col">{c.retrograde}</th>
            </tr>
          </thead>
          <tbody>
            {positionRows(ctx).map((r) => (
              <tr key={r.code}>
                <th scope="row">{r.name}</th>
                <td>{r.sign}</td>
                <td className="tabular-nums">{r.fromMoon}</td>
                <td className="tabular-nums">{r.fromLagna}</td>
                <td>
                  <Cell value={r.retrograde} t={ctx.t.chart} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sign changes (FR-TR-03, FR-TRAN-03): collapsed by default, rows drawn only when open (D-115 item 6) */}
      <h3 id="sign-changes-title" className="list-subheading mt-8">
        {tr.signChangesTitle}
      </h3>
      <p className="text-sm text-muted">{tr.signChangesIntro}</p>
      <p className="mt-2 text-[15px]">{signChangeSummary(ctx)}</p>
      {/* One opener per planet (a single list is about 50 rows for a typical chart); rows drawn only when open */}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {signChangeGroups(ctx).map((g) => {
          const isOpen = signsOpen.has(g.planet);
          const subId = `sign-changes-${g.planet}`;
          return (
            <li key={g.planet} className="rounded-xl border border-line">
              <button
                type="button"
                className="dasha-opener planet-opener"
                aria-expanded={isOpen}
                aria-controls={isOpen ? subId : undefined}
                onClick={() => toggleSigns(g.planet)}
              >
                <Chevron open={isOpen} />
                <span>
                  <span className="block font-semibold">{g.name}</span>
                  <span className="block text-sm text-muted">{g.summary}</span>
                </span>
                <span className="sr-only"> ({fill(tr.signChangesShow, { planet: g.name })})</span>
              </button>
              {isOpen &&
                (g.rows.length === 0 ? (
                  <p id={subId} className="px-4 pb-4 text-sm text-muted">
                    {tr.noSignChanges}
                  </p>
                ) : (
                  <ol id={subId} aria-label={g.name} className="airy-list px-4 pb-4 text-[15px]">
                    {g.rows.map((r) => (
                      <li key={r.key} className="list-dated-row">
                        <span className="list-date tabular-nums">{r.date}</span>
                        <Sep />
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ol>
                ))}
            </li>
          );
        })}
      </ul>

      {/* Sade Sati (FR-TR-02, FR-TRAN-04): the status stays visible; all periods collapsed (D-115 item 6) */}
      <h3 className="list-subheading mt-8">{t.sadeSati.title}</h3>
      <div className="mt-2 rounded-xl border border-line p-4">
        <SadeSatiStatusBlock ctx={ctx} view={sadeSatiStatus(ctx)} />
      </div>

      <h4 id="sade-sati-all-title" className="mt-6 font-semibold">
        {t.sadeSati.allTitle}
      </h4>
      <p className="text-sm text-muted">{sadeSatiIntro(ctx)}</p>
      {/* One opener per period, always listed (0.3.7.2, D-117 item 1): closed = the date range and its
          markers; open = Rising/Peak/Setting, then Saturn's sign changes under their own sub-heading. */}
      {periods.length > 0 && (
        <ol aria-labelledby="sade-sati-all-title" className="mt-2">
          {periods.map((p) => {
            const isOpen = open.has(p.index);
            const subId = `sade-sati-period-${p.index}`;
            return (
              <li key={p.key} className="sade-sati-period">
                <button
                  type="button"
                  className="dasha-opener"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? subId : undefined}
                  onClick={() => toggle(p.index)}
                >
                  <Chevron open={isOpen} />
                  <span className="dasha-row-text">
                    <span className="tabular-nums font-semibold">{p.range}</span>
                    {(p.current || p.beganBeforeBirth) && (
                      <span className="flex flex-wrap gap-1.5">
                        {p.current && (
                          <>
                            <Sep />
                            <Marker strong>{t.youAreHere}</Marker>
                          </>
                        )}
                        {p.beganBeforeBirth && (
                          <>
                            <Sep />
                            <Marker>{t.beganBeforeBirth}</Marker>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="sr-only"> ({fill(t.sadeSati.opensLabel, { period: p.range })})</span>
                </button>
                {isOpen && (
                  <div id={subId} className="sade-sati-body">
                    <ul className="airy-list text-[15px]">
                      {p.phases.map((ph) => (
                        <li key={ph.phase}>{ph.text}</li>
                      ))}
                    </ul>
                    <h5 id={`${subId}-dips`} className="sade-sati-subheading">
                      {t.sadeSati.crossingsHeading}
                    </h5>
                    <ol aria-labelledby={`${subId}-dips`} className="airy-list text-[15px]">
                      {p.crossings.map((r) => (
                        <li key={r.key} className="list-dated-row">
                          <span className="list-date tabular-nums">{r.date}</span>
                          <Sep />
                          <span>{r.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </ListCard>
  );
}
