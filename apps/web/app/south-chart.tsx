// The basic South Indian Rasi (D-1) chart (step 0.3.2.1, D-101), shown above the planet table once
// the chart is calculated. Drawn as SVG by code (D-040): a 320 × 320 square that scales to the space
// it gets. The data (which sign goes where, house numbers, labels and how they fit) comes from
// lib/south-chart.ts; this file only draws it. Provisional styling (D-093), replaced in 0.5.2.
// The planet table below is the full text version for screen readers (NFR-ACC-01).

import { forwardRef } from "react";
import type { ChartResponse } from "@jathag/api";
import { fill } from "@/lib/chart-format";
import { CELL, centreLines, CHART_SIZE, HOUSE_BASELINE, HOUSE_FONT, moonFacts, SIGN_BASELINE, SIGN_FONT, southChartBoxes } from "@/lib/south-chart";
import type { Messages } from "@/lib/i18n";

export interface BirthShown {
  /** e.g. "14 August 1992" */
  date: string;
  /** As entered, 12-hour, e.g. "6:45 AM" */
  time: string;
  /** The place label, e.g. "Chennai, Tamil Nadu, India" */
  place: string;
}

const MARK = 13; // length of the Lagna's corner line along each edge (clear of the sign name)

export const SouthChart = forwardRef<
  HTMLHeadingElement,
  {
    result: ChartResponse;
    birth: BirthShown;
    summary: string;
    /** One muted line above the drawing, e.g. "North Indian drawing arrives …" (0.4.6, D-134 item 7). */
    note?: string;
    t: Messages["chart"];
  }
>(
  function SouthChart({ result, birth, summary, note, t }, headingRef) {
    const s = t.southChart;
    const boxes = southChartBoxes(result.chart, t);
    const lagna = boxes.find((b) => b.isLagna)!;

    // Centre lines (the merged middle 2 × 2), laid out in lib/south-chart.ts (D-115 item 3).
    const centre = centreLines(result.chart, birth, t);
    const moon = moonFacts(result.chart, t);

    return (
      <section
        aria-labelledby="south-chart-title"
        className="card-outer p-4 sm:p-6 lg:col-span-2"
      >
        {/* Visible header, same style as the planet table's (D-102) */}
        <h2 id="south-chart-title" ref={headingRef} tabIndex={-1} className="type-h2">
          {s.heading}
        </h2>
        <p className="mt-1 text-sm text-muted">{summary}</p>
        {note && <p className="mt-3 text-sm text-muted">{note}</p>}
        <div className="mx-auto mt-5 w-full max-w-[560px]">
          <svg
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            role="img"
            aria-labelledby="south-chart-svg-title south-chart-svg-desc"
            className="south-chart block h-auto w-full font-sans"
          >
            <title id="south-chart-svg-title">{s.svgTitle}</title>
            <desc id="south-chart-svg-desc">
              {fill(s.svgDescription, { sign: lagna.signName, moonSign: moon.sign, nakshatra: moon.nakshatra, pada: moon.pada })}
            </desc>

            {boxes.map((box) => {
              const x = box.col * CELL;
              const top = box.row * CELL;
              return (
                <g key={box.sign} transform={`translate(${x} ${top})`}>
                  <rect x={0} y={0} width={CELL} height={CELL} className="south-chart-line" />
                  {box.isLagna && <line x1={0} y1={MARK} x2={MARK} y2={0} className="south-chart-lagna" />}
                  <text x={CELL / 2} y={SIGN_BASELINE} textAnchor="middle" fontSize={SIGN_FONT} fontWeight={500} className="fill-muted">
                    {box.signName}
                  </text>
                  {box.layout.labels.map((l) => (
                    <text
                      key={l.code}
                      x={l.x}
                      y={l.y}
                      fontSize={box.layout.fontSize}
                      fontWeight={l.code === "La" ? 600 : 500}
                      className={l.code === "La" ? "fill-accent-text" : "fill-ink"}
                    >
                      {l.text}
                    </text>
                  ))}
                  <text x={CELL / 2} y={HOUSE_BASELINE} textAnchor="middle" fontSize={HOUSE_FONT} className="fill-muted">
                    {box.houseLabel}
                  </text>
                </g>
              );
            })}

            {/* The merged centre: one frame round the middle 2 × 2 */}
            <rect x={CELL} y={CELL} width={2 * CELL} height={2 * CELL} className="south-chart-line" />
            {centre.map((l, i) => (
              <text
                key={i}
                x={CHART_SIZE / 2}
                y={l.y}
                textAnchor="middle"
                fontSize={l.size}
                fontWeight={l.kind === "title" ? 500 : 400}
                className={l.kind === "title" ? "south-chart-title fill-ink font-display" : l.kind === "place" ? "fill-muted" : "fill-ink"}
              >
                {l.text}
              </text>
            ))}
          </svg>
        </div>
        <p className="mx-auto mt-4 max-w-[560px] text-xs leading-relaxed text-muted">{s.key}</p>
      </section>
    );
  },
);
