// The North Indian chart (step 0.5.2, design spec §7.2, D-130, D-143): a 400 × 400 square with both
// diagonals and the inner diamond. The HOUSES never move: the 1st house is the top diamond and they
// count counter-clockwise (2nd top-left, 3rd left-top, 4th the left diamond, … 12th top-right); the
// sign that falls in each house depends on that chart's Lagna (D1 or D9). Each house shows the short
// sign name ("Ari" … "Pis", 11 units, towards the middle of the chart) and the planets (15 units) in
// the open part of the house. Display only; the drawing is app/north-chart.tsx.

import type { ChartResponse } from "@jathag/api";
import { chartSigns, fitLabels, signOfHouse, type BodyLabel, type ChartKind, type LabelArea, type LabelLayout } from "./drawn-chart";
import type { Messages } from "./i18n";

export const NORTH_SIZE = 400;
export const NORTH_PLANET_FONT = 15;
export const NORTH_SIGN_FONT = 11;
export const NORTH_FONT_SIZES = [15, 14, 13, 12, 11, 10, 9.5] as const;

type Pt = readonly [number, number];

interface HouseShape {
  /** The house's outline (convex), clockwise or not. */
  polygon: readonly Pt[];
  /** Where the short sign name sits (its middle; baseline = y + 4). */
  sign: Pt;
  /** Planets: rows centred on this point… */
  centre: Pt;
  /** …and kept inside this box (away from the sign name). */
  clip: { minX: number; maxX: number; minY: number; maxY: number };
}

const S = NORTH_SIZE;
const H = S / 2;
const Q = S / 4;

/** The 12 houses, 1st first. Corners of the inner diamond: (200,0) (400,200) (200,400) (0,200). */
export const NORTH_HOUSES: Readonly<Record<number, HouseShape>> = {
  1: { polygon: [[H, 0], [3 * Q, Q], [H, H], [Q, Q]], sign: [H, 164], centre: [H, 84], clip: { minX: 0, maxX: S, minY: 8, maxY: 150 } },
  2: { polygon: [[0, 0], [H, 0], [Q, Q]], sign: [Q, 70], centre: [Q, 30], clip: { minX: 0, maxX: S, minY: 4, maxY: 58 } },
  3: { polygon: [[0, 0], [Q, Q], [0, H]], sign: [70, Q], centre: [30, Q], clip: { minX: 0, maxX: 56, minY: 0, maxY: S } },
  4: { polygon: [[0, H], [Q, Q], [H, H], [Q, 3 * Q]], sign: [164, H], centre: [84, H], clip: { minX: 0, maxX: 148, minY: 0, maxY: S } },
  5: { polygon: [[0, H], [Q, 3 * Q], [0, S]], sign: [70, 3 * Q], centre: [30, 3 * Q], clip: { minX: 0, maxX: 56, minY: 0, maxY: S } },
  6: { polygon: [[0, S], [Q, 3 * Q], [H, S]], sign: [Q, 330], centre: [Q, 370], clip: { minX: 0, maxX: S, minY: 342, maxY: 396 } },
  7: { polygon: [[Q, 3 * Q], [H, H], [3 * Q, 3 * Q], [H, S]], sign: [H, 236], centre: [H, 316], clip: { minX: 0, maxX: S, minY: 250, maxY: 392 } },
  8: { polygon: [[H, S], [3 * Q, 3 * Q], [S, S]], sign: [3 * Q, 330], centre: [3 * Q, 370], clip: { minX: 0, maxX: S, minY: 342, maxY: 396 } },
  9: { polygon: [[S, S], [3 * Q, 3 * Q], [S, H]], sign: [330, 3 * Q], centre: [370, 3 * Q], clip: { minX: 344, maxX: S, minY: 0, maxY: S } },
  10: { polygon: [[S, H], [3 * Q, 3 * Q], [H, H], [3 * Q, Q]], sign: [236, H], centre: [316, H], clip: { minX: 252, maxX: S, minY: 0, maxY: S } },
  11: { polygon: [[S, H], [3 * Q, Q], [S, 0]], sign: [330, Q], centre: [370, Q], clip: { minX: 344, maxX: S, minY: 0, maxY: S } },
  12: { polygon: [[S, 0], [3 * Q, Q], [H, 0]], sign: [3 * Q, 70], centre: [3 * Q, 30], clip: { minX: 0, maxX: S, minY: 4, maxY: 58 } },
};

/** Kept free between a label and a slanted (45°) line, measured sideways: 5 units ≈ 3.5 at right angles. */
const INSET = 5;

/** [left, right] of a convex polygon at height y, or null when y misses it. */
function spanAt(polygon: readonly Pt[], y: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i]!;
    const [x2, y2] = polygon[(i + 1) % polygon.length]!;
    if ((y < Math.min(y1, y2)) || (y > Math.max(y1, y2))) continue;
    if (y1 === y2) {
      lo = Math.min(lo, x1, x2);
      hi = Math.max(hi, x1, x2);
      continue;
    }
    const x = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return lo <= hi ? [lo, hi] : null;
}

/** The planet area of one house: inside its outline (inset), inside its clip box. */
export function houseArea(house: number): LabelArea {
  const h = NORTH_HOUSES[house]!;
  return {
    centreX: h.centre[0],
    centreY: h.centre[1],
    minY: h.clip.minY,
    maxY: h.clip.maxY,
    span: (top, bottom) => {
      if (top < h.clip.minY - 1e-9 || bottom > h.clip.maxY + 1e-9) return null;
      const a = spanAt(h.polygon, top);
      const b = spanAt(h.polygon, bottom);
      if (!a || !b) return null;
      const left = Math.max(a[0], b[0]) + INSET;
      const right = Math.min(a[1], b[1]) - INSET;
      const l = Math.max(left, h.clip.minX);
      const r = Math.min(right, h.clip.maxX);
      return l < r ? [l, r] : null;
    },
  };
}

/** True when the point is inside the house outline (for tests). */
export function insideHouse(house: number, x: number, y: number): boolean {
  const s = spanAt(NORTH_HOUSES[house]!.polygon, y);
  return s !== null && x >= s[0] - 1e-9 && x <= s[1] + 1e-9;
}

export interface NorthHouse {
  /** 1–12; 1 = the top diamond */
  house: number;
  /** The sign in this house for this chart's Lagna */
  sign: number;
  /** "Ari" … "Pis" */
  signShort: string;
  signName: string;
  isLagna: boolean;
  bodies: BodyLabel[];
  /** Absolute positions in the 400 × 400 drawing. */
  layout: LabelLayout;
  signAt: Pt;
}

/** Chart response → the 12 houses (1st first), for D1 (default) or D9. */
export function northChartHouses(chart: ChartResponse["chart"], t: Messages["chart"], kind: ChartKind = "d1"): NorthHouse[] {
  const signs = chartSigns(chart, kind, t);
  const lagna = signs.find((s) => s.isLagna)!.sign;
  return Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const sign = signOfHouse(house, lagna);
    const s = signs[sign - 1]!;
    return {
      house,
      sign,
      signShort: t.signsShort[sign - 1]!,
      signName: t.signs[sign - 1]!,
      isLagna: house === 1,
      bodies: s.bodies,
      layout: fitLabels(s.bodies, houseArea(house), NORTH_FONT_SIZES),
      signAt: NORTH_HOUSES[house]!.sign,
    };
  });
}

/** Lines of the drawing: the frame is drawn separately; these are both diagonals and the inner diamond. */
export const NORTH_LINES = `M0 0L${S} ${S}M${S} 0L0 ${S}M${H} 0L${S} ${H}L${H} ${S}L0 ${H}Z`;
/** The 1st house (soft gold fill). */
export const NORTH_FIRST_HOUSE = `M${H} 0L${3 * Q} ${Q}L${H} ${H}L${Q} ${Q}Z`;
