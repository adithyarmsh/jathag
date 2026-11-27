// "Life areas" (step 0.3.7, D-113 item 5, Requirements §6.6): the 10 areas, each with the planets linked
// to it and every reason in plain words; the lords of the periods running now are marked. The Health
// area carries the wellness line (FR-LA-04). No per-area period lists yet (0.7.5).

import { lifeAreaViews } from "@/lib/life-area-view";
import type { ListContext } from "@/lib/list-context";
import { ListCard, Marker } from "./list-bits";

export function LifeAreaList({ ctx }: { ctx: ListContext }) {
  const t = ctx.t.lists.lifeAreas;
  return (
    <ListCard id="life-area-list-title" title={t.title}>
      <p className="mt-1 text-sm text-muted">{t.intro}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {lifeAreaViews(ctx).map((a) => (
          <div key={a.area} className="card-inner p-4">
            <h3 id={`life-area-${a.area}`} className="font-semibold">
              {a.name}
            </h3>
            {a.note && <p className="mt-1 text-sm text-muted">{a.note}</p>}
            {a.empty ? (
              <p className="mt-2 text-[15px] text-muted">{a.empty}</p>
            ) : (
              <ul aria-labelledby={`life-area-${a.area}`} className="mt-2 space-y-2 text-[15px]">
                {a.planets.map((p) => (
                  <li key={p.code}>
                    <span className="font-semibold">{p.name}</span>: {p.reasons}
                    {p.current.map((m) => (
                      <span key={m}>
                        {" "}
                        <Marker>{m}</Marker>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ListCard>
  );
}
