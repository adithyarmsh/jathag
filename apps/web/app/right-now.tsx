// "Right now" (step 0.3.7, D-113 item 1): the periods running at the calculation moment at the three
// dasha levels with the life areas they activate, what starts next at each level, and the Sade Sati
// status. Facts only, no interpretation. Every date on the clock at birth (D-098).

import { fill } from "@/lib/chart-format";
import { dashaNow } from "@/lib/dasha-view";
import type { ListContext } from "@/lib/list-context";
import { sadeSatiStatus } from "@/lib/transit-view";
import { ListCard, Marker } from "./list-bits";

export function RightNow({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists;
  const now = dashaNow(ctx);
  const ss = sadeSatiStatus(ctx);
  return (
    <ListCard id="right-now-title" title={t.rightNow.title}>
      <p className="mt-1 text-sm text-muted">
        {fill(t.asOf, { date: ctx.date(ctx.result.dashas.asOf) })} · {fill(t.clockPointer, { offset: ctx.offset })}
      </p>
      {now.message && <p className="mt-4 leading-relaxed">{now.message}</p>}

      <div className="mt-5 grid gap-6 md:grid-cols-3">
        {now.current.length > 0 && (
          <div>
            <h3 className="list-subheading">{t.rightNow.running}</h3>
            <ul className="mt-2 space-y-3">
              {now.current.map((c) => (
                <li key={c.level}>
                  <p className="text-sm text-muted">{c.label}</p>
                  <p>
                    <span className="font-semibold">{c.row.lordName}</span>{" "}
                    <span className="tabular-nums">{c.row.range}</span>
                    {c.row.beganBeforeBirth && (
                      <>
                        {" "}
                        <Marker>{t.beganBeforeBirth}</Marker>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted">{c.activates}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="list-subheading">{t.rightNow.comingUp}</h3>
          {now.nothingNext ? (
            <p className="mt-2">{now.nothingNext}</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {now.next.map((n) => (
                <li key={n.level}>
                  <p className="text-sm text-muted">{n.label}</p>
                  <p>
                    <span className="font-semibold">{n.row.lordName}</span>{" "}
                    <span className="tabular-nums">{n.startsText}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="list-subheading">{t.sadeSati.title}</h3>
          <SadeSatiStatusBlock ctx={ctx} view={ss} />
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
