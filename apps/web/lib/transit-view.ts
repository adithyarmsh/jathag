// View models for the "Transits and Sade Sati" card and the Sade Sati lines of "Right now" (step 0.3.7,
// D-113 item 4, FR-TR-01…03, FR-TRAN-01…04). Built only from the chart API's `transits`; every crossing
// is shown exactly as returned, with its kind in plain words (D-099 item 3). Dates on the clock at birth.
// A Sade Sati start or end outside the ephemeris data (null in the API) is shown in words, never "null".
// Pure functions, tested in transit-view.test.ts.

import { fill } from "./chart-format";
import {
  GRAHA_ORDER,
  grahaName,
  SADE_SATI_PHASES,
  signName,
  type GrahaCode,
  type ListContext,
  type SadeSatiPeriod,
  type SadeSatiPhase,
  type SignChangePlanet,
  type Transits,
} from "./list-context";

type Crossing = Transits["signChanges"][SignChangePlanet][number];

export interface PositionRow {
  code: GrahaCode;
  name: string;
  sign: string;
  fromMoon: string;
  fromLagna: string;
  /** "R", "" or "—" (Rahu/Ketu: does not apply), as in the planet table (D-093). */
  retrograde: string;
}

/** Today's positions of the 9 grahas (transits.positions), in the engine's order. */
export function positionRows(ctx: ListContext): PositionRow[] {
  const { positions } = ctx.result.transits;
  const c = ctx.t.chart;
  return GRAHA_ORDER.map((code) => {
    const p = positions[code];
    const node = code === "Ra" || code === "Ke";
    return {
      code,
      name: grahaName(code, ctx.t),
      sign: signName(p.sign, ctx.t),
      fromMoon: String(p.houseFromMoon),
      fromLagna: String(p.houseFromLagna),
      retrograde: node ? c.notApplicable : p.retrograde ? c.retrograde : "",
    };
  });
}

/** "Enters Aquarius" / "Moves back into Capricorn" / "Enters Aquarius again" (D-099 item 3). */
export function crossingText(c: Pick<Crossing, "kind" | "toSign">, ctx: ListContext): string {
  return fill(ctx.t.lists.transits.crossing[c.kind], { sign: signName(c.toSign, ctx.t) });
}

export interface CrossingRow {
  key: string;
  date: string;
  text: string;
}

export interface SignChangeGroup {
  planet: SignChangePlanet;
  name: string;
  /** Closed-opener line (0.3.7.1): "7 sign changes · next: enters Capricorn on 5 Dec 2026" */
  summary: string;
  rows: CrossingRow[];
}

const SIGN_CHANGE_PLANETS: readonly SignChangePlanet[] = ["Sa", "Ju", "Ra", "Ke"];

/** Sign changes of Saturn, Jupiter, Rahu and Ketu, each in time order exactly as returned. */
export function signChangeGroups(ctx: ListContext): SignChangeGroup[] {
  const tr = ctx.t.lists.transits;
  const asOf = Date.parse(ctx.result.transits.asOf);
  return SIGN_CHANGE_PLANETS.map((planet) => {
    const list = ctx.result.transits.signChanges[planet];
    const count = list.length === 1 ? tr.planetSummaryOne : fill(tr.planetSummary, { count: list.length });
    const next = list.find((c) => Date.parse(c.utc) > asOf);
    const summary = next
      ? fill(tr.planetSummaryNext, {
          count,
          change: fill(tr.crossingShort[next.kind], { sign: signName(next.toSign, ctx.t) }),
          date: ctx.date(next.utc),
        })
      : count;
    return {
      planet,
      name: grahaName(planet, ctx.t),
      summary,
      rows: list.map((c, i) => ({
        key: `${planet}-${i}`,
        date: ctx.date(c.utc),
        text: crossingText(c, ctx),
      })),
    };
  });
}

/**
 * One-line summary for the closed sign-changes opener (0.3.7.1, D-115 item 6): the next crossing after
 * the calculation moment across the four planets, e.g. "Next: Rahu enters Capricorn and Ketu enters
 * Cancer on 6 Dec 2026" (crossings on the same day are joined); a general line if none is left.
 */
export function signChangeSummary(ctx: ListContext): string {
  const tr = ctx.t.lists.transits;
  const asOf = Date.parse(ctx.result.transits.asOf);
  const upcoming = SIGN_CHANGE_PLANETS.flatMap((planet) => ctx.result.transits.signChanges[planet])
    .filter((c) => Date.parse(c.utc) > asOf)
    .sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc));
  const first = upcoming[0];
  if (!first) return tr.signChangesSummary;
  const day = ctx.date(first.utc);
  const same = upcoming.filter((c) => ctx.date(c.utc) === day);
  const changes = same.map((c) => fill(tr.crossingInline[c.kind], { planet: grahaName(c.planet, ctx.t), sign: signName(c.toSign, ctx.t) }));
  return fill(tr.nextChange, { changes: changes.join(tr.and), date: day });
}

/** Number of rows the open sign-changes list draws (for the opener's label and tests). */
export const signChangeRowCount = (ctx: ListContext) =>
  SIGN_CHANGE_PLANETS.reduce((n, p) => n + ctx.result.transits.signChanges[p].length, 0);

// ---------------------------------------------------------------- Sade Sati

/** "4 periods from birth to 120 years after birth" for the closed Sade Sati list. */
export function sadeSatiSummary(ctx: ListContext): string {
  const s = ctx.t.lists.sadeSati;
  const n = ctx.result.transits.sadeSati.periods.length;
  if (n === 0) return s.none;
  return n === 1 ? s.allSummaryOne : fill(s.allSummary, { count: n });
}

/** A Sade Sati date, or words when it lies outside the ephemeris data (null in the API). */
function sadeDate(iso: string | null, edge: "before" | "after", ctx: ListContext): string {
  if (iso) return ctx.date(iso);
  return edge === "before" ? ctx.t.lists.sadeSati.beforeData : ctx.t.lists.sadeSati.afterData;
}

/**
 * Which edge a missing phase start lies beyond. The API leaves a phase start null either because Saturn
 * was already past it when the data begins (only for a period whose start is outside the data; those are
 * the first phases) or because the data ends first (the later phases).
 */
function phaseEdge(period: SadeSatiPeriod, phase: SadeSatiPhase): "before" | "after" {
  if (!period.startOutsideData) return "after";
  const i = SADE_SATI_PHASES.indexOf(phase);
  return SADE_SATI_PHASES.slice(0, i + 1).every((ph) => period.phases[ph].start === null) ? "before" : "after";
}

export interface PhaseLine {
  phase: SadeSatiPhase;
  /** "Rising: Saturn in Aquarius, from 24 Jan 2020" */
  text: string;
}

export interface SadeSatiPeriodView {
  index: number;
  key: string;
  start: string;
  end: string;
  /** "24 Jan 2020 – 23 Feb 2028" */
  range: string;
  beganBeforeBirth: boolean;
  /** Running at the calculation moment ("You are here"). */
  current: boolean;
  phases: PhaseLine[];
  /** Every Saturn sign change inside the period (the dips), drawn only when opened. */
  crossings: CrossingRow[];
}

export function sadeSatiPeriodView(index: number, ctx: ListContext): SadeSatiPeriodView {
  const ss = ctx.result.transits.sadeSati;
  const p = ss.periods[index]!;
  const s = ctx.t.lists.sadeSati;
  const start = sadeDate(p.start, "before", ctx);
  const end = sadeDate(p.end, "after", ctx);
  return {
    index,
    key: `ss-${index}`,
    start,
    end,
    range: fill(s.period, { start, end }),
    beganBeforeBirth: p.startedBeforeBirth,
    current: ss.status.current?.index === index,
    phases: SADE_SATI_PHASES.map((phase) => ({
      phase,
      text: fill(s.phaseLine, {
        phase: s.phases[phase],
        sign: signName(ss.signs[phase], ctx.t),
        date: sadeDate(p.phases[phase].start, phaseEdge(p, phase), ctx),
      }),
    })),
    crossings: p.crossings.map((c, i) => ({
      key: `ss-${index}-${i}`,
      date: ctx.date(c.utc),
      text: fill(s.crossing, { change: crossingText(c, ctx), house: c.toHouse }),
    })),
  };
}

/** All Sade Sati periods from birth to 120 years after birth. */
export function sadeSatiPeriodViews(ctx: ListContext): SadeSatiPeriodView[] {
  return ctx.result.transits.sadeSati.periods.map((_, i) => sadeSatiPeriodView(i, ctx));
}

export interface SadeSatiStatusView {
  phase: "none" | SadeSatiPhase;
  /** "Rising phase" / "Not running" */
  statusText: string;
  /** The period running now, with its phase dates (null when none). */
  current: SadeSatiPeriodView | null;
  /** "Next Sade Sati starts 14 Aug 2031" / "No further Sade Sati within 120 years of birth." */
  nextText: string;
  /** "Saturn now: Aquarius, house 12 from the Moon" */
  saturnText: string;
}

/** The Sade Sati status (transits.sadeSati.status). The next period is shown while none is running. */
export function sadeSatiStatus(ctx: ListContext): SadeSatiStatusView {
  const st = ctx.result.transits.sadeSati.status;
  const s = ctx.t.lists.sadeSati;
  const nextPeriod = st.next ? ctx.result.transits.sadeSati.periods[st.next.index] : undefined;
  return {
    phase: st.phase,
    statusText: s.status[st.phase],
    current: st.current ? sadeSatiPeriodView(st.current.index, ctx) : null,
    nextText: nextPeriod ? fill(s.nextStarts, { date: sadeDate(nextPeriod.start, "before", ctx) }) : s.noNext,
    saturnText: fill(s.saturnNow, { sign: signName(st.saturn.sign, ctx.t), house: st.saturn.houseFromMoon }),
  };
}
