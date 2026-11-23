// The basic South Indian Rasi (D-1) chart (step 0.3.2.1, D-101), shown above the planet table once
// the chart is calculated. Drawn as SVG by code (D-040): a 320 × 320 square that scales to the space
// it gets. The data (which sign goes where, house numbers, labels and how they fit) comes from
// lib/south-chart.ts; this file only draws it. Provisional styling (D-093), replaced in 0.5.2.
// The planet table below is the full text version for screen readers (NFR-ACC-01).

import { forwardRef } from "react";
import type { ChartResponse } from "@jathag/api";
import { fill } from "@/lib/chart-format";
import { CELL, CHART_SIZE, PLACE_FONT, placeLines, southChartBoxes } from "@/lib/south-chart";
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

export const SouthChart = forwardRef<HTMLHeadingElement, { result: ChartResponse; birth: BirthShown; t: Messages["chart"] }>(
  function SouthChart({ result, birth, t }, headingRef) {
    const s = t.southChart;
    const boxes = southChartBoxes(result.chart, t);
    const lagna = boxes.find((b) => b.isLagna)!;
    const place = placeLines(birth.place);

    // Centre lines (the merged middle 2 × 2), stacked around the middle of the chart.
    const centre = [
      { text: s.centreTitle, size: 15, gap: 0, title: true },
      { text: birth.date, size: 10.5, gap: 10 },
      { text: birth.time, size: 10.5, gap: 4 },
      ...place.map((text, i) => ({ text, size: PLACE_FONT, gap: i === 0 ? 8 : 2.5 })),
    ];
    const heights = centre.map((l) => l.gap + l.size * 1.15);
    let y = CHART_SIZE / 2 - heights.reduce((a, b) => a + b, 0) / 2;

    return (
      <section
        aria-labelledby="south-chart-title"
        className="card-outer rounded-[24px] bg-card p-4 shadow-soft sm:p-8 lg:col-span-2"
      >
        <h2 id="south-chart-title" ref={headingRef} tabIndex={-1} className="sr-only">
          {s.heading}
        </h2>
        <div className="mx-auto w-full max-w-[560px]">
          <svg
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            role="img"
            aria-labelledby="south-chart-svg-title south-chart-svg-desc"
            className="south-chart block h-auto w-full font-sans"
          >
            <title id="south-chart-svg-title">{s.svgTitle}</title>
            <desc id="south-chart-svg-desc">{fill(s.svgDescription, { sign: lagna.signName })}</desc>

            {boxes.map((box) => {
              const x = box.col * CELL;
              const top = box.row * CELL;
              return (
                <g key={box.sign} transform={`translate(${x} ${top})`}>
                  <rect x={0} y={0} width={CELL} height={CELL} className="south-chart-line" />
                  {box.isLagna && <line x1={0} y1={MARK} x2={MARK} y2={0} className="south-chart-lagna" />}
                  <text x={CELL / 2} y={11.5} textAnchor="middle" fontSize={9.5} fontWeight={500} className="fill-muted">
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
                  <text x={CELL / 2} y={CELL - 4.5} textAnchor="middle" fontSize={9} className="fill-muted">
                    {box.houseLabel}
                  </text>
                </g>
              );
            })}

            {/* The merged centre: one frame round the middle 2 × 2 */}
            <rect x={CELL} y={CELL} width={2 * CELL} height={2 * CELL} className="south-chart-line" />
            {centre.map((l, i) => {
              y += heights[i]!;
              return (
                <text
                  key={i}
                  x={CHART_SIZE / 2}
                  y={y - l.size * 0.25}
                  textAnchor="middle"
                  fontSize={l.size}
                  fontWeight={l.title ? 500 : 400}
                  className={l.title ? "south-chart-title fill-ink font-serif" : i <= 2 ? "fill-ink" : "fill-muted"}
                >
                  {l.text}
                </text>
              );
            })}
          </svg>
        </div>
        <p className="mx-auto mt-4 max-w-[560px] text-xs leading-relaxed text-muted">{s.key}</p>
      </section>
    );
  },
);
