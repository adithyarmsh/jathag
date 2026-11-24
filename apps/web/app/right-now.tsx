// "Right now" (step 0.3.7, D-113 item 1; roomier layout 0.3.7.1, D-115 item 4, the founder's option A):
// "Running now" full width on top as three stacked tiers (Mahadasha largest, Antardasha and
// Pratyantardasha stepping down), each with its level label, dates, what it activates and a thin bar
// for how far through the period the calculation moment is; "Coming up" and "Sade Sati" side by side
// below (stacked on phones). The level is told apart by its label text, size, indentation and a
// coloured left rule, never colour alone. Facts only. Every date on the clock at birth (D-098).

import { fill } from "@/lib/chart-format";
import { dashaNow, type CurrentLine } from "@/lib/dasha-view";
import type { ListContext } from "@/lib/list-context";
import { sadeSatiStatus } from "@/lib/transit-view";
import { ListCard, Marker } from "./list-bits";

const TIER_CLASS = { mahadasha: "tier tier-1", antardasha: "tier tier-2", pratyantardasha: "tier tier-3" } as const;

function Tier({ c, ctx }: { c: CurrentLine; ctx: ListContext }) {
  const t = ctx.t.lists;
  return (
    <li className={TIER_CLASS[c.level]}>
      <p className="tier-label">{c.tierLabel}</p>
      <p className="tier-main">
        <span className="tier-lord">{c.row.lordName}</span>{" "}
        <span className="tier-dates tabular-nums">{c.row.range}</span>
        {c.row.beganBeforeBirth && (
          <>
            {" "}
            <Marker>{t.beganBeforeBirth}</Marker>
          </>
        )}
      </p>
      {c.progress && c.progressText && (
        <div className="tier-progress">
          <div
            role="progressbar"
            aria-label={fill(t.progressLabel, { level: t.levels[c.level] })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={c.progress.percent}
            aria-valuetext={c.progressText}
            className="tier-bar"
          >
            <div className="tier-bar-fill" style={{ width: `${c.progress.fraction * 100}%` }} />
          </div>
          <span aria-hidden="true" className="tier-percent tabular-nums">
            {c.progressText}
          </span>
        </div>
      )}
      <p className="tier-activates">{c.activates}</p>
    </li>
  );
}

export function RightNow({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists;
  const now = dashaNow(ctx);
  const ss = sadeSatiStatus(ctx);
  return (
    <ListCard id="right-now-title" title={t.rightNow.title}>
      <p className="mt-1.5 text-[15px] text-muted">
        {fill(t.asOf, { date: ctx.date(ctx.result.dashas.asOf) })} · {fill(t.clockPointer, { offset: ctx.offset })}
      </p>
      {now.message && <p className="mt-5 text-[17px] leading-relaxed">{now.message}</p>}

      {now.current.length > 0 && (
        <div className="mt-7">
          <h3 className="right-now-heading">{t.rightNow.running}</h3>
          <ul className="mt-4 space-y-6">
            {now.current.map((c) => (
              <Tier key={c.level} c={c} ctx={ctx} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-line p-5 sm:p-6">
          <h3 className="right-now-heading">{t.rightNow.comingUp}</h3>
          {now.nothingNext ? (
            <p className="mt-3 text-[16px]">{now.nothingNext}</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {now.next.map((n) => (
                <li key={n.level}>
                  <p className="text-sm text-muted">{n.label}</p>
                  <p className="mt-0.5 text-[16px]">
                    <span className="font-semibold">{n.row.lordName}</span>{" "}
                    <span className="tabular-nums">{n.startsText}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line p-5 sm:p-6">
          <h3 className="right-now-heading">{t.sadeSati.title}</h3>
          <div className="text-[16px]">
            <SadeSatiStatusBlock ctx={ctx} view={ss} />
          </div>
        </div>
      </div>
    </ListCard>
  );
}

export function SadeSatiStatusBlock({ ctx, view }: { ctx: ListContext; view: ReturnType<typeof sadeSatiStatus> }) {
  const t = ctx.t.lists;
  return (
    <div className="mt-2 space-y-1.5">
      <p>
        <span className="text-muted">{t.sadeSati.statusLabel}:</span> <span className="font-semibold">{view.statusText}</span>
      </p>
      {view.current ? (
        <>
          <p className="tabular-nums">
            {view.current.range}
            {view.current.beganBeforeBirth && (
              <>
                {" "}
                <Marker>{t.beganBeforeBirth}</Marker>
              </>
            )}
          </p>
          <ul className="space-y-0.5 text-sm">
            {view.current.phases.map((p) => (
              <li key={p.phase}>{p.text}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>{view.nextText}</p>
      )}
      <p className="text-sm text-muted">{view.saturnText}</p>
    </div>
  );
}
