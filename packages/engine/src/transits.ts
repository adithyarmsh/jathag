// Transits and Sade Sati (FR-TRAN-01…04, D-099). Step 0.3.2.
//
// Calculations only, stable IDs only (D-063). All astronomy comes from Swiss Ephemeris through the
// same adapter, settings and planet function as the birth chart (D-069, D-071, D-009). What this file
// adds is a SEARCH over the library's output (D-007): it never models planetary motion itself.
//
// 1. Positions "now": the 9 grahas at `asOf` (the same moment the dashas use; passed in, the engine
//    never reads the clock), with whole-sign houses from the natal Moon's sign and the natal Lagna's sign.
//
// 2. Sign changes (crossings of a multiple of 30°) for Saturn, Jupiter and Rahu (Ketu = Rahu + 180°,
//    so its crossings are the same moments into the opposite signs).
//    HOW THE SEARCH WORKS:
//      - Sample the planet's longitude and speed every STEP_DAYS (5 days) on whole UTC seconds.
//      - Where the speed changes sign between two samples, the planet stationed in between: find that
//        moment by bisection on the speed (to 1 second). This splits the time into pieces in which the
//        planet moves in one direction only.
//      - Inside a one-direction piece the planet moves less than 30° (at most ~1.3° in 5 days), so it
//        crosses at most one boundary, and it does so exactly when the sign at the two ends differs.
//        That crossing is narrowed down by bisection to the whole second: the reported moment is the
//        FIRST whole UTC second at which Swiss Ephemeris puts the planet in the new sign.
//    WHY NO CROSSING CAN BE MISSED: a crossing could only hide if the planet went over a boundary and
//    back between two samples, i.e. stationed twice inside 5 days. Saturn's and Jupiter's stations are
//    always more than 100 days apart (retrograde lasts ~4–5 months, direct ~8–9 months; the test checks
//    the shortest gap over 1800–2399), and the mean node never stations (its speed is always about
//    −0.053°/day). Two crossings of one boundary close to a station are both caught, because the station
//    itself is found and each side is checked.
//    KINDS (relative to the planet's normal direction: forward for Saturn and Jupiter, backward for the
//    nodes): "enters" = a normal-direction step into a sign further on than the planet has been;
//    "moves-back" = a step against the normal direction; "enters-again" = a normal-direction step into a
//    sign it had stepped back out of. Every search starts LABEL_PAD_DAYS (1 year) before the first
//    crossing it reports, so a retrograde dip in progress (always shorter than ~5 months) is known.
//    WINDOW (FR-TRAN-03): from the planet's most recent "enters" at or before asOf up to asOf, plus every
//    crossing in the 10 calendar years after asOf.
//
// 3. Sade Sati, Moon sign M = the natal Moon's sidereal sign: Saturn in sign M−1 (12th from the Moon) =
//    rising, M = peak, M+1 (2nd) = setting.
//    THE MERGING RULE: the stretches of time Saturn spends in those three signs are joined into one period
//    when the gap between them (Saturn outside all three signs) is shorter than 10 years of 365.25 days.
//    Real gaps are either retrograde dips (under a year) or the time to Saturn's next return (about 22
//    years), so any threshold from 1 to 20 years gives the same periods.
//    A period starts at its first stretch's start (Saturn's first entry into M−1) and ends at its last
//    stretch's end (Saturn's final exit from M+1). Phases: rising from the period start; peak from
//    Saturn's first entry into M inside the period; setting from its first entry into M+1; each phase ends
//    where the next starts; setting ends at the period end. Every Saturn crossing inside the period is
//    listed with it (so the dips show).
//    SPAN: every period that overlaps [birth, birth + 120 calendar years]; a period already running at
//    birth keeps its true start (marked startedBeforeBirth).
//    BEFORE THE DATA: the ephemeris files start at 1800-01-01 01:08:07 UTC (D-091). If Saturn is already
//    in one of the three signs there, that period's true start cannot be known: start = null,
//    startOutsideData = true, and the start of the phase Saturn is in at that moment (and of any earlier
//    phase) is also null. (At 1800-01-01 Saturn was at ~17°44′ of Cancer, retrograde, 13° from the next
//    sign, so no later phase can have begun before the data either.) The same is done at the far end
//    (end = null, endOutsideData), which the API cannot reach (births end in 2100, data in 2400).
//
// Saturn's crossings are searched once per chart and used for both 2 and 3.

import { getDefaultAdapter, siderealGrahas, type Chart } from './chart.ts';
import type { EphemerisAdapter, EphemerisBody } from './ephemeris/types.ts';
import { GRAHAS, type GrahaCode, type Sign } from './ids.ts';
import { utcParts } from './time.ts';
import { houseOf, normalizeDegrees, placement, toArcsec, type ZodiacPlacement } from './zodiac.ts';

// ---------------------------------------------------------------- constants

const SEC = 1000;
const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

/** Sampling step of the crossing search (see the header for why it is safe). */
export const STEP_DAYS = 5;
const STEP_MS = STEP_DAYS * DAY_MS;
/** Extra search before the first reported crossing, so "enters" / "enters-again" labels are right. */
const LABEL_PAD_DAYS = 366;
/** Sade Sati stretches closer than this are one period. */
export const SADE_SATI_JOIN_GAP_YEARS = 10;
/** Years after asOf for the sign-change lists (FR-TRAN-03). */
export const SIGN_CHANGE_YEARS_AHEAD = 10;
/** Sade Sati span: birth to this many years after birth (D-099 item 5). */
export const SADE_SATI_SPAN_YEARS = 120;

/**
 * The range the search may use. Start = the first whole UTC second the pinned Swiss Ephemeris files
 * cover (measured; tested; D-091). End = a safe limit a little before the files run out (around
 * 10 January 2400; answers in the last days are unreliable to probe). Nothing the API asks for comes
 * near it: the latest date needed is about 2231 (a 2100 birth + 120 years + one Sade Sati).
 */
export const EPHEMERIS_DATA_START = '1800-01-01T01:08:07Z';
export const EPHEMERIS_DATA_END = '2399-12-01T00:00:00Z';
const DATA_START_MS = Date.parse(EPHEMERIS_DATA_START);
const DATA_END_MS = Date.parse(EPHEMERIS_DATA_END);

/** How far back the most recent "enters" can be (longest stay in one sign + margin). */
const LOOKBACK_YEARS: Record<SearchBody, number> = { Sa: 4, Ju: 2, Ra: 2 };

/** Normal direction of motion: +1 forward through the zodiac, −1 backward (the nodes). */
const NORMAL_DIRECTION: Record<SearchBody, 1 | -1> = { Sa: 1, Ju: 1, Ra: -1 };

// ---------------------------------------------------------------- types

/** The bodies whose sign changes are searched directly (Ketu is derived from Rahu). */
export type SearchBody = Extract<EphemerisBody, 'Sa' | 'Ju' | 'Ra'>;
export type SignChangePlanet = SearchBody | 'Ke';
export type CrossingKind = 'enters' | 'moves-back' | 'enters-again';
export type SadeSatiPhase = 'rising' | 'peak' | 'setting';

export interface SignCrossing {
  planet: SignChangePlanet;
  /** First whole UTC second at which Swiss Ephemeris puts the planet in `toSign`, ISO 8601. */
  utc: string;
  fromSign: Sign;
  toSign: Sign;
  kind: CrossingKind;
}

export interface TransitPosition extends ZodiacPlacement {
  /** Degrees/day. */
  speed: number;
  /** Speed < 0 (the mean node always is). */
  retrograde: boolean;
  /** Whole-sign house counted from the natal Moon's sign (gochara), 1–12. */
  houseFromMoon: number;
  /** Whole-sign house counted from the natal Lagna's sign, 1–12. */
  houseFromLagna: number;
}

export interface SadeSatiCrossing extends SignCrossing {
  /** Houses from the natal Moon sign: 12 = rising sign, 1 = peak sign, 2 = setting sign. */
  fromHouse: number;
  toHouse: number;
}

export interface PhaseDates {
  /** null = before the ephemeris data begins (or not reached before it ends). */
  start: string | null;
  end: string | null;
}

export interface SadeSatiPeriod {
  /** Saturn's first entry into the 12th from the Moon sign; null if before the ephemeris data begins. */
  start: string | null;
  /** Saturn's final exit from the 2nd from the Moon sign; null if after the ephemeris data ends. */
  end: string | null;
  /** The period began before birth (always true when start is null). */
  startedBeforeBirth: boolean;
  startOutsideData: boolean;
  endOutsideData: boolean;
  phases: Record<SadeSatiPhase, PhaseDates>;
  /** Every Saturn sign change from the start to the end (inclusive), in time order. */
  crossings: SadeSatiCrossing[];
}

export interface SadeSatiRef {
  /** Index into `periods`. */
  index: number;
  start: string | null;
  end: string | null;
  phases: Record<SadeSatiPhase, PhaseDates>;
}

export interface SadeSatiStatus {
  asOf: string;
  /** The phase at asOf by the phase rules (a retrograde dip does not change the phase). */
  phase: 'none' | SadeSatiPhase;
  /** The period running at asOf (start ≤ asOf < end), or null. */
  current: SadeSatiRef | null;
  /** The next period to start after asOf, or null if none is left in the span. */
  next: SadeSatiRef | null;
  /** Where Saturn actually is at asOf. */
  saturn: { sign: Sign; houseFromMoon: number };
}

export interface SadeSati {
  /** Natal Moon's sidereal sign. */
  moonSign: Sign;
  /** The 12th, 1st and 2nd signs from the Moon sign. */
  signs: Record<SadeSatiPhase, Sign>;
  /** Birth to 120 calendar years after birth. */
  span: { start: string; end: string };
  periods: SadeSatiPeriod[];
  status: SadeSatiStatus;
}

export interface Transits {
  /** The moment "now" (ISO 8601 UTC, milliseconds), the same as the dashas' asOf. */
  asOf: string;
  natal: { moonSign: Sign; lagnaSign: Sign };
  positions: Record<GrahaCode, TransitPosition>;
  /** FR-TRAN-03 windows, per planet, in time order. */
  signChanges: Record<SignChangePlanet, SignCrossing[]>;
  sadeSati: SadeSati;
}

export class TransitInputError extends Error {
  readonly code = 'INVALID_TRANSIT_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'TransitInputError';
  }
}

// ---------------------------------------------------------------- small helpers

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

function parseUtc(what: string, iso: string): number {
  const ms = typeof iso === 'string' && ISO_UTC.test(iso) ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) throw new TransitInputError(`${what} must be an ISO 8601 UTC time ending in "Z".`);
  return ms;
}

const isoSeconds = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/** Same arithmetic as placement().sign. */
function signOf(lon: number): Sign {
  return (Math.floor(toArcsec(lon) / 108_000) + 1) as Sign;
}

/** Add whole calendar years in UTC (29 Feb → 1 Mar in a common year). */
function addYears(ms: number, years: number): number {
  const d = new Date(ms);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.getTime();
}

/** Julian day (UT) for an instant, through the adapter, the same way the chart gets it. */
function jdAt(eph: EphemerisAdapter, ms: number): number {
  const d = new Date(ms);
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + (d.getUTCSeconds() + d.getUTCMilliseconds() / 1e3) / 3600;
  return eph.julianDayUt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hours);
}

const floorSec = (ms: number) => Math.floor(ms / SEC) * SEC;
const ceilSec = (ms: number) => Math.ceil(ms / SEC) * SEC;

// ---------------------------------------------------------------- the crossing search

/** A raw crossing before labelling: time (ms, whole second), from and to sign. */
interface RawCrossing {
  ms: number;
  from: Sign;
  to: Sign;
}

/** All crossings of `body` in (startMs, endMs], in time order, unlabelled. Exported for tests. */
export function rawCrossings(eph: EphemerisAdapter, body: SearchBody, startMs: number, endMs: number): RawCrossing[] {
  const a0 = ceilSec(Math.max(startMs, DATA_START_MS));
  const b0 = floorSec(Math.min(endMs, DATA_END_MS));
  const at = (ms: number) => eph.siderealBody(jdAt(eph, ms), body);
  const out: RawCrossing[] = [];

  /** One-direction piece [a, b] (whole seconds): at most one crossing, iff the end signs differ. */
  const piece = (a: number, sa: Sign, b: number, sb: Sign) => {
    if (sa === sb) return;
    let lo = a;
    let hi = b;
    while (hi - lo > SEC) {
      const mid = floorSec((lo + hi) / 2);
      if (signOf(at(mid).lon) === sa) lo = mid;
      else hi = mid;
    }
    out.push({ ms: hi, from: sa, to: sb });
  };

  let t = a0;
  let p = at(t);
  while (t < b0) {
    const u = Math.min(t + STEP_MS, b0);
    const q = at(u);
    const st = signOf(p.lon);
    const su = signOf(q.lon);
    if (Math.sign(p.speed) === Math.sign(q.speed)) {
      piece(t, st, u, su);
    } else {
      // A station between t and u: find it (to the second) by bisection on the speed's sign.
      const s0 = Math.sign(p.speed);
      let lo = t;
      let hi = u;
      while (hi - lo > SEC) {
        const mid = floorSec((lo + hi) / 2);
        if (Math.sign(at(mid).speed) === s0) lo = mid;
        else hi = mid;
      }
      const ss = signOf(at(lo).lon);
      piece(t, st, lo, ss);
      piece(lo, ss, u, su);
    }
    t = u;
    p = q;
  }
  return out;
}

/** Label crossings (enters / moves-back / enters-again) relative to the normal direction. */
function label(planet: SearchBody, raw: RawCrossing[]): (RawCrossing & { kind: CrossingKind })[] {
  const normal = NORMAL_DIRECTION[planet];
  let progress = 0; // signs moved in the normal direction since the search start
  let frontier = 0; // furthest progress reached
  return raw.map((c) => {
    const forward = c.to === ((c.from % 12) + 1) ? 1 : -1;
    progress += forward * normal;
    let kind: CrossingKind;
    if (forward * normal < 0) kind = 'moves-back';
    else if (progress > frontier) {
      kind = 'enters';
      frontier = progress;
    } else kind = 'enters-again';
    return { ...c, kind };
  });
}

/** A labelled crossing search, with Saturn's or Jupiter's or Rahu's sign at the search start. */
export interface CrossingTimeline {
  planet: SearchBody;
  /** Searched from (whole second, after the label pad) to. */
  fromMs: number;
  toMs: number;
  /** Sign at fromMs. */
  signAtStart: Sign;
  crossings: (RawCrossing & { kind: CrossingKind })[];
}

/** Search and label crossings in [fromMs, toMs]; labels are reliable from fromMs on. Exported for tests. */
export function crossingTimeline(eph: EphemerisAdapter, planet: SearchBody, fromMs: number, toMs: number): CrossingTimeline {
  const from = ceilSec(Math.max(fromMs, DATA_START_MS));
  const to = floorSec(Math.min(toMs, DATA_END_MS));
  const all = label(planet, rawCrossings(eph, planet, from - LABEL_PAD_DAYS * DAY_MS, to));
  return {
    planet,
    fromMs: from,
    toMs: to,
    signAtStart: signOf(eph.siderealBody(jdAt(eph, from), planet).lon),
    crossings: all.filter((c) => c.ms > from),
  };
}

const toCrossing = (planet: SignChangePlanet, c: RawCrossing & { kind: CrossingKind }): SignCrossing => ({
  planet,
  utc: isoSeconds(c.ms),
  fromSign: c.from,
  toSign: c.to,
  kind: c.kind,
});

/** Ketu: Rahu's crossings at the same moments, into the opposite signs. */
const opposite = (s: Sign) => ((((s - 1 + 6) % 12) + 1) as Sign);
function ketuOf(rahu: SignCrossing[]): SignCrossing[] {
  return rahu.map((c) => ({ ...c, planet: 'Ke', fromSign: opposite(c.fromSign), toSign: opposite(c.toSign) }));
}

/** FR-TRAN-03 window: from the most recent "enters" at or before asOf, plus 10 years after asOf. */
function signChangeWindow(timeline: CrossingTimeline, asOfMs: number): SignCrossing[] {
  const cs = timeline.crossings;
  let first = -1;
  for (let i = 0; i < cs.length && cs[i].ms <= asOfMs; i++) if (cs[i].kind === 'enters') first = i;
  if (first < 0) {
    // Cannot happen with LOOKBACK_YEARS unless asOf is at the very start of the data.
    first = cs.findIndex((c) => c.ms > asOfMs);
    if (first < 0) return [];
  }
  const endMs = addYears(asOfMs, SIGN_CHANGE_YEARS_AHEAD);
  return cs.slice(first).filter((c) => c.ms <= endMs).map((c) => toCrossing(timeline.planet, c));
}

// ---------------------------------------------------------------- Sade Sati

const PHASES: readonly SadeSatiPhase[] = ['rising', 'peak', 'setting'];

/** Phase starts as numbers (−Infinity = before the data, +Infinity = never reached), per period. */
const PHASE_STARTS = new WeakMap<SadeSatiPeriod, Record<SadeSatiPhase, number>>();

/**
 * Sade Sati periods for a Moon sign from a Saturn crossing timeline. The timeline must cover at least
 * [birth − 11 years, birth + 131 years] (or start at the beginning of the data) so that every period
 * overlapping the span is complete. Exported for tests.
 */
export function sadeSatiPeriods(moonSign: Sign, saturn: CrossingTimeline, birthMs: number): { signs: Record<SadeSatiPhase, Sign>; spanEndMs: number; periods: SadeSatiPeriod[] } {
  const rel = (s: Sign) => houseOf(s, moonSign); // 12 / 1 / 2 for the three signs
  const signs = {
    rising: ((((moonSign - 2 + 12) % 12) + 1) as Sign),
    peak: moonSign,
    setting: (((moonSign % 12) + 1) as Sign),
  };
  const inSet = (s: Sign) => s === signs.rising || s === signs.peak || s === signs.setting;
  const spanEndMs = addYears(birthMs, SADE_SATI_SPAN_YEARS);
  const joinMs = SADE_SATI_JOIN_GAP_YEARS * YEAR_MS;

  // Stretches of Saturn in the three signs: [start, end) with start/end = null at the data edges.
  type Stretch = { s: number | null; e: number | null; sAtStart: Sign | null };
  const stretches: Stretch[] = [];
  let cur: Stretch | null = null;
  const dataStartReached = saturn.fromMs <= DATA_START_MS;
  const dataEndReached = saturn.toMs >= floorSec(DATA_END_MS);
  if (inSet(saturn.signAtStart)) cur = { s: dataStartReached ? null : saturn.fromMs, e: null, sAtStart: dataStartReached ? saturn.signAtStart : null };
  for (const c of saturn.crossings) {
    const wasIn = inSet(c.from);
    const nowIn = inSet(c.to);
    if (!wasIn && nowIn) cur = { s: c.ms, e: null, sAtStart: null };
    else if (wasIn && !nowIn && cur) {
      cur.e = c.ms;
      stretches.push(cur);
      cur = null;
    }
  }
  if (cur) {
    cur.e = dataEndReached ? null : saturn.toMs;
    stretches.push(cur);
  }

  // Join stretches separated by less than the join gap.
  const groups: Stretch[][] = [];
  for (const st of stretches) {
    const last = groups.at(-1);
    const prevEnd = last?.at(-1)?.e;
    if (last && prevEnd != null && st.s != null && st.s - prevEnd < joinMs) last.push(st);
    else groups.push([st]);
  }

  const periods: SadeSatiPeriod[] = [];
  for (const g of groups) {
    const startMs = g[0].s;
    const endMs = g.at(-1)!.e;
    // Overlaps [birth, span end]?
    if (endMs != null && endMs <= birthMs) continue;
    if (startMs != null && startMs > spanEndMs) continue;
    // Only report periods the search fully covers at the start (a stretch cut by the search window,
    // not by the data, would have no true start; the window is chosen so this never overlaps the span).
    if (startMs != null && startMs <= saturn.fromMs && !dataStartReached) continue;

    const inside = saturn.crossings.filter((c) => (startMs == null || c.ms >= startMs) && (endMs == null || c.ms <= endMs));
    const firstInto = (s: Sign) => inside.find((c) => c.to === s)?.ms ?? null;
    const starts: Record<SadeSatiPhase, number | null> = { rising: startMs, peak: firstInto(signs.peak), setting: firstInto(signs.setting) };
    if (startMs == null) {
      // Saturn was already inside at the data start: its phase there and any earlier phase are unknown.
      const p = PHASES.indexOf(g[0].sAtStart === signs.rising ? 'rising' : g[0].sAtStart === signs.peak ? 'peak' : 'setting');
      for (let i = 0; i <= p; i++) starts[PHASES[i]] = null;
    }
    const numeric = { rising: starts.rising ?? -Infinity, peak: starts.peak ?? Infinity, setting: starts.setting ?? Infinity };
    if (startMs == null) {
      const p = PHASES.indexOf(g[0].sAtStart === signs.rising ? 'rising' : g[0].sAtStart === signs.peak ? 'peak' : 'setting');
      for (let i = 0; i <= p; i++) numeric[PHASES[i]] = -Infinity;
    }
    const iso = (ms: number | null) => (ms == null ? null : isoSeconds(ms));
    const phases = {
      rising: { start: iso(starts.rising), end: iso(starts.peak) },
      peak: { start: iso(starts.peak), end: iso(starts.setting) },
      setting: { start: iso(starts.setting), end: iso(endMs) },
    };
    const period: SadeSatiPeriod = {
      start: iso(startMs),
      end: iso(endMs),
      startedBeforeBirth: startMs == null || startMs < birthMs,
      startOutsideData: startMs == null,
      endOutsideData: endMs == null,
      phases,
      crossings: inside.map((c) => ({ ...toCrossing('Sa', c), fromHouse: rel(c.from), toHouse: rel(c.to) })),
    };
    PHASE_STARTS.set(period, numeric);
    periods.push(period);
  }
  return { signs, spanEndMs, periods };
}

function sadeSatiStatus(periods: SadeSatiPeriod[], asOfMs: number, saturnSign: Sign, moonSign: Sign): SadeSatiStatus {
  const ms = (iso: string | null, ifNull: number) => (iso == null ? ifNull : Date.parse(iso));
  const ref = (i: number): SadeSatiRef => ({ index: i, start: periods[i].start, end: periods[i].end, phases: periods[i].phases });
  const ci = periods.findIndex((p) => ms(p.start, -Infinity) <= asOfMs && asOfMs < ms(p.end, Infinity));
  const ni = periods.findIndex((p) => ms(p.start, -Infinity) > asOfMs);
  let phase: SadeSatiStatus['phase'] = 'none';
  if (ci >= 0) {
    // The last phase that has started by asOf. An unknown start (null) before the data counts as
    // started; a phase not reached before the data ends counts as not started.
    const starts = PHASE_STARTS.get(periods[ci]);
    for (const ph of PHASES) if ((starts?.[ph] ?? Infinity) <= asOfMs) phase = ph;
  }
  return {
    asOf: new Date(asOfMs).toISOString(),
    phase,
    current: ci >= 0 ? ref(ci) : null,
    next: ni >= 0 ? ref(ni) : null,
    saturn: { sign: saturnSign, houseFromMoon: houseOf(saturnSign, moonSign) },
  };
}

/** Saturn timeline covering both the Sade Sati span and the sign-change window. */
function saturnRange(birthMs: number, asOfMs: number): [number, number] {
  return [
    Math.min(addYears(birthMs, -11), addYears(asOfMs, -LOOKBACK_YEARS.Sa)),
    Math.max(addYears(birthMs, SADE_SATI_SPAN_YEARS + 11), addYears(asOfMs, SIGN_CHANGE_YEARS_AHEAD) + DAY_MS),
  ];
}

/**
 * Sade Sati for any Moon sign and birth instant (used by transitsForChart; also handy for tests with
 * hand-made Moon signs). `saturn` may be passed to reuse an existing search that covers the range.
 */
export function calculateSadeSati(input: { moonSign: Sign; birthUtc: string; asOf: string; ephemeris?: EphemerisAdapter; saturn?: CrossingTimeline }): SadeSati {
  const eph = input.ephemeris ?? getDefaultAdapter();
  const birthMs = parseUtc('Birth time', input.birthUtc);
  const asOfMs = parseUtc('asOf', input.asOf);
  if (!Number.isInteger(input.moonSign) || input.moonSign < 1 || input.moonSign > 12) throw new TransitInputError('Moon sign must be 1–12.');
  const saturn = input.saturn ?? crossingTimeline(eph, 'Sa', ...saturnRange(birthMs, asOfMs));
  const { signs, spanEndMs, periods } = sadeSatiPeriods(input.moonSign, saturn, birthMs);
  const saturnSign = signOf(eph.siderealBody(jdAt(eph, asOfMs), 'Sa').lon);
  return {
    moonSign: input.moonSign,
    signs,
    span: { start: isoSeconds(floorSec(birthMs)), end: isoSeconds(floorSec(spanEndMs)) },
    periods,
    status: sadeSatiStatus(periods, asOfMs, saturnSign, input.moonSign),
  };
}

// ---------------------------------------------------------------- everything for one chart

/**
 * Transits "now", sign changes and Sade Sati for a calculated chart. `asOf` is always passed in (the
 * engine never reads the clock), so the same chart + asOf + engine version gives identical output.
 */
export function transitsForChart(chart: Chart, options: { asOf: string; ephemeris?: EphemerisAdapter }): Transits {
  const eph = options.ephemeris ?? getDefaultAdapter();
  const asOfMs = parseUtc('asOf', options.asOf);
  const birthMs = parseUtc('Birth time', chart.meta.input.utc);
  const moonSign = chart.bodies.Mo.sign;
  const lagnaSign = chart.bodies.La.sign;

  // 1. Positions now, exactly like the natal planets (same function, same JD conversion).
  const t = utcParts(new Date(asOfMs).toISOString());
  const raw = siderealGrahas(eph, eph.julianDayUt(t.year, t.month, t.day, t.hours));
  const positions = {} as Record<GrahaCode, TransitPosition>;
  for (const g of GRAHAS) {
    const { lon, speed } = raw[g];
    const p = placement(normalizeDegrees(lon));
    positions[g] = { ...p, speed, retrograde: speed < 0, houseFromMoon: houseOf(p.sign, moonSign), houseFromLagna: houseOf(p.sign, lagnaSign) };
  }

  // 2. Sign changes. Saturn's search also covers the Sade Sati span (reused below).
  const aheadMs = addYears(asOfMs, SIGN_CHANGE_YEARS_AHEAD) + DAY_MS;
  const saturn = crossingTimeline(eph, 'Sa', ...saturnRange(birthMs, asOfMs));
  const jupiter = crossingTimeline(eph, 'Ju', addYears(asOfMs, -LOOKBACK_YEARS.Ju), aheadMs);
  const rahu = crossingTimeline(eph, 'Ra', addYears(asOfMs, -LOOKBACK_YEARS.Ra), aheadMs);
  const ra = signChangeWindow(rahu, asOfMs);

  // 3. Sade Sati.
  const { signs, spanEndMs, periods } = sadeSatiPeriods(moonSign, saturn, birthMs);

  return {
    asOf: new Date(asOfMs).toISOString(),
    natal: { moonSign, lagnaSign },
    positions,
    signChanges: { Sa: signChangeWindow(saturn, asOfMs), Ju: signChangeWindow(jupiter, asOfMs), Ra: ra, Ke: ketuOf(ra) },
    sadeSati: {
      moonSign,
      signs,
      span: { start: isoSeconds(floorSec(birthMs)), end: isoSeconds(floorSec(spanEndMs)) },
      periods,
      status: sadeSatiStatus(periods, asOfMs, positions.Sa.sign, moonSign),
    },
  };
}
