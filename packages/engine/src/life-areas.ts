// Life-area windows (step 0.3.4, FR-TIME-07, D-028, D-104). A calculation rule only: stable IDs out,
// no English names (D-063). The words for each area live in packages/content / the message files.
//
// The rule (D-028, D-104): a graha is linked to a life area when it RULES or OCCUPIES one of that area's
// houses (whole-sign houses from the Lagna, D-010). Every Vimshottari period, at all three levels, is
// flagged by its own lord (D-104 item 1), so a period's life areas are simply its lord's links.
//   - Sign lords: the standard Parashari lords (SIGN_LORD in ids.ts, the same table dignity uses).
//   - Rahu and Ketu rule no sign: occupation only (D-104 item 2).
//   - The natural significator (karaka) column of Requirements §6.6 is NOT used (D-104 item 3).
//   - One entry per life area with every reason listed, houses ascending; no score (D-104 item 4).
// Pure: no clock, no ephemeris; the chart is passed in.

import type { Chart } from './chart.ts';
import { GRAHAS, SIGN_LORD, type GrahaCode, type Sign } from './ids.ts';
import { dashaRefs, type DashaLevel, type DashaRef, type VimshottariTimeline } from './dasha.ts';
import { houseOf } from './zodiac.ts';

/** Life-area IDs, in the order of Requirements §6.6. */
export const LIFE_AREAS = [
  'self',
  'money',
  'communication',
  'home',
  'learning',
  'health',
  'relationships',
  'career',
  'luck',
  'spirituality',
] as const;
export type LifeAreaId = (typeof LIFE_AREAS)[number];

/**
 * Main houses of each life area. Source: Requirements §6.6 (confirmed by the founder 2026-11-20), D-028.
 * Houses are listed ascending here; §6.6 lists Career as "10, 6" and Spirituality as "12, 8".
 */
export const LIFE_AREA_HOUSES: Readonly<Record<LifeAreaId, readonly number[]>> = Object.freeze({
  self: [1],
  money: [2, 11],
  communication: [3],
  home: [4],
  learning: [5],
  health: [1, 6],
  relationships: [7],
  career: [6, 10],
  luck: [9],
  spirituality: [8, 12],
});

/** Why a graha is linked to a life area. `sign` = the sign it rules that falls in `house`. */
export type LifeAreaReason = { kind: 'rules'; house: number; sign: Sign } | { kind: 'occupies'; house: number };

export interface LifeAreaLink {
  area: LifeAreaId;
  /** Houses ascending; for the same house, "rules" before "occupies". */
  reasons: LifeAreaReason[];
}

/** For each of the 9 grahas, the life areas it is linked to (LIFE_AREAS order; empty when none). */
export type LifeAreaLinks = Record<GrahaCode, LifeAreaLink[]>;

export class LifeAreaInputError extends Error {
  readonly code = 'INVALID_LIFE_AREA_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'LifeAreaInputError';
  }
}

const isSign = (s: unknown): s is Sign => Number.isInteger(s) && (s as number) >= 1 && (s as number) <= 12;

/** The signs a graha rules (none for Rahu and Ketu), ascending. */
export function signsRuledBy(graha: GrahaCode): Sign[] {
  const out: Sign[] = [];
  SIGN_LORD.forEach((lord, i) => {
    if (lord === graha) out.push((i + 1) as Sign);
  });
  return out;
}

/**
 * The rule itself, from the Lagna sign and the sign each graha occupies (both 1–12).
 * Everything else about the chart is irrelevant to it.
 */
export function lifeAreaLinks(input: { lagnaSign: number; signs: Record<GrahaCode, number> }): LifeAreaLinks {
  const { lagnaSign, signs } = input;
  if (!isSign(lagnaSign)) throw new LifeAreaInputError('Lagna sign must be 1–12.');
  for (const g of GRAHAS) if (!isSign(signs?.[g])) throw new LifeAreaInputError('Every graha needs a sign 1–12.');

  const out = {} as LifeAreaLinks;
  for (const g of GRAHAS) {
    // All reasons for this graha, one per house it rules or occupies.
    const reasons: LifeAreaReason[] = signsRuledBy(g).map((sign) => ({ kind: 'rules', house: houseOf(sign, lagnaSign), sign }));
    reasons.push({ kind: 'occupies', house: houseOf(signs[g], lagnaSign) });
    reasons.sort((a, b) => a.house - b.house || (a.kind === b.kind ? 0 : a.kind === 'rules' ? -1 : 1));

    out[g] = [];
    for (const area of LIFE_AREAS) {
      const houses = LIFE_AREA_HOUSES[area];
      const hits = reasons.filter((r) => houses.includes(r.house));
      if (hits.length) out[g].push({ area, reasons: hits.map((r) => ({ ...r })) });
    }
  }
  return out;
}

/** The links for a calculated chart (its Lagna and the 9 grahas' signs). */
export function lifeAreasForChart(chart: Chart): LifeAreaLinks {
  const signs = {} as Record<GrahaCode, number>;
  for (const g of GRAHAS) signs[g] = chart.bodies[g].sign;
  return lifeAreaLinks({ lagnaSign: chart.bodies.La.sign, signs });
}

/** A period flagged for one life area: the period plus its lord's reasons for that area. */
export interface LifeAreaPeriod extends DashaRef {
  reasons: LifeAreaReason[];
}

/**
 * The periods at one level whose lord is linked to `area`, in time order (for "Periods that especially
 * activate this area", FR-LA-03; used by 0.3.7 and 0.7.5). Every period is flagged by its own lord
 * (D-104 item 1). Includes periods that ended before birth; screens decide what to show.
 */
export function periodsForLifeArea(
  timeline: VimshottariTimeline,
  links: LifeAreaLinks,
  area: LifeAreaId,
  level: DashaLevel,
): LifeAreaPeriod[] {
  if (!LIFE_AREAS.includes(area)) throw new LifeAreaInputError('Unknown life area.');
  const out: LifeAreaPeriod[] = [];
  for (const ref of dashaRefs(timeline, level)) {
    const link = links[ref.lord].find((l) => l.area === area);
    if (link) out.push({ ...ref, reasons: link.reasons.map((r) => ({ ...r })) });
  }
  return out;
}
