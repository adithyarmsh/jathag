// The North Indian chart (step 0.5.2, design spec §7.2, D-130, D-143), Rasi (D1) or Navamsa (D9),
// drawn as one SVG (400 × 400 units, scaled to its width) from lib/north-chart.ts: the houses are fixed
// (1st = the top diamond, soft gold, counting counter-clockwise), each shows its sign's short name and
// the planets. The North chart has no free middle, so the title, date, time and place are a caption
// ABOVE the drawing (north-chart caption in birth-chart-section.tsx). Theme colours only; role="img"
// with a full sentence; no click on planets yet (0.5.3).

import { useId } from "react";
import type { ChartResponse } from "@jathag/api";
import type { ChartKind } from "@/lib/drawn-chart";
import { NORTH_FIRST_HOUSE, NORTH_LINES, NORTH_SIGN_FONT, NORTH_SIZE, northChartHouses } from "@/lib/north-chart";
import type { Messages } from "@/lib/i18n";

export function NorthChart({ chart, kind, label, t }: { chart: ChartResponse["chart"]; kind: ChartKind; label: string; t: Messages["chart"] }) {
  const houses = northChartHouses(chart, t, kind);
  const clip = `chart-clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox={`0 0 ${NORTH_SIZE} ${NORTH_SIZE}`} role="img" aria-label={label} className="drawn-chart block h-auto w-full font-sans" data-style="north" data-kind={kind}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={NORTH_SIZE} height={NORTH_SIZE} rx={10} />
        </clipPath>
      </defs>
      <rect x={0.5} y={0.5} width={NORTH_SIZE - 1} height={NORTH_SIZE - 1} rx={10} className="chart-paper" />
      <g clipPath={`url(#${clip})`}>
        <path d={NORTH_FIRST_HOUSE} className="chart-lagna-fill" />
        <path d={NORTH_LINES} className="chart-line" />
      </g>
      <rect x={0.5} y={0.5} width={NORTH_SIZE - 1} height={NORTH_SIZE - 1} rx={10} className="chart-frame" />
      {houses.map((h) => (
        <g key={h.house} data-house={h.house} data-sign={h.sign}>
          <text x={h.signAt[0]} y={h.signAt[1] + 4} fontSize={NORTH_SIGN_FONT} textAnchor="middle" className="fill-muted">
            {h.signShort}
          </text>
          {h.layout.labels.map((l) => (
            <text
              key={l.code}
              x={l.x}
              y={l.y}
              fontSize={h.layout.fontSize}
              fontWeight={l.code === "La" ? 600 : 500}
              className={l.code === "La" ? "fill-accent-text" : "fill-ink"}
              data-code={l.code}
            >
              {l.text}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}
