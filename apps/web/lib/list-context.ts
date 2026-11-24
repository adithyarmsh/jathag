// Shared pieces for the step 0.3.7 lists (D-113): the chart API's types, the date formatter for one
// chart and small word helpers. Display only: no calculation happens here, every value comes from
// the chart API response. Types only from @jathag/api (page code never imports it at runtime).

import type { ChartResponse } from "@jathag/api";
import { birthClockFormatter } from "./date-format";
import { fill, formatUtcOffset } from "./chart-format";
import type { Messages } from "./i18n";

export type Timeline = ChartResponse["dashas"]["vimshottari"];
export type Mahadasha = Timeline["mahadashas"][number];
export type Antardasha = Mahadasha["antardashas"][number];
export type DashaPeriod = Antardasha["pratyantardashas"][number];
export type GrahaCode = Mahadasha["lord"];
export type DashaLevel = keyof ChartResponse["dashas"]["current"];
export type LifeAreaLink = ChartResponse["lifeAreas"][GrahaCode][number];
export type LifeAreaId = LifeAreaLink["area"];
export type Transits = ChartResponse["transits"];
export type SadeSatiPeriod = Transits["sadeSati"]["periods"][number];
export type SadeSatiPhase = keyof SadeSatiPeriod["phases"];
export type SignChangePlanet = keyof Transits["signChanges"];

/** Level order, longest first (FR-TM-04 labels come from en.json). */
export const LEVELS: readonly DashaLevel[] = ["mahadasha", "antardasha", "pratyantardasha"];

/** The 9 grahas in the engine's order (tests check this equals the engine's GRAHAS). */
export const GRAHA_ORDER: readonly GrahaCode[] = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

/** The 10 life areas in the engine's LIFE_AREAS order (tests check this equals the engine's list). */
export const LIFE_AREA_ORDER: readonly LifeAreaId[] = [
  "self",
  "money",
  "communication",
  "home",
  "learning",
  "health",
  "relationships",
  "career",
  "luck",
  "spirituality",
];

export const SADE_SATI_PHASES: readonly SadeSatiPhase[] = ["rising", "peak", "setting"];

export interface ListContext {
  result: ChartResponse;
  t: Messages;
  /** UTC ISO → "14 Aug 2031" on the clock at birth. */
  date: (utc: string) => string;
  /** "UTC+5:30" */
  offset: string;
}

export function listContext(result: ChartResponse, t: Messages): ListContext {
  return {
    result,
    t,
    date: birthClockFormatter(result.clock.utcOffsetSeconds, t.lists.monthsShort),
    offset: formatUtcOffset(result.clock.utcOffsetSeconds),
  };
}

/** "Mahadasha (long-term)" (FR-TM-04). */
export function levelLabel(level: DashaLevel, t: Messages): string {
  return fill(t.lists.levelLabel, { level: t.lists.levels[level], term: t.lists.terms[level] });
}

/** "Venus" */
export const grahaName = (code: GrahaCode, t: Messages) => t.chart.bodies[code];

/** "Aquarius" for sign 1–12 */
export const signName = (sign: number, t: Messages) => t.chart.signs[sign - 1]!;

/** The life areas a planet's period activates: its lord's links (D-104), names from en.json. */
export function activatesText(lord: GrahaCode, ctx: ListContext): string {
  const names = ctx.result.lifeAreas[lord].map((l) => ctx.t.lists.lifeAreas.names[l.area]);
  return fill(ctx.t.lists.rightNow.activates, { areas: names.length ? names.join(", ") : ctx.t.lists.rightNow.noArea });
}
