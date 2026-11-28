"use client";

// "Birth chart", the first section of the chart page (step 0.5.1, design spec §6.3; drawn charts 0.5.2,
// §7, D-143): eyebrow "BIRTH CHART", the h1, the one-liner, the drawn chart (South or North Indian, Rasi
// D1 or Navamsa D9), directly under it the chart-type chips (Rasi (D1) · Navamsa (D9), aria-pressed)
// and the South / North toggle, the "what this is" notice for the chart shown, the three fact tiles
// (always the D1 birth facts, D-143 item 6) and the index (open on desktop, an opener on phones).
// Desktop: the drawing on the left (440 px), everything else in the right column (as drawn).
// - The page always opens on D1; the D1 / D9 choice is not remembered (D-143 item 2).
// - South / North is the ONE remembered style ("chartStyle"), the same as the form's Chart style
//   cards (components/chart-style-store.ts, D-143 item 1).

import { useState } from "react";
import type { ChartResponse } from "@jathag/api";
import { fill } from "@/lib/chart-format";
import { chartAriaLabel, chartTitle, type ChartKind } from "@/lib/drawn-chart";
import type { Messages } from "@/lib/i18n";
import { richText } from "@/lib/i18n";
import { moonFacts } from "@/lib/south-chart";
import { setChartStyle, useChartStyle } from "@/components/chart-style-store";
import { Chip } from "@/components/chip";
import { InfoPopup } from "@/components/info-popup";
import { Notice } from "@/components/notice";
import { Toggle } from "@/components/toggle";
import { ChartIndex } from "./chart-index";
import { ChartSection } from "./list-bits";
import { NorthChart } from "./north-chart";
import { SouthChart } from "./south-chart";

export interface ChartBirth {
  /** "14 Aug 1992 · 6:45 AM" */
  dateTime: string;
  /** The place label, or "Near …" for typed coordinates (D-144) */
  place: string;
}

export function BirthChartSection({
  result,
  birth,
  heading,
  place,
  t,
}: {
  result: ChartResponse;
  /** For the centre (South) or the caption (North): date, time and the place shown. */
  birth: ChartBirth;
  heading: string;
  /** "Chennai" for the one-liner */
  place: string;
  t: Messages;
}) {
  const c = t.chartPage.chart;
  const [kind, setKind] = useState<ChartKind>("d1");
  const style = useChartStyle();
  const chart = result.chart;
  const moon = moonFacts(chart, t.chart);
  const lagna = t.chart.signs[chart.bodies.La.sign - 1]!;
  const facts = [
    { key: "lagna", label: c.facts.lagna, value: lagna, info: c.info.lagna, align: "start" as const },
    { key: "moon", label: c.facts.moon, value: moon.sign, info: c.info.moon, align: "start" as const },
    { key: "star", label: c.facts.star, value: moon.nakshatra, pada: moon.pada, info: c.info.star, align: "end" as const },
  ];
  const title = chartTitle(kind, t.chart);
  const label = chartAriaLabel(chart, kind, style, birth, t.chart);

  return (
    <ChartSection id="chart" level={1} eyebrow={c.eyebrow} heading={heading} intro={fill(c.oneLiner, { place })} className="birth-chart">
      <div className="birth-chart-drawing">
        {style === "north" ? (
          <>
            {/* No free middle in the North chart: its title, date, time and place go above it. */}
            <div className="north-caption" aria-hidden="true">
              <p className="chart-title font-display text-[17px] leading-6 text-ink">{title}</p>
              <p className="text-[13px] leading-5 text-muted">
                {birth.dateTime} · {birth.place}
              </p>
            </div>
            <NorthChart chart={chart} kind={kind} label={label} t={t.chart} />
          </>
        ) : (
          <SouthChart chart={chart} kind={kind} title={title} dateTime={birth.dateTime} place={birth.place} label={label} t={t.chart} />
        )}
      </div>
      <div className="birth-chart-controls">
        <div role="group" aria-label={c.types.label} className="flex flex-wrap gap-2">
          {(["d1", "d9"] as const).map((k) => (
            <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
              {c.types[k]}
            </Chip>
          ))}
        </div>
        <Toggle
          label={c.style.label}
          options={[
            { value: "south", label: c.style.south },
            { value: "north", label: c.style.north },
          ]}
          value={style}
          onChange={setChartStyle}
          className="w-[9.5rem] shrink-0"
        />
      </div>
      <div className="birth-chart-facts">
        <Notice className="text-[14px] leading-[22px]">
          {richText(kind === "d1" ? c.rasiNotice : c.navamsaNotice, (part, key) => (
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
        <ChartIndex t={t.chart} />
      </div>
    </ChartSection>
  );
}
