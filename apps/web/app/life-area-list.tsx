// "Life areas" on the chart page (step 0.5.1, design spec §6.6; from the 0.3.7 list, D-113, Requirements
// §6.6, D-104): "Which planets touch which part of life". The ten areas (phones: one card with ten rows;
// desktop: a two-column grid of tiles), each with its reasons in words ("Sun rules the 1st · Jupiter and
// Venus sit in the 1st"), an "Active now" tag where a planet of a current period is linked (with the
// periods in words, so colour is never the only signal), and Health with the wellness line (FR-LA-04).
// No links to life-area pages and no "why" pop-ups yet (both 0.7.5).

import { lifeAreaTiles } from "@/lib/chart-sections";
import type { ListContext } from "@/lib/list-context";
import { Tag } from "@/components/tag";
import { ChartSection } from "./list-bits";

export function LifeAreaList({ ctx }: { ctx: ListContext }) {
  const l = ctx.t.chartPage.lifeAreas;
  return (
    <ChartSection id="life-areas" eyebrow={l.eyebrow} heading={l.heading} intro={l.oneLiner}>
      <ul className="life-area-grid mt-6">
        {lifeAreaTiles(ctx).map((a) => (
          <li key={a.area} className={a.active ? "life-area life-area-active" : "life-area"}>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h3 id={`life-area-${a.area}`} className="text-[15px] leading-6 font-semibold">
                {a.name}
              </h3>
              {a.active && <Tag kind="active">{l.activeNow}</Tag>}
            </div>
            <p className="mt-1 text-[14px] leading-[22px] text-muted">{a.reasons}</p>
            {a.activeText && <p className="mt-1 text-[13px] leading-5 text-accent-text">{a.activeText}</p>}
            {a.note && <p className="mt-1 text-[13px] leading-5 text-muted italic">{a.note}</p>}
          </li>
        ))}
      </ul>
    </ChartSection>
  );
}
