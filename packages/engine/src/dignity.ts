// Dignity (FR-CALC-04), exactly as decided in D-076.
//
// SOURCE: Brihat Parashara Hora Shastra (BPHS), standard Parashari tables:
//   - exaltation / debilitation signs and moolatrikona ranges (BPHS ch. 3),
//   - natural (naisargika) friendships (BPHS ch. 3).
//
// Priority (D-076): exalted / debilitated > moolatrikona > own sign > friend / neutral / enemy sign,
// where the relationship is with the lord of the sign the planet occupies.
// Exaltation and debilitation count for the whole sign, except where BPHS splits a sign:
//   Moon in Taurus:    exalted 0°–3°, moolatrikona 3°–30°
//   Mercury in Virgo:  exalted 0°–15°, moolatrikona 15°–20°, own sign 20°–30°
// Every range includes its start and excludes its end.
// Rahu and Ketu: no dignity in v1 (null).

import { signLord, type DignityCode, type GrahaCode, type PlanetCode, type Sign } from './ids.ts';
import { nthSignFrom, placement, toArcsec } from './zodiac.ts';

interface Range {
  sign: Sign;
  /** Degrees within the sign: from ≤ x < to. */
  from: number;
  to: number;
}

/** Exaltation (BPHS). Whole sign unless split (Moon, Mercury). */
export const EXALTATION: Record<PlanetCode, Range> = {
  Su: { sign: 1, from: 0, to: 30 }, // Aries
  Mo: { sign: 2, from: 0, to: 3 }, // Taurus 0–3 (then moolatrikona)
  Ma: { sign: 10, from: 0, to: 30 }, // Capricorn
  Me: { sign: 6, from: 0, to: 15 }, // Virgo 0–15 (then moolatrikona, then own)
  Ju: { sign: 4, from: 0, to: 30 }, // Cancer
  Ve: { sign: 12, from: 0, to: 30 }, // Pisces
  Sa: { sign: 7, from: 0, to: 30 }, // Libra
};

/** Debilitation = the whole sign opposite the exaltation sign (BPHS). */
export const DEBILITATION_SIGN: Record<PlanetCode, Sign> = Object.fromEntries(
  Object.entries(EXALTATION).map(([p, r]) => [p, nthSignFrom(r.sign, 7)]),
) as Record<PlanetCode, Sign>;

/** Moolatrikona (BPHS). */
export const MOOLATRIKONA: Record<PlanetCode, Range> = {
  Su: { sign: 5, from: 0, to: 20 }, // Leo
  Mo: { sign: 2, from: 3, to: 30 }, // Taurus
  Ma: { sign: 1, from: 0, to: 12 }, // Aries
  Me: { sign: 6, from: 15, to: 20 }, // Virgo
  Ju: { sign: 9, from: 0, to: 10 }, // Sagittarius
  Ve: { sign: 7, from: 0, to: 15 }, // Libra
  Sa: { sign: 11, from: 0, to: 20 }, // Aquarius
};

/** Natural (naisargika) relationships (BPHS). Planets not listed as friend or enemy are neutral. */
export const NATURAL_RELATIONSHIP: Record<PlanetCode, { friends: PlanetCode[]; neutral: PlanetCode[]; enemies: PlanetCode[] }> = {
  Su: { friends: ['Mo', 'Ma', 'Ju'], neutral: ['Me'], enemies: ['Ve', 'Sa'] },
  Mo: { friends: ['Su', 'Me'], neutral: ['Ma', 'Ju', 'Ve', 'Sa'], enemies: [] },
  Ma: { friends: ['Su', 'Mo', 'Ju'], neutral: ['Ve', 'Sa'], enemies: ['Me'] },
  Me: { friends: ['Su', 'Ve'], neutral: ['Ma', 'Ju', 'Sa'], enemies: ['Mo'] },
  Ju: { friends: ['Su', 'Mo', 'Ma'], neutral: ['Sa'], enemies: ['Me', 'Ve'] },
  Ve: { friends: ['Me', 'Sa'], neutral: ['Ma', 'Ju'], enemies: ['Su', 'Mo'] },
  Sa: { friends: ['Me', 'Ve'], neutral: ['Ju'], enemies: ['Su', 'Mo', 'Ma'] },
};

// Ranges are compared in arcseconds (whole numbers) so 3°00′00″ is exactly 10 800″.
const inRange = (r: Range, sign: number, arcsecInSign: number) =>
  sign === r.sign && arcsecInSign >= r.from * 3600 && arcsecInSign < r.to * 3600;

/** Dignity of a graha at a sidereal longitude (degrees). Rahu and Ketu → null. */
export function dignity(body: GrahaCode, lonDeg: number): DignityCode | null {
  if (body === 'Ra' || body === 'Ke') return null;
  const { sign } = placement(lonDeg);
  const arcsec = toArcsec(lonDeg) - (sign - 1) * 108_000;

  if (inRange(EXALTATION[body], sign, arcsec)) return 'EX';
  if (sign === DEBILITATION_SIGN[body]) return 'DB';
  if (inRange(MOOLATRIKONA[body], sign, arcsec)) return 'MT';

  const lord = signLord(sign);
  if (lord === body) return 'OS';
  const rel = NATURAL_RELATIONSHIP[body];
  if (rel.friends.includes(lord)) return 'FR';
  if (rel.enemies.includes(lord)) return 'EN';
  return 'NE';
}
