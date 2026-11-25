// Panchanga at birth (step 0.9.1, FR-CALC-11, D-053, D-123): tithi (with paksha), nakshatra, vara
// (weekday), yoga, karana, and the hora lord.
//
// Thin formulas around Swiss Ephemeris output (D-007): the only astronomy is the chart's own sidereal
// Sun and Moon (Lahiri, D-070/D-073) and the sunrise from the ephemeris adapter (CLAUDE.md rule 4).
// IDs only, no names (D-063): see ids.ts and tests/reference/scripts/ids.mjs.
//
// THE RULES (standard definitions; checked against JHora for all 29 reference births):
//   elongation e = (Moon − Sun) mod 360°.  sum s = (Sun + Moon) mod 360°.
//   tithi      = floor(e / 12°) + 1                    1–15 Shukla Pratipada … Purnima, 16–30 Krishna Pratipada … Amavasya
//   paksha     = 1 (Shukla) for tithi 1–15, 2 (Krishna) for tithi 16–30
//   yoga       = floor(s / 13°20′) + 1                 1 = Vishkambha … 27 = Vaidhriti
//   karana     = from the half-tithi h = floor(e / 6°) + 1 (1–60):
//                h = 1 → 11 (Kimstughna); h = 2…57 → ((h − 2) mod 7) + 1 (Bava … Vishti, repeating);
//                h = 58 → 8 (Shakuni), 59 → 9 (Chatushpada), 60 → 10 (Naga)
//   % left     = share of the current tithi (12°) or nakshatra (13°20′) still to go, 0–100
//   A value exactly on a boundary belongs to the NEW tithi / yoga / karana / nakshatra (start inclusive).
//   Worked in arcseconds, where every boundary is a whole number (as in zodiac.ts).
//
// VARA (weekday) IS SUNRISE-BASED, as in JHora (FR-CALC-11, D-123 item 3): the Vedic day runs from one
// sunrise to the next. Its weekday is the weekday of the date of the last sunrise at or before birth,
// that date taken on the clock offset at birth (D-098). In practice: the sunrise on the birth's own local
// date if it is at or before the birth, otherwise the sunrise of the local date before.
// Where that date has no sunrise (polar day or night) the weekday is the calendar weekday of the birth's
// local date, `weekdayFrom` says 'calendarDay', `sunrise` and `horaLord` are null. JHora gives no
// reference for that case (D-123 item 3).
//
// HORA: 24 equal horas of 60 minutes counted from the Vedic day's sunrise; the first belongs to the
// weekday's lord, then the lords follow the Chaldean order Su, Ve, Me, Mo, Sa, Ju, Ma, repeating.
// This is what matches JHora's answer key (settings HoraPreference=0) for all 29 reference births; the
// other common method (day and night each split into 12 equal parts) matches only 23 (step 0.9.1 report).
//
// Deterministic (NFR-DET-01): never reads the clock.

import type { Chart } from './chart.ts';
import { getDefaultAdapter } from './chart.ts';
import type { EphemerisAdapter } from './ephemeris/types.ts';
import { SEVEN_PLANETS, type PlanetCode } from './ids.ts';
import { ARCSEC_CIRCLE, toArcsec } from './zodiac.ts';

const ARCSEC_TITHI = 43_200; // 12°
const ARCSEC_HALF_TITHI = 21_600; // 6°
const ARCSEC_YOGA = 48_000; // 13°20′ (= one nakshatra)
const ARCSEC_NAKSHATRA = 48_000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const JD_UNIX_EPOCH = 2_440_587.5;

/** Weekday lords, index = weekday − 1 (1 = Sunday … 7 = Saturday). */
export const WEEKDAY_LORD: readonly PlanetCode[] = SEVEN_PLANETS; // Su Mo Ma Me Ju Ve Sa
/** Chaldean order of the hora lords. */
export const HORA_ORDER: readonly PlanetCode[] = ['Su', 'Ve', 'Me', 'Mo', 'Sa', 'Ju', 'Ma'];

/** Paksha IDs: 1 = Shukla (waxing, tithi 1–15), 2 = Krishna (waning, tithi 16–30). */
export type Paksha = 1 | 2;

/** The parts that come from the Sun and Moon longitudes alone. */
export interface LunarParts {
  /** 1–30. */
  tithi: number;
  paksha: Paksha;
  /** Share of the current tithi still to go, 0 < x ≤ 100. */
  tithiLeftPercent: number;
  /** The Moon's nakshatra, 1–27. */
  nakshatra: number;
  /** Share of the current nakshatra still to go, 0 < x ≤ 100. */
  nakshatraLeftPercent: number;
  /** 1–27. */
  yoga: number;
  /** 1–11 (see karanaForHalfTithi). */
  karana: number;
}

export interface Panchanga extends LunarParts {
  /** Vedic weekday, 1 = Sunday … 7 = Saturday. */
  weekday: number;
  /** 'sunrise' normally; 'calendarDay' where the Sun did not rise on that date (polar day or night). */
  weekdayFrom: 'sunrise' | 'calendarDay';
  /** The sunrise that started the Vedic day (ISO 8601 UTC, whole seconds); null for 'calendarDay'. */
  sunrise: string | null;
  /** Lord of the hora running at birth; null for 'calendarDay' (no sunrise to count from). */
  horaLord: PlanetCode | null;
}

export class PanchangaInputError extends Error {
  readonly code = 'INVALID_PANCHANGA_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'PanchangaInputError';
  }
}

/** Karana (1–11) for a half-tithi number h (1–60). */
export function karanaForHalfTithi(h: number): number {
  if (!Number.isInteger(h) || h < 1 || h > 60) throw new PanchangaInputError(`Half-tithi must be 1–60, got ${h}.`);
  if (h === 1) return 11; // Kimstughna
  if (h <= 57) return ((h - 2) % 7) + 1; // Bava … Vishti, eight rounds
  return h - 50; // 58 → 8 Shakuni, 59 → 9 Chatushpada, 60 → 10 Naga
}

/** Tithi, paksha, nakshatra, yoga, karana and the two "% left" values from sidereal Sun and Moon (degrees). */
export function lunarParts(sunLon: number, moonLon: number): LunarParts {
  const sun = toArcsec(sunLon);
  const moon = toArcsec(moonLon);
  const elong = (moon - sun + ARCSEC_CIRCLE) % ARCSEC_CIRCLE;
  const sum = (sun + moon) % ARCSEC_CIRCLE;

  const tithiIdx = Math.floor(elong / ARCSEC_TITHI);
  const nakIdx = Math.floor(moon / ARCSEC_NAKSHATRA);
  const tithi = tithiIdx + 1;
  return {
    tithi,
    paksha: tithi <= 15 ? 1 : 2,
    tithiLeftPercent: (100 * ((tithiIdx + 1) * ARCSEC_TITHI - elong)) / ARCSEC_TITHI,
    nakshatra: nakIdx + 1,
    nakshatraLeftPercent: (100 * ((nakIdx + 1) * ARCSEC_NAKSHATRA - moon)) / ARCSEC_NAKSHATRA,
    yoga: Math.floor(sum / ARCSEC_YOGA) + 1,
    karana: karanaForHalfTithi(Math.floor(elong / ARCSEC_HALF_TITHI) + 1),
  };
}

const jdToMs = (jd: number) => (jd - JD_UNIX_EPOCH) * DAY_MS;
const msToJd = (ms: number) => ms / DAY_MS + JD_UNIX_EPOCH;

/** The Vedic day of a birth moment: its weekday, the sunrise that started it, and where the weekday came from. */
export interface VedicDay {
  weekday: number;
  weekdayFrom: 'sunrise' | 'calendarDay';
  /** Sunrise in ms since 1970 (UTC), null for 'calendarDay'. */
  sunriseMs: number | null;
}

/**
 * The sunrise-based weekday (see the header). `birthMs` is the birth moment (ms since 1970, UTC),
 * `utcOffsetSeconds` the clock offset at birth, which decides the local date.
 */
export function vedicDay(eph: EphemerisAdapter, birthMs: number, lat: number, lng: number, utcOffsetSeconds: number): VedicDay {
  const offMs = utcOffsetSeconds * 1000;
  // Local midnight of the birth's own date, as a UTC instant.
  const localMidnight = Math.floor((birthMs + offMs) / DAY_MS) * DAY_MS - offMs;
  const weekdayOf = (midnight: number) => new Date(midnight + offMs).getUTCDay() + 1;

  /** The sunrise on the local date starting at `midnight`, or null if the Sun does not rise that date. */
  const sunriseOn = (midnight: number): number | null => {
    const jd = eph.nextSunEvent(msToJd(midnight), lat, lng, 'rise');
    if (jd === null) return null;
    const ms = jdToMs(jd);
    return ms < midnight + DAY_MS ? ms : null;
  };

  const calendar: VedicDay = { weekday: weekdayOf(localMidnight), weekdayFrom: 'calendarDay', sunriseMs: null };
  const today = sunriseOn(localMidnight);
  if (today === null) return calendar;
  if (today <= birthMs) return { weekday: weekdayOf(localMidnight), weekdayFrom: 'sunrise', sunriseMs: today };
  const yesterdayMidnight = localMidnight - DAY_MS;
  const yesterday = sunriseOn(yesterdayMidnight);
  if (yesterday === null) return calendar;
  return { weekday: weekdayOf(yesterdayMidnight), weekdayFrom: 'sunrise', sunriseMs: yesterday };
}

/** Lord of the hora running `msSinceSunrise` after the sunrise of a Vedic day with weekday `weekday`. */
export function horaLordAt(weekday: number, msSinceSunrise: number): PlanetCode {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) throw new PanchangaInputError(`Weekday must be 1–7, got ${weekday}.`);
  if (!Number.isFinite(msSinceSunrise) || msSinceSunrise < 0) throw new PanchangaInputError('The moment must be at or after the sunrise.');
  const hora = Math.floor(msSinceSunrise / HOUR_MS);
  return HORA_ORDER[(HORA_ORDER.indexOf(WEEKDAY_LORD[weekday - 1]) + hora) % 7];
}

/**
 * The Panchanga for a calculated chart: its own Sun and Moon, birth moment and place.
 * `utcOffsetSeconds` = the clock offset at birth (the same one the dashas are shown on, D-098).
 */
export function panchangaForChart(chart: Chart, options: { utcOffsetSeconds: number; ephemeris?: EphemerisAdapter }): Panchanga {
  const off = options.utcOffsetSeconds;
  if (!Number.isInteger(off) || Math.abs(off) > 18 * 3600) {
    throw new PanchangaInputError(`UTC offset must be a whole number of seconds within ±18 h, got ${off}.`);
  }
  const eph = options.ephemeris ?? getDefaultAdapter();
  const birthMs = Date.parse(chart.meta.input.utc);
  if (!Number.isFinite(birthMs)) throw new PanchangaInputError('Birth time must be an ISO 8601 UTC time.');

  const lunar = lunarParts(chart.bodies.Su.lon, chart.bodies.Mo.lon);
  const day = vedicDay(eph, birthMs, chart.meta.input.lat, chart.meta.input.lng, off);
  return {
    ...lunar,
    weekday: day.weekday,
    weekdayFrom: day.weekdayFrom,
    sunrise: day.sunriseMs === null ? null : new Date(Math.round(day.sunriseMs / 1000) * 1000).toISOString().replace('.000Z', 'Z'),
    horaLord: day.sunriseMs === null ? null : horaLordAt(day.weekday, birthMs - day.sunriseMs),
  };
}
