// Vimshottari dasha (FR-TIME-01…05, D-011, D-015, D-026, D-027, D-070, D-096).
//
// This is fixed arithmetic on the engine's own Swiss Ephemeris Moon longitude, not an astronomy
// calculation (CLAUDE.md rule 4 holds: the only astronomical input is the Moon from the adapter).
//
// THE RULE (Brihat Parashara Hora Shastra, "Vimshottari dasha" chapter; the standard rule, and what
// JHora calls "Vimshottari from the Moon, seed Krittika, antardashas start from the dasha lord", D-070):
//
//   Order and years:  Ke 7 · Ve 20 · Su 6 · Mo 10 · Ma 7 · Ra 18 · Ju 16 · Sa 19 · Me 17  (= 120 years)
//   Nakshatra lords:  the same order from Ashwini (1 = Ke, 2 = Ve, … 9 = Me, 10 = Ke, … 27 = Me).
//   First mahadasha:  the lord of the Moon's nakshatra at birth.
//   Balance at birth: (fraction of that nakshatra the Moon has NOT yet travelled) × that lord's years.
//                     So the mahadasha running at birth truly began before birth, at
//                     birth − (fraction travelled) × lord's years; the timeline starts there (D-096 item 4).
//   Antardashas:      inside each mahadasha, the same order starting from the mahadasha lord;
//                     each lasts maha years × antar years / 120.
//   Pratyantardashas: inside each antardasha, the same order starting from the antardasha lord;
//                     each lasts antar length × pratyantar years / 120.
//   Year:             the dashaYear setting (365.25 days by default, D-011).
//
// NO ROUNDING BUILD-UP: every boundary is placed from the cycle start with an exact whole number of
// 1/14 400 dasha years:
//     N = 14 400 × (maha years before) + 120 × maha years × (antar years before) + maha years × antar years × (pratyantar years before)
//     boundary = cycle start + N × (year / 14 400)
// N is an exact integer (at most 1 728 000), so nothing is added up period by period. Each boundary is
// then rounded ONCE to the nearest whole second (halves go to the later second). Because the end of one
// period and the start of the next are the same N, they are the same timestamp, and children fill their
// parent exactly. Whole seconds: the Moon itself is only known to ~0.1″, which is ~1 minute of dasha time.

import type { Chart } from './chart.ts';
import { NAKSHATRA_LORD_CYCLE, type GrahaCode } from './ids.ts';
import { DASHA_YEAR_DAYS, type DashaYearSetting } from './settings.ts';

/** Vimshottari years per lord (BPHS). */
export const VIMSHOTTARI_YEARS: Readonly<Record<GrahaCode, number>> = Object.freeze({
  Ke: 7, Ve: 20, Su: 6, Mo: 10, Ma: 7, Ra: 18, Ju: 16, Sa: 19, Me: 17,
});

/** The dasha order (= nakshatra lords from Ashwini). */
export const VIMSHOTTARI_ORDER: readonly GrahaCode[] = NAKSHATRA_LORD_CYCLE;

const CYCLE_YEARS = 120;
const UNITS_PER_YEAR = CYCLE_YEARS * CYCLE_YEARS; // 14 400: one unit = 1/14 400 dasha year
const NAKSHATRA_ARCSEC = 48_000; // 13°20′
const DAY_MS = 86_400_000;

export interface DashaPeriod {
  lord: GrahaCode;
  /** Start, ISO 8601 UTC, whole seconds, e.g. "1986-10-10T23:28:04Z". */
  start: string;
  /** End = the next period's start. */
  end: string;
  /** The whole period was over before birth (end ≤ birth). */
  endedBeforeBirth: boolean;
  /** Birth falls inside this period (start ≤ birth < end). Exactly one per level. */
  containsBirth: boolean;
}

export interface Antardasha extends DashaPeriod {
  pratyantardashas: DashaPeriod[];
}

export interface Mahadasha extends DashaPeriod {
  antardashas: Antardasha[];
}

export interface VimshottariTimeline {
  system: 'vimshottari';
  dashaYear: DashaYearSetting;
  /** Birth instant the timeline was calculated for (ISO 8601 UTC, as given). */
  birthUtc: string;
  /** The Moon's sidereal longitude used, degrees. */
  moonLon: number;
  /** The Moon's nakshatra at birth, 1–27. */
  moonNakshatra: number;
  /** Fraction of that nakshatra the Moon had already travelled at birth, 0 ≤ x < 1. */
  fractionTravelled: number;
  /** Dasha years of the first mahadasha still to run at birth = (1 − fractionTravelled) × its years. */
  balanceYears: number;
  /** True start of the first mahadasha (before birth) and end of the 120-year cycle. */
  start: string;
  end: string;
  /** 9 mahadashas, each with 9 antardashas, each with 9 pratyantardashas. */
  mahadashas: Mahadasha[];
}

export class DashaInputError extends Error {
  readonly code = 'INVALID_DASHA_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'DashaInputError';
  }
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

function parseUtc(what: string, iso: string): number {
  const ms = typeof iso === 'string' && ISO_UTC.test(iso) ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) throw new DashaInputError(`${what} must be an ISO 8601 UTC time ending in "Z".`);
  return ms;
}

/** Whole-second ISO string, e.g. "1986-10-10T23:28:04Z". */
const isoSeconds = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/** Lords in Vimshottari order starting from `first`. */
function orderFrom(first: GrahaCode): GrahaCode[] {
  const i = VIMSHOTTARI_ORDER.indexOf(first);
  return [...VIMSHOTTARI_ORDER.slice(i), ...VIMSHOTTARI_ORDER.slice(0, i)];
}

/**
 * The full Vimshottari timeline (3 levels) from the Moon's sidereal longitude and the birth instant.
 * Pure arithmetic; does not read the clock.
 */
export function vimshottariTimeline(input: { moonLon: number; birthUtc: string; dashaYear: DashaYearSetting }): VimshottariTimeline {
  const { moonLon, birthUtc, dashaYear } = input;
  if (!Number.isFinite(moonLon)) throw new DashaInputError('Moon longitude must be a number.');
  const yearDays = DASHA_YEAR_DAYS[dashaYear];
  if (yearDays === undefined) throw new DashaInputError('Unknown dasha year setting.');
  const birthMs = parseUtc('Birth time', birthUtc);

  // Moon position inside its nakshatra, in arcseconds (same arithmetic as zodiac.ts).
  const arcsec = (((moonLon % 360) + 360) % 360) * 3600;
  const index = Math.min(26, Math.floor(arcsec / NAKSHATRA_ARCSEC)); // 0–26
  const fractionTravelled = (arcsec - index * NAKSHATRA_ARCSEC) / NAKSHATRA_ARCSEC;
  const firstLord = VIMSHOTTARI_ORDER[index % 9];
  const firstYears = VIMSHOTTARI_YEARS[firstLord];

  const yearMs = yearDays * DAY_MS;
  const unitMs = yearMs / UNITS_PER_YEAR;
  const cycleStartMs = birthMs - fractionTravelled * firstYears * yearMs;
  const at = (n: number) => Math.round((cycleStartMs + n * unitMs) / 1000) * 1000;

  const period = (lord: GrahaCode, n0: number, n1: number): DashaPeriod => {
    const s = at(n0);
    const e = at(n1);
    return { lord, start: isoSeconds(s), end: isoSeconds(e), endedBeforeBirth: e <= birthMs, containsBirth: s <= birthMs && birthMs < e };
  };

  const mahadashas: Mahadasha[] = [];
  let mahaBefore = 0; // maha years before this mahadasha
  for (const maha of orderFrom(firstLord)) {
    const my = VIMSHOTTARI_YEARS[maha];
    const mahaN = UNITS_PER_YEAR * mahaBefore;
    const antardashas: Antardasha[] = [];
    let antarBefore = 0;
    for (const antar of orderFrom(maha)) {
      const ay = VIMSHOTTARI_YEARS[antar];
      const antarN = mahaN + CYCLE_YEARS * my * antarBefore;
      const pratyantardashas: DashaPeriod[] = [];
      let pratBefore = 0;
      for (const prat of orderFrom(antar)) {
        const py = VIMSHOTTARI_YEARS[prat];
        pratyantardashas.push(period(prat, antarN + my * ay * pratBefore, antarN + my * ay * (pratBefore + py)));
        pratBefore += py;
      }
      antardashas.push({ ...period(antar, antarN, mahaN + CYCLE_YEARS * my * (antarBefore + ay)), pratyantardashas });
      antarBefore += ay;
    }
    mahadashas.push({ ...period(maha, mahaN, UNITS_PER_YEAR * (mahaBefore + my)), antardashas });
    mahaBefore += my;
  }

  return {
    system: 'vimshottari',
    dashaYear,
    birthUtc,
    moonLon,
    moonNakshatra: index + 1,
    fractionTravelled,
    balanceYears: (1 - fractionTravelled) * firstYears,
    start: isoSeconds(at(0)),
    end: isoSeconds(at(UNITS_PER_YEAR * CYCLE_YEARS)),
    mahadashas,
  };
}

// ---------------------------------------------------------------- current period and coming up

export interface DashaRef {
  /** Position in the timeline: [mahadasha] / [mahadasha, antardasha] / [mahadasha, antardasha, pratyantardasha] (0-based). */
  path: number[];
  lord: GrahaCode;
  start: string;
  end: string;
}

export interface DashaLevels<T> {
  mahadasha: T;
  antardasha: T;
  pratyantardasha: T;
}

export interface DashaNow {
  /** The instant asked about (ISO 8601 UTC, normalised to milliseconds). */
  asOf: string;
  /** The period running at asOf at each level; all null if asOf is before birth or at/after the timeline's end. */
  current: DashaLevels<DashaRef | null>;
  /** The next period to START after asOf at each level (null if none is left). Each level is independent. */
  next: DashaLevels<DashaRef | null>;
}

export type DashaLevel = keyof DashaLevels<unknown>;
export const DASHA_LEVELS: readonly DashaLevel[] = ['mahadasha', 'antardasha', 'pratyantardasha'];

/** Every period at one level (9 / 81 / 729), in time order, as references with their path in the timeline. */
export function dashaRefs(timeline: VimshottariTimeline, level: DashaLevel): DashaRef[] {
  if (!DASHA_LEVELS.includes(level)) throw new DashaInputError('Unknown dasha level.');
  const out: DashaRef[] = [];
  timeline.mahadashas.forEach((m, i) => {
    if (level === 'mahadasha') return void out.push({ path: [i], lord: m.lord, start: m.start, end: m.end });
    m.antardashas.forEach((a, j) => {
      if (level === 'antardasha') return void out.push({ path: [i, j], lord: a.lord, start: a.start, end: a.end });
      a.pratyantardashas.forEach((p, k) => out.push({ path: [i, j, k], lord: p.lord, start: p.start, end: p.end }));
    });
  });
  return out;
}

/**
 * Current period and coming up for a given instant. `asOf` is always passed in: the engine never
 * reads the system clock (NFR-DET-01). A period is current when start ≤ asOf < end.
 */
export function vimshottariNow(timeline: VimshottariTimeline, asOf: string): DashaNow {
  const t = parseUtc('asOf', asOf);
  const birthMs = Date.parse(timeline.birthUtc);

  const levels: DashaLevels<DashaRef[]> = {
    mahadasha: dashaRefs(timeline, 'mahadasha'),
    antardasha: dashaRefs(timeline, 'antardasha'),
    pratyantardasha: dashaRefs(timeline, 'pratyantardasha'),
  };

  const live = t >= birthMs;
  const pick = (list: DashaRef[]) => ({
    current: (live && list.find((p) => Date.parse(p.start) <= t && t < Date.parse(p.end))) || null,
    next: list.find((p) => Date.parse(p.start) > t) ?? null,
  });
  const m = pick(levels.mahadasha);
  const a = pick(levels.antardasha);
  const p = pick(levels.pratyantardasha);

  return {
    asOf: new Date(t).toISOString(),
    current: { mahadasha: m.current, antardasha: a.current, pratyantardasha: p.current },
    next: { mahadasha: m.next, antardasha: a.next, pratyantardasha: p.next },
  };
}

/** The Vimshottari timeline for a calculated chart: its own Moon, birth instant and dashaYear setting. */
export function vimshottariForChart(chart: Chart): VimshottariTimeline {
  return vimshottariTimeline({ moonLon: chart.bodies.Mo.lon, birthUtc: chart.meta.input.utc, dashaYear: chart.meta.settings.dashaYear });
}
