// "Right now" on the chart page (step 0.5.1, design spec §6.4; from the 0.3.7 card, D-113, D-115):
// eyebrow "RIGHT NOW · <date>", "You are in <planet>'s Mahadasha", the one-liner and the note that dates
// are on the clock at birth (§6.10). The tiers card: three levels, each with its label in the tier colour,
// the planet in Fraunces, the time left, the bar (heights 8/6/4 phone, 10/7/5 desktop) and the dates; no
// left-border rules. Beside it (desktop) or under it (phones): Coming up, then link rows that jump to the
// Sade Sati and Life areas sections. A birth after the calculation moment, or after the 120-year cycle,
// keeps its plain line (D-113, D-114). Facts only; every date on the clock at birth (D-098).

import { fill } from "@/lib/chart-format";
import { rightNowView } from "@/lib/chart-sections";
import type { ListContext } from "@/lib/list-context";
import { JumpLink } from "./contents-panel";
import { ChartSection, Marker, ProgressBar } from "./list-bits";

const LEVEL_NUMBER = { mahadasha: 1, antardasha: 2, pratyantardasha: 3 } as const;

export function RightNow({ ctx }: { ctx: ListContext }) {
  const t = ctx.t;
  const r = t.chartPage.rightNow;
  const v = rightNowView(ctx);
  return (
    <ChartSection
      id="right-now"
      eyebrow={v.eyebrow}
      heading={v.heading}
      intro={
        <>
          {r.oneLiner}{" "}
          <span className="text-muted">{fill(t.lists.clockNote, { offset: ctx.offset })}</span>
        </>
      }
    >
      {v.message && <p className="mt-5 text-[17px] leading-relaxed">{v.message}</p>}

      <div className="right-now-grid mt-6">
        {v.tiers.length > 0 && (
          <div className="card-outer p-4 lg:p-6">
            <h3 className="sr-only">{t.lists.rightNow.running}</h3>
            <ul className="tiers">
              {v.tiers.map((tier) => (
                <li key={tier.level} className={`tier tier-${LEVEL_NUMBER[tier.level]}`}>
                  <p className="tier-label">{tier.label}</p>
                  <p className="tier-main">
                    <span className="tier-lord">{tier.lord}</span>
                    <span className="tier-left tabular-nums">{tier.left}</span>
                  </p>
                  <ProgressBar
                    fraction={tier.fraction}
                    level={LEVEL_NUMBER[tier.level]}
                    label={fill(t.lists.progressLabel, { level: t.lists.levels[tier.level] })}
                    valueText={tier.left}
                  />
                  <p className="tier-dates tabular-nums">
                    {tier.dates}
                    {tier.beganBeforeBirth && (
                      <>
                        {" "}
                        <Marker>{t.lists.beganBeforeBirth}</Marker>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="card-outer p-4 lg:p-6">
            <h3 className="type-label">{t.lists.rightNow.comingUp}</h3>
            {v.nothingNext ? (
              <p className="mt-3 text-[15px]">{v.nothingNext}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {v.comingUp.map((c) => (
                  <li key={c.key} className="dated-row">
                    <span className="dated-row-date">{c.date}</span>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <JumpLink to="sade-sati" className="jump-row">
            <span>{v.sadeSatiLink}</span>
            <span aria-hidden="true">↓</span>
          </JumpLink>
          {v.lifeAreasLink && (
            <JumpLink to="life-areas" className="jump-row">
              <span>{v.lifeAreasLink}</span>
              <span aria-hidden="true">↓</span>
            </JumpLink>
          )}
        </div>
      </div>
    </ChartSection>
  );
}
