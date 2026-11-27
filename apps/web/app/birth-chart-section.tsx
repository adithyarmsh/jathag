// "Birth chart", the first section of the chart page (step 0.5.1, design spec §6.3): eyebrow "BIRTH
// CHART", the h1 ("Meera's chart" / "Your chart" / "Sample chart"), the one-liner, today's South Indian
// drawing (re-used as is; the North note stays when North was chosen, until 0.5.2), the "what this is"
// Rasi notice and three fact tiles (Lagna · Moon sign · Birth star, pada on desktop), each with an "i"
// that explains the term (spec §3.8). Desktop: the drawing on the left (440 px), everything else on the
// right. No D1/D9 chips, no South/North toggle and no index yet (0.5.2).

import type { ChartResponse } from "@jathag/api";
import { fill } from "@/lib/chart-format";
import type { Messages } from "@/lib/i18n";
import { richText } from "@/lib/i18n";
import { moonFacts } from "@/lib/south-chart";
import { InfoPopup } from "@/components/info-popup";
import { Notice } from "@/components/notice";
import { ChartSection } from "./list-bits";
import { SouthChartDrawing, type BirthShown } from "./south-chart";

export function BirthChartSection({
  result,
  birth,
  heading,
  place,
  northNote,
  t,
}: {
  result: ChartResponse;
  /** For the centre of the drawing: date, time and place as entered. */
  birth: BirthShown;
  heading: string;
  /** "Chennai" for the one-liner */
  place: string;
  /** Shown when North Indian was chosen (until 0.5.2) */
  northNote?: string;
  t: Messages;
}) {
  const c = t.chartPage.chart;
  const moon = moonFacts(result.chart, t.chart);
  const lagna = t.chart.signs[result.chart.bodies.La.sign - 1]!;
  const facts = [
    { key: "lagna", label: c.facts.lagna, value: lagna, info: c.info.lagna, align: "start" as const },
    { key: "moon", label: c.facts.moon, value: moon.sign, info: c.info.moon, align: "start" as const },
    { key: "star", label: c.facts.star, value: moon.nakshatra, pada: moon.pada, info: c.info.star, align: "end" as const },
  ];

  return (
    <ChartSection id="chart" level={1} eyebrow={c.eyebrow} heading={heading} intro={fill(c.oneLiner, { place })} className="birth-chart">
      <div className="birth-chart-drawing">
        {northNote && <p className="mb-3 text-sm text-muted">{northNote}</p>}
        <SouthChartDrawing result={result} birth={birth} t={t.chart} />
      </div>
      <div className="birth-chart-facts">
        <Notice className="text-[14px] leading-[22px]">
          {richText(c.rasiNotice, (part, key) => (
            <strong key={key} className="font-semibold">
              {part}
            </strong>
          ))}
        </Notice>
        <ul className="fact-tiles mt-4">
          {facts.map((f) => (
            <li key={f.key} className="fact-tile">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 pt-2.5">
                  <p className="text-[12px] leading-4 font-semibold tracking-[0.06em] text-muted uppercase">{f.label}</p>
                  <p className="mt-1 font-display text-[20px] leading-7">
                    {f.value}
                    {f.pada && <span className="hidden lg:inline"> {f.pada}</span>}
                  </p>
                </div>
                <InfoPopup label={f.info.label} title={f.info.title} body={f.info.body} more={f.info.more} align={f.align} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ChartSection>
  );
}
