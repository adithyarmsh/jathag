// View models for the sections of the chart page (step 0.5.1, design spec §6.3–6.9, D-138). Built only
// from the chart API response, on top of the 0.3.7 builders (dasha-view, transit-view, life-area-view),
// which stay as they are. Display arithmetic only (lengths, time left, bar widths); no astrology here.
// Pure functions, tested in chart-sections.test.ts.

import { fill } from "./chart-format";
import { dashaNow, mahadashaRows, type PeriodRow } from "./dasha-view";
import { dateOnBirthClock } from "./date-format";
import {
  GRAHA_ORDER,
  grahaName,
  LEVELS,
  LIFE_AREA_ORDER,
  SADE_SATI_PHASES,
  signName,
  type DashaLevel,
  type GrahaCode,
  type LifeAreaId,
  type ListContext,
  type SadeSatiPhase,
  type SignChangePlanet,
} from "./list-context";
import { sadeSatiStatus } from "./transit-view";

const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

// ---------------------------------------------------------------- time left (Right now, spec §6.4)

/** "5 days left" / "about 10 months left" / "about 3 years left" from asOf to the end of a period. */
export function timeLeft(asOf: string, end: string, t: ListContext["t"]): string {
  const c = t.chartPage.rightNow.left;
  const days = Math.max(0, Math.ceil((Date.parse(end) - Date.parse(asOf)) / DAY_MS));
  if (days <= 1) return c.day;
  if (days < 45) return fill(c.days, { n: days });
  const months = Math.round(days / 30.4375);
  if (months < 24) return fill(c.months, { n: months });
  return fill(c.years, { n: Math.round(days / 365.25) });
}

/** Whole years of a period (the Vimshottari lengths: 6, 7, 10, 16, 17, 18, 19, 20). */
export function periodYears(startUtc: string, endUtc: string): number {
  return Math.round((Date.parse(endUtc) - Date.parse(startUtc)) / YEAR_MS);
}

const yearOf = (utc: string, ctx: ListContext) => dateOnBirthClock(utc, ctx.result.clock.utcOffsetSeconds).year;

// ---------------------------------------------------------------- Right now

export interface TierView {
  level: DashaLevel;
  /** "Long-term · Mahadasha" */
  label: string;
  lord: string;
  /** "11 Oct 2011 – 11 Oct 2027" */
  dates: string;
  beganBeforeBirth: boolean;
  /** 0–1 */
  fraction: number;
  percent: number;
  /** "95% through · about 10 months left" */
  left: string;
}

export interface ComingUpRow {
  key: string;
  date: string;
  text: string;
}

export interface RightNowView {
  /** "Right now · 26 Nov 2026" */
  eyebrow: string;
  /** "You are in Jupiter's Mahadasha" (or the general heading when no period runs) */
  heading: string;
  /** Before birth / after the cycle: the plain line (D-113, D-114). */
  message: string | null;
  tiers: TierView[];
  comingUp: ComingUpRow[];
  nothingNext: string | null;
  /** "Sade Sati: setting phase, until 23 Feb 2028" */
  sadeSatiLink: string;
  /** "Active life areas: self, money, …", or null when no current period. */
  lifeAreasLink: string | null;
}

export function rightNowView(ctx: ListContext): RightNowView {
  const t = ctx.t;
  const r = t.chartPage.rightNow;
  const now = dashaNow(ctx);
  const asOf = ctx.result.dashas.asOf;
  const tiers: TierView[] = now.current.map((c) => {
    const fraction = c.progress?.fraction ?? 0;
    const percent = c.progress?.percent ?? 0;
    return {
      level: c.level,
      label: c.tierLabel,
      lord: c.row.lordName,
      dates: c.row.range,
      beganBeforeBirth: c.row.beganBeforeBirth,
      fraction,
      percent,
      left: fill(r.progressLeft, { percent, left: timeLeft(asOf, c.row.endUtc, t) }),
    };
  });
  const maha = now.current.find((c) => c.level === "mahadasha");

  // Coming up: the next start at each level, in date order; a shorter period that starts on the same day
  // as a longer one is not repeated (it starts with it).
  const seen = new Set<string>();
  const comingUp: ComingUpRow[] = [];
  for (const n of [...now.next].sort((a, b) => Date.parse(a.row.startUtc) - Date.parse(b.row.startUtc) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))) {
    if (seen.has(n.row.start)) continue;
    seen.add(n.row.start);
    const text =
      n.level === "mahadasha"
        ? fill(r.nextMaha, { planet: n.row.lordName, years: periodYears(n.row.startUtc, n.row.endUtc) })
        : fill(r.nextPeriod[n.level], { planet: n.row.lordName });
    comingUp.push({ key: n.level, date: n.row.start, text });
  }

  const ss = sadeSatiStatus(ctx);
  const sadeSatiLink = ss.current
    ? fill(r.sadeSatiLink, { status: t.chartPage.sadeSati.inline[ss.phase as SadeSatiPhase], date: ss.current.end })
    : fill(r.sadeSatiNone, { next: ss.nextText });

  const areas = activeAreas(ctx);
  return {
    eyebrow: fill(r.eyebrow, { date: ctx.date(asOf) }),
    heading: maha ? fill(r.heading, { planet: maha.row.lordName }) : r.headingNone,
    message: now.message,
    tiers,
    comingUp,
    nothingNext: now.nothingNext,
    sadeSatiLink,
    lifeAreasLink: areas.length ? fill(r.lifeAreasLink, { areas: areas.map((a) => t.chartPage.lifeAreas.short[a]).join(", ") }) : null,
  };
}

/** The lords of the periods running now (all three levels), without repeats. */
function currentLords(ctx: ListContext): GrahaCode[] {
  const lords: GrahaCode[] = [];
  for (const level of LEVELS) {
    const lord = ctx.result.dashas.current[level]?.lord;
    if (lord && !lords.includes(lord)) lords.push(lord);
  }
  return lords;
}

/** Life areas linked to a current period's planet (D-104), in the engine's order. */
export function activeAreas(ctx: ListContext): LifeAreaId[] {
  const lords = currentLords(ctx);
  return LIFE_AREA_ORDER.filter((area) => lords.some((g) => ctx.result.lifeAreas[g].some((l) => l.area === area)));
}

// ---------------------------------------------------------------- Dasha periods (spec §6.5)

export interface MahaRowView {
  row: PeriodRow;
  /** "2011 – 2027" */
  years: string;
  /** "16 yrs" */
  length: string;
  /** years / 20, for the bar */
  barFraction: number;
  /** "You are here" / "Began before birth, on 11 Oct 1986" / "" */
  note: string;
}

export function mahaRowViews(ctx: ListContext): MahaRowView[] {
  const d = ctx.t.chartPage.dashas;
  return mahadashaRows(ctx).map((row) => {
    const n = periodYears(row.startUtc, row.endUtc);
    return {
      row,
      years: fill(ctx.t.lists.dateRange, { start: yearOf(row.startUtc, ctx), end: yearOf(row.endUtc, ctx) }),
      length: fill(d.length, { n }),
      barFraction: Math.min(1, n / 20),
      note: row.current ? ctx.t.lists.youAreHere : row.beganBeforeBirth ? fill(d.beganOn, { date: row.start }) : "",
    };
  });
}

// ---------------------------------------------------------------- Life areas (spec §6.6)

const ordinal = (n: number, ctx: ListContext) => ctx.t.chart.southChart.ordinals[n - 1]!;

/** "the 2nd and 11th" style lists: "2nd", "2nd and 11th", "2nd, 5th and 11th". */
function joinWords(items: string[], ctx: ListContext): string {
  const and = ctx.t.chartPage.lifeAreas.and;
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${and}${items[items.length - 1]}`;
}

/**
 * The reasons of one area in words (spec §6.6): "Sun rules the 1st · Jupiter and Venus sit in the 1st ·
 * Saturn rules and sits in the 6th". Same facts as the 0.3.7 list (lifeAreas from the API), grouped:
 * planets that only sit in the same house are named together.
 */
export function lifeAreaReasons(area: LifeAreaId, ctx: ListContext): string {
  const l = ctx.t.chartPage.lifeAreas;
  const parts: { order: number; text: string }[] = [];
  const sitters = new Map<number, { order: number; names: string[] }>();
  GRAHA_ORDER.forEach((g, i) => {
    const link = ctx.result.lifeAreas[g].find((x) => x.area === area);
    if (!link) return;
    const name = grahaName(g, ctx.t);
    const rules = link.reasons.filter((r) => r.kind === "rules").map((r) => r.house).sort((a, b) => a - b);
    const sits = link.reasons.find((r) => r.kind === "occupies")?.house;
    if (!rules.length && sits !== undefined) {
      const s = sitters.get(sits) ?? { order: i, names: [] };
      s.names.push(name);
      sitters.set(sits, s);
      return;
    }
    const ruled = joinWords(rules.map((h) => ordinal(h, ctx)), ctx);
    let text: string;
    if (sits === undefined) text = fill(l.rules, { planet: name, houses: ruled });
    else if (rules.length === 1 && rules[0] === sits) text = fill(l.rulesAndSitsSame, { planet: name, house: ordinal(sits, ctx) });
    else text = fill(l.rulesAndSits, { planet: name, houses: ruled, house: ordinal(sits, ctx) });
    parts.push({ order: i, text });
  });
  for (const [house, s] of sitters) {
    const tpl = s.names.length === 1 ? l.sits : l.sit;
    parts.push({ order: s.order, text: fill(tpl, { planets: joinWords(s.names, ctx), house: ordinal(house, ctx) }) });
  }
  return parts.sort((a, b) => a.order - b.order).map((p) => p.text).join(l.separator);
}

export interface LifeAreaTile {
  area: LifeAreaId;
  name: string;
  reasons: string;
  active: boolean;
  /** "Through your Jupiter Mahadasha and Rahu Antardasha" for an active area, else null. */
  activeText: string | null;
  note: string | null;
}

export function lifeAreaTiles(ctx: ListContext): LifeAreaTile[] {
  const l = ctx.t.chartPage.lifeAreas;
  return LIFE_AREA_ORDER.map((area) => {
    const levels = LEVELS.filter((level) => {
      const lord = ctx.result.dashas.current[level]?.lord;
      return lord !== undefined && ctx.result.lifeAreas[lord].some((x) => x.area === area);
    });
    const periods = levels.map((level) =>
      fill(l.period, { planet: grahaName(ctx.result.dashas.current[level]!.lord, ctx.t), level: ctx.t.lists.levels[level] }),
    );
    return {
      area,
      name: ctx.t.lists.lifeAreas.names[area],
      reasons: lifeAreaReasons(area, ctx) || ctx.t.lists.lifeAreas.noPlanet,
      active: levels.length > 0,
      activeText: levels.length ? fill(l.through, { periods: joinWords(periods, ctx) }) : null,
      note: area === "health" ? l.healthNote : null,
    };
  });
}

// ---------------------------------------------------------------- Sade Sati (spec §6.7)

export interface PhaseSegment {
  phase: SadeSatiPhase;
  /** Share of the period's real length, 0–1 (the three add up to 1). */
  share: number;
  current: boolean;
  /** "Rising · 24 Jan 2020" */
  label: string;
}

export interface SadeSatiCard {
  phase: "none" | SadeSatiPhase;
  /** The h2: calm wording per status, never fear-based (draft, D-138). */
  heading: string;
  /** "Setting phase" / "No Sade Sati now" */
  title: string;
  /** "until 23 Feb 2028" / "Your next Sade Sati starts on 14 Aug 2031." */
  detail: string;
  /** The three-part bar (current period only). */
  segments: PhaseSegment[] | null;
  /** Where "Today" sits on the bar, 0–1 (null when no bar). */
  today: number | null;
  /** The back-and-forth sentence for the current period, or null. */
  backAndForth: string | null;
  /** "Every Sade Sati, birth to 120 years: 5 periods" */
  allTitle: string;
}

export function sadeSatiCard(ctx: ListContext): SadeSatiCard {
  const s = ctx.t.chartPage.sadeSati;
  const ss = ctx.result.transits.sadeSati;
  const status = sadeSatiStatus(ctx);
  const n = ss.periods.length;
  const allTitle = n === 1 ? s.allTitleOne : fill(s.allTitle, { count: n });
  const current = ss.status.current ? ss.periods[ss.status.current.index]! : null;
  if (!current || ss.status.phase === "none") {
    return {
      phase: "none",
      heading: s.headings.none,
      title: s.noneTitle,
      detail: status.nextText.replace(/\.?$/, "."),
      segments: null,
      today: null,
      backAndForth: null,
      allTitle,
    };
  }
  const phase = ss.status.phase;
  // Widths by real duration (spec §6.7); a date outside the data falls back to equal thirds.
  const ms = SADE_SATI_PHASES.map((p) => {
    const ph = current.phases[p];
    return ph.start && ph.end ? Date.parse(ph.end) - Date.parse(ph.start) : NaN;
  });
  const known = ms.every((x) => Number.isFinite(x) && x > 0);
  const total = known ? ms.reduce((a, b) => a + b, 0) : 3;
  const segments = SADE_SATI_PHASES.map((p, i) => ({
    phase: p,
    share: known ? ms[i]! / total : 1 / 3,
    current: p === phase,
    label: fill(s.phaseLabel, {
      phase: ctx.t.lists.sadeSati.phases[p],
      date: current.phases[p].start ? ctx.date(current.phases[p].start!) : ctx.t.lists.sadeSati.beforeData,
    }),
  }));
  let today: number | null = null;
  if (known && current.start && current.end) {
    const asOf = Date.parse(ctx.result.transits.asOf);
    today = Math.min(1, Math.max(0, (asOf - Date.parse(current.phases.rising.start!)) / total));
  }
  return {
    phase,
    heading: s.headings[phase],
    title: ctx.t.lists.sadeSati.status[phase],
    detail: fill(s.until, { date: status.current!.end }),
    segments,
    today,
    backAndForth: backAndForth(current.crossings, ctx),
    allTitle,
  };
}

/**
 * One sentence on Saturn's back-and-forth crossing in the running period (spec §6.7): "Saturn touches
 * Aries on 3 Jun 2027, steps back into Pisces on 20 Oct 2027, and enters Aries for good on 23 Feb
 * 2028." The first such move that is not over yet (else the last one); null when there is none.
 */
function backAndForth(crossings: ListContext["result"]["transits"]["sadeSati"]["periods"][number]["crossings"], ctx: ListContext): string | null {
  const asOf = Date.parse(ctx.result.transits.asOf);
  const trios: string[] = [];
  let upcoming: string | null = null;
  for (let i = 1; i + 1 < crossings.length; i++) {
    const [a, back, again] = [crossings[i - 1]!, crossings[i]!, crossings[i + 1]!];
    if (back.kind !== "moves-back" || again.kind !== "enters-again") continue;
    const text = fill(ctx.t.chartPage.sadeSati.backAndForth, {
      sign: signName(a.toSign, ctx.t),
      first: ctx.date(a.utc),
      back: signName(back.toSign, ctx.t),
      backDate: ctx.date(back.utc),
      again: ctx.date(again.utc),
    });
    trios.push(text);
    if (upcoming === null && Date.parse(again.utc) > asOf) upcoming = text;
  }
  return upcoming ?? trios[trios.length - 1] ?? null;
}

// ---------------------------------------------------------------- Transits (spec §6.8)

export interface NextChange {
  key: string;
  date: string;
  text: string;
}

const SIGN_CHANGE_PLANETS: readonly SignChangePlanet[] = ["Sa", "Ju", "Ra", "Ke"];

/** The next `count` days with a sign change after asOf; changes on the same day share one row. */
export function nextSignChanges(ctx: ListContext, count = 3): NextChange[] {
  const tr = ctx.t.lists.transits;
  const asOf = Date.parse(ctx.result.transits.asOf);
  const upcoming = SIGN_CHANGE_PLANETS.flatMap((p) => ctx.result.transits.signChanges[p])
    .filter((c) => Date.parse(c.utc) > asOf)
    .sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc) || SIGN_CHANGE_PLANETS.indexOf(a.planet) - SIGN_CHANGE_PLANETS.indexOf(b.planet));
  const days: NextChange[] = [];
  for (const c of upcoming) {
    const date = ctx.date(c.utc);
    const text = fill(tr.crossingInline[c.kind], { planet: grahaName(c.planet, ctx.t), sign: signName(c.toSign, ctx.t) });
    const last = days[days.length - 1];
    if (last && last.date === date) last.text += `${ctx.t.chartPage.transits.joiner}${text}`;
    else if (days.length < count) days.push({ key: `${c.planet}-${c.utc}`, date, text });
    else break;
  }
  return days;
}

/** "10th" */
export const houseOrdinal = (n: number, ctx: ListContext) => ordinal(n, ctx);
