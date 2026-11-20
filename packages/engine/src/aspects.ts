// Aspects (FR-CALC-08, D-012): classical whole-sign graha drishti only.
// Every planet aspects the 7th sign from itself; Mars also the 4th and 8th; Jupiter the 5th and 9th;
// Saturn the 3rd and 10th. Rahu and Ketu cast no aspects. Counting includes the planet's own sign as 1.

import { GRAHAS, type GrahaCode, type Sign } from './ids.ts';
import { houseOf, nthSignFrom } from './zodiac.ts';

export const ASPECT_DISTANCES: Record<GrahaCode, readonly number[]> = {
  Su: [7],
  Mo: [7],
  Ma: [4, 7, 8],
  Me: [7],
  Ju: [5, 7, 9],
  Ve: [7],
  Sa: [3, 7, 10],
  Ra: [],
  Ke: [],
};

export interface AspectResult {
  /** Houses (1–12) aspected, in ascending order. */
  houses: number[];
  /** Grahas sitting in the aspected houses, in GRAHAS order. */
  bodies: GrahaCode[];
}

export function aspects(signs: Record<GrahaCode, Sign>, lagnaSign: Sign): Record<GrahaCode, AspectResult> {
  const out = {} as Record<GrahaCode, AspectResult>;
  for (const g of GRAHAS) {
    const targetSigns = ASPECT_DISTANCES[g].map((n) => nthSignFrom(signs[g], n));
    out[g] = {
      houses: targetSigns.map((s) => houseOf(s, lagnaSign)).sort((a, b) => a - b),
      bodies: GRAHAS.filter((other) => other !== g && targetSigns.includes(signs[other])),
    };
  }
  return out;
}
