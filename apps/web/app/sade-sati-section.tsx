"use client";

// "Sade Sati" on the chart page, its own section (step 0.5.1, design spec §6.7, D-125/D-130; from the
// 0.3.7 card, D-113, D-117). The heading follows the status in calm words, never fear-based. The status
// card: the phase and when it ends, a three-part bar (Rising / Peak / Setting, widths by real duration,
// the current phase in accent) with a "Today" marker, the phase start dates, and one sentence on any
// back-and-forth crossing. With no Sade Sati running the card says so and names the next one. Then every
// period from birth to 120 years as an opener (the current one highlighted, "Running at birth" / "Now"),
// each opening to its phases and Saturn's sign changes (the dips). Dates on the clock at birth.

import { useState } from "react";
import { fill } from "@/lib/chart-format";
import { sadeSatiCard } from "@/lib/chart-sections";
import type { ListContext } from "@/lib/list-context";
import { sadeSatiPeriodViews, sadeSatiStatus } from "@/lib/transit-view";
import { ChartSection, Chevron, Marker, Sep } from "./list-bits";

export function SadeSatiSection({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists;
  const s = ctx.t.chartPage.sadeSati;
  const card = sadeSatiCard(ctx);
  const status = sadeSatiStatus(ctx);
  const periods = sadeSatiPeriodViews(ctx);
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const toggle = (i: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <ChartSection id="sade-sati" eyebrow={s.eyebrow} heading={card.heading} intro={s.oneLiner}>
      <div className="card-outer mt-6 p-4 lg:p-6">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[21px] leading-7 lg:text-[22px]">{card.title}</span>
          <span className="text-[15px] text-muted tabular-nums">{card.detail}</span>
        </p>
        {card.segments && (
          <div className="mt-5">
            <div className="ss-bar-wrap">
              <div aria-hidden="true" className="ss-bar">
                {card.segments.map((seg) => (
                  <span key={seg.phase} className={seg.current ? "ss-seg ss-seg-current" : "ss-seg"} style={{ flexGrow: seg.share }} />
                ))}
              </div>
              {card.today !== null && (
                <span aria-hidden="true" className="ss-today" style={{ left: `${card.today * 100}%` }}>
                  <span className="ss-today-label">{s.today}</span>
                </span>
              )}
            </div>
            <ol className="ss-phases" aria-label={s.phasesLabel}>
              {card.segments.map((seg) => (
                <li key={seg.phase} style={{ flexGrow: seg.share }} className={seg.current ? "font-semibold text-ink" : undefined}>
                  {seg.label}
                  {seg.current && <span className="sr-only">, {s.nowMark}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
        {card.backAndForth && <p className="mt-4 text-[14px] leading-[22px]">{card.backAndForth}</p>}
        <p className="mt-3 text-[13px] leading-5 text-muted">{status.saturnText}</p>
      </div>

      <h3 id="sade-sati-all-title" className="mt-8 text-[17px] leading-6 font-semibold">
        {card.allTitle}
      </h3>
      {periods.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">{t.sadeSati.none}</p>
      ) : (
        <ol aria-labelledby="sade-sati-all-title" className="mt-3 flex flex-col gap-2">
          {periods.map((p) => {
            const isOpen = open.has(p.index);
            const subId = `sade-sati-period-${p.index}`;
            return (
              <li key={p.key} className={p.current ? "opener opener-current" : "opener"}>
                <button
                  type="button"
                  className="opener-button"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? subId : undefined}
                  onClick={() => toggle(p.index)}
                >
                  <span className="opener-summary">
                    <span className="tabular-nums font-semibold">{p.range}</span>
                    {(p.current || p.beganBeforeBirth) && (
                      <span className="flex flex-wrap gap-1.5">
                        {p.current && (
                          <>
                            <Sep />
                            <Marker strong>{s.nowMark}</Marker>
                          </>
                        )}
                        {p.beganBeforeBirth && (
                          <>
                            <Sep />
                            <Marker>{s.atBirth}</Marker>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="sr-only"> ({fill(t.sadeSati.opensLabel, { period: p.range })})</span>
                  <Chevron open={isOpen} />
                </button>
                {isOpen && (
                  <div id={subId} className="opener-body">
                    <ul className="airy-list text-[15px]">
                      {p.phases.map((ph) => (
                        <li key={ph.phase}>{ph.text}</li>
                      ))}
                    </ul>
                    <h4 id={`${subId}-dips`} className="sub-list-label mt-4">
                      {t.sadeSati.crossingsHeading}
                    </h4>
                    <ol aria-labelledby={`${subId}-dips`} className="airy-list text-[15px]">
                      {p.crossings.map((r) => (
                        <li key={r.key} className="dated-row">
                          <span className="dated-row-date">{r.date}</span>
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
    </ChartSection>
  );
}
