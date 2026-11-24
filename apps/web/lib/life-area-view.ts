// View model for the "Life areas" card (step 0.3.7, D-113 item 5, Requirements §6.6, D-104): the 10 areas
// in the engine's order, each with the planets the chart API links to it (`lifeAreas`) and every reason
// in plain words. The rule itself (rules / occupies, Rahu and Ketu by occupation only) lives in the
// engine; this only turns its output around (per area instead of per planet) and into words.
// The current Mahadasha, Antardasha and Pratyantardasha lords are marked. No per-area period lists
// (those are 0.7.5). Pure, tested in life-area-view.test.ts.

import { fill } from "./chart-format";
import {
  GRAHA_ORDER,
  grahaName,
  LEVELS,
  LIFE_AREA_ORDER,
  signName,
  type DashaLevel,
  type GrahaCode,
  type LifeAreaId,
  type LifeAreaLink,
  type ListContext,
} from "./list-context";

type Reason = LifeAreaLink["reasons"][number];

/** "rules house 7 (Libra)" / "sits in house 7" */
export function reasonText(r: Reason, ctx: ListContext): string {
  const t = ctx.t.lists.lifeAreas;
  return r.kind === "rules"
    ? fill(t.rules, { house: r.house, sign: signName(r.sign, ctx.t) })
    : fill(t.occupies, { house: r.house });
}

export interface LinkedPlanet {
  code: GrahaCode;
  name: string;
  /** "rules house 7 (Libra), sits in house 7" */
  reasons: string;
  /** "current Mahadasha", … for the lords of the periods running now */
  current: string[];
}

export interface LifeAreaView {
  area: LifeAreaId;
  name: string;
  planets: LinkedPlanet[];
  /** "No planet linked" when none */
  empty: string | null;
  /** The wellness line (Health only, FR-LA-04) */
  note: string | null;
}

export function lifeAreaViews(ctx: ListContext): LifeAreaView[] {
  const { lifeAreas, dashas } = ctx.result;
  const t = ctx.t.lists.lifeAreas;
  const currentOf = (g: GrahaCode) =>
    LEVELS.filter((level: DashaLevel) => dashas.current[level]?.lord === g).map((level) =>
      fill(t.currentMark, { level: ctx.t.lists.levels[level] }),
    );
  return LIFE_AREA_ORDER.map((area) => {
    const planets: LinkedPlanet[] = [];
    for (const g of GRAHA_ORDER) {
      const link = lifeAreas[g].find((l) => l.area === area);
      if (!link) continue;
      planets.push({
        code: g,
        name: grahaName(g, ctx.t),
        reasons: link.reasons.map((r) => reasonText(r, ctx)).join(", "),
        current: currentOf(g),
      });
    }
    return {
      area,
      name: t.names[area],
      planets,
      empty: planets.length ? null : t.noPlanet,
      note: area === "health" ? t.healthNote : null,
    };
  });
}
