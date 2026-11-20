// Simple arithmetic on a sidereal longitude: sign, degree in sign, nakshatra, pada, nakshatra lord,
// navamsa (D-9). No astronomy here.
//
// Everything is worked out in arcseconds, where every boundary is a whole number
// (sign 108 000″, nakshatra 48 000″, pada and navamsa 12 000″), which avoids rounding trouble
// with spans like 13°20′.

import { NAKSHATRA_LORD_CYCLE, type GrahaCode, type Sign } from './ids.ts';

export const ARCSEC_CIRCLE = 1_296_000;
const ARCSEC_SIGN = 108_000;
const ARCSEC_NAKSHATRA = 48_000;
const ARCSEC_PADA = 12_000; // = one navamsa

/** Normalise degrees to [0, 360). */
export function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** Longitude in arcseconds, [0, 1 296 000). */
export function toArcsec(lonDeg: number): number {
  const a = normalizeDegrees(lonDeg) * 3600;
  return a >= ARCSEC_CIRCLE ? 0 : a;
}

export interface ZodiacPlacement {
  /** Sidereal longitude in degrees, [0, 360). */
  lon: number;
  sign: Sign;
  /** Degrees within the sign, [0, 30). */
  degInSign: number;
  nakshatra: number;
  pada: number;
  nakshatraLord: GrahaCode;
  /** Sign in the navamsa (D-9) chart, regular Parashari (D-070). */
  navamsaSign: Sign;
}

export function placement(lonDeg: number): ZodiacPlacement {
  const lon = normalizeDegrees(lonDeg);
  const a = toArcsec(lon);
  const signIdx = Math.floor(a / ARCSEC_SIGN);
  const nakIdx = Math.floor(a / ARCSEC_NAKSHATRA);
  const padaIdx = Math.floor(a / ARCSEC_PADA); // 0–107, also the navamsa index from 0° Aries
  return {
    lon,
    sign: (signIdx + 1) as Sign,
    degInSign: (a - signIdx * ARCSEC_SIGN) / 3600,
    nakshatra: nakIdx + 1,
    pada: (padaIdx % 4) + 1,
    nakshatraLord: NAKSHATRA_LORD_CYCLE[nakIdx % 9],
    navamsaSign: ((padaIdx % 12) + 1) as Sign,
  };
}

/** Shortest angular distance between two longitudes, in degrees [0, 180]. */
export function angularDistance(a: number, b: number): number {
  const d = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return d > 180 ? 360 - d : d;
}

/** Whole-sign house of `sign` counted from `lagnaSign` (house 1 = Lagna sign). */
export function houseOf(sign: number, lagnaSign: number): number {
  return ((sign - lagnaSign + 12) % 12) + 1;
}

/** The sign `n` signs from `sign`, counting `sign` itself as 1 (so n = 7 is the opposite sign). */
export function nthSignFrom(sign: number, n: number): Sign {
  return ((((sign - 1 + n - 1) % 12) + 12) % 12 + 1) as Sign;
}
