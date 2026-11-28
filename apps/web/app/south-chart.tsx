// The South Indian chart (step 0.5.2, design spec §7.1, D-101, D-143), Rasi (D1) or Navamsa (D9),
// drawn as one SVG (400 × 400 units, scaled to its width) from lib/south-chart.ts. Colours come only
// from the theme tokens (CSS classes in globals.css), so it follows light and dark. role="img" with a
// full sentence; the planet table stays the text version (NFR-ACC-01). No click on planets yet (0.5.3).

import { useId } from "react";
import type { ChartResponse } from "@jathag/api";
import type { ChartKind } from "@/lib/drawn-chart";
import { CELL, CHART_SIZE, centreLines, HOUSE_FONT, HOUSE_POS, LAGNA_MARK, SIGN_FONT, SIGN_POS, southChartBoxes } from "@/lib/south-chart";
import type { Messages } from "@/lib/i18n";

export function SouthChart({
  chart,
  kind,
  title,
  dateTime,
  place,
  label,
  t,
}: {
  chart: ChartResponse["chart"];
  kind: ChartKind;
  /** "Rasi chart (D-1)" / "Navamsa (D-9)" */
  title: string;
  /** "14 Aug 1992 · 6:45 AM" */
  dateTime: string;
  /** The place label, or "Near …" for typed coordinates (D-144) */
  place: string;
  /** The screen-reader sentence */
  label: string;
  t: Messages["chart"];
}) {
  const boxes = southChartBoxes(chart, t, kind);
  const centre = centreLines(title, dateTime, place);
  const clip = `chart-clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} role="img" aria-label={label} className="drawn-chart block h-auto w-full font-sans" data-style="south" data-kind={kind}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={CHART_SIZE} height={CHART_SIZE} rx={10} />
        </clipPath>
      </defs>
      <rect x={0.5} y={0.5} width={CHART_SIZE - 1} height={CHART_SIZE - 1} rx={10} className="chart-paper" />
      <g clipPath={`url(#${clip})`}>
      {boxes.map((box) => (
        <g key={box.sign} transform={`translate(${box.col * CELL} ${box.row * CELL})`} data-sign={box.sign} data-house={box.house}>
          {box.isLagna && <rect x={0.5} y={0.5} width={CELL - 1} height={CELL - 1} className="chart-lagna-fill" />}
          {box.isLagna && <path d={`M0 ${LAGNA_MARK}L${LAGNA_MARK} 0`} className="chart-lagna-mark" />}
          <text x={SIGN_POS.x} y={SIGN_POS.y} fontSize={SIGN_FONT} className="fill-muted">
            {box.signName}
          </text>
          <text x={HOUSE_POS.x} y={HOUSE_POS.y} fontSize={HOUSE_FONT} textAnchor="end" className="fill-muted">
            {box.houseLabel}
          </text>
          {box.layout.labels.map((l) => (
            <text
              key={l.code}
              x={l.x}
              y={l.y}
              fontSize={box.layout.fontSize}
              fontWeight={l.code === "La" ? 600 : 500}
              className={l.code === "La" ? "fill-accent-text" : "fill-ink"}
              data-code={l.code}
            >
              {l.text}
            </text>
          ))}
        </g>
      ))}
      {/* The grid: outer lines are the frame; the middle 2 × 2 is the centre, in the raised colour */}
      <rect x={CELL} y={CELL} width={2 * CELL} height={2 * CELL} className="chart-centre" />
      <path
        d={`M${CELL} 0V${CHART_SIZE}M${2 * CELL} 0V${CELL}M${2 * CELL} ${3 * CELL}V${CHART_SIZE}M${3 * CELL} 0V${CHART_SIZE}M0 ${CELL}H${CHART_SIZE}M0 ${2 * CELL}H${CELL}M${3 * CELL} ${2 * CELL}H${CHART_SIZE}M0 ${3 * CELL}H${CHART_SIZE}`}
        className="chart-line"
      />
      </g>
      <rect x={0.5} y={0.5} width={CHART_SIZE - 1} height={CHART_SIZE - 1} rx={10} className="chart-frame" />
      {centre.map((l, i) => (
        <text
          key={i}
          x={CHART_SIZE / 2}
          y={l.y}
          textAnchor="middle"
          fontSize={l.size}
          className={l.kind === "title" ? "chart-title fill-ink font-display" : "fill-muted"}
          data-centre={l.kind}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}
