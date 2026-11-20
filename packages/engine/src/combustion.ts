// Combustion (FR-CALC-09, D-077): a planet is combust when the shortest angular distance between
// its longitude and the Sun's is within its orb (distance ≤ orb). Mercury and Venus use the
// smaller orb when retrograde. The Sun, Rahu and Ketu are never combust.

import type { GrahaCode } from './ids.ts';
import { angularDistance } from './zodiac.ts';

/** Orbs in degrees (D-077): [direct, retrograde]. */
export const COMBUSTION_ORB: Partial<Record<GrahaCode, readonly [number, number]>> = {
  Mo: [12, 12],
  Ma: [17, 17],
  Me: [14, 12],
  Ju: [11, 11],
  Ve: [10, 8],
  Sa: [15, 15],
};

export function isCombust(body: GrahaCode, lonDeg: number, retrograde: boolean, sunLonDeg: number): boolean {
  const orb = COMBUSTION_ORB[body];
  if (!orb) return false; // Sun, Rahu, Ketu
  const limit = retrograde ? orb[1] : orb[0];
  // Compared in arcseconds, rounded to 1 µas so floating-point noise can't push an exact orb
  // (e.g. 14°00′00″) outside.
  const distArcsec = Math.round(angularDistance(lonDeg, sunLonDeg) * 3600 * 1e6) / 1e6;
  return distArcsec <= limit * 3600;
}
