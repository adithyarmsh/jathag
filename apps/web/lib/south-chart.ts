// The South Indian chart (step 0.5.2, design spec §7.1, D-101, D-143): chart response → the 12 boxes
// of a 400 × 400 drawing (4 × 4 boxes of 100, the middle 2 × 2 is the centre), for Rasi (D1) or
// Navamsa (D9). The signs never move; the house ordinal in each box counts from that chart's Lagna.
// Display only (the signs come from lib/drawn-chart.ts); the drawing is app/south-chart.tsx.
// No degrees in the boxes (D-108) and no Moon lines in the centre (D-129 item 5).

import type { ChartResponse } from "@jathag/api";
import { chartSigns, fitLabels, houseFromLagna, placeLines, type BodyLabel, type ChartKind, type LabelArea, type LabelLayout } from "./drawn-chart";
import type { Messages } from "./i18n";

export { houseFromLagna };

export const CHART_SIZE = 400;
export const CELL = CHART_SIZE / 4;

/** Text sizes in SVG units (spec §7.1, D-143 item 7). */
export const PLANET_FONT = 17;
export const SIGN_FONT = 10;
export const HOUSE_FONT = 10;
/** Sign name bottom-left, house ordinal top-right (inside a box). */
export const SIGN_POS = { x: 8, y: 92 } as const;
export const HOUSE_POS = { x: 92, y: 15 } as const;
/** The Lagna's gold diagonal across the top-left corner of its box: from (0, MARK) to (MARK, 0). */
export const LAGNA_MARK = 26;

/**
 * Classic South Indian layout: the signs never move. [column, row] of each sign's box, 0-based from
 * the top left, by sign number (1 = Aries … 12 = Pisces).
 * Top row left → right: Pisces, Aries, Taurus, Gemini; right column down: Cancer, Leo;
 * bottom row right → left: Virgo, Libra, Scorpio, Sagittarius; left column up: Capricorn, Aquarius.
 */
export const SIGN_CELLS: Readonly<Record<number, readonly [col: number, row: number]>> = {
  12: [0, 0],
  1: [1, 0],
  2: [2, 0],
  3: [3, 0],
  4: [3, 1],
  5: [3, 2],
  6: [3, 3],
  7: [2, 3],
  8: [1, 3],
  9: [0, 3],
  10: [0, 2],
  11: [0, 1],
};

/**
 * The room for planet labels inside a box (box units): below the house ordinal (top right, ends at
 * y 15) and above the sign name (bottom left, starts at about y 84), 4 units from the sides.
 */
export const LABEL_AREA = { x: 4, y: 19, width: CELL - 8, height: 63 } as const;
/** Planet sizes tried, largest first (shrink rule in lib/drawn-chart.ts fitLabels). */
export const FONT_SIZES = [17, 16, 15, 14, 13, 12, 11, 10, 9.5] as const;

const AREA: LabelArea = {
  centreX: CELL / 2,
  centreY: LABEL_AREA.y + LABEL_AREA.height / 2,
  minY: LABEL_AREA.y,
  maxY: LABEL_AREA.y + LABEL_AREA.height,
  span: () => [LABEL_AREA.x, LABEL_AREA.x + LABEL_AREA.width],
};

export function layoutLabels(items: readonly BodyLabel[]): LabelLayout {
  return fitLabels(items, AREA, FONT_SIZES);
}

export interface ChartBox {
  /** 1 = Aries … 12 = Pisces */
  sign: number;
  signName: string;
  col: number;
  row: number;
  /** 1–12, counted from this chart's Lagna */
  house: number;
  /** "1st" … "12th" */
  houseLabel: string;
  isLagna: boolean;
  /** Bodies in this sign, in table order (La first). */
  bodies: BodyLabel[];
  /** Label positions relative to the box's top-left corner. */
  layout: LabelLayout;
}

/** Chart response → the 12 boxes in sign order (Aries first), for D1 (default) or D9. */
export function southChartBoxes(chart: ChartResponse["chart"], t: Messages["chart"], kind: ChartKind = "d1"): ChartBox[] {
  return chartSigns(chart, kind, t).map((s) => {
    const [col, row] = SIGN_CELLS[s.sign]!;
    return {
      sign: s.sign,
      signName: t.signs[s.sign - 1]!,
      col,
      row,
      house: s.house,
      houseLabel: t.southChart.ordinals[s.house - 1]!,
      isLagna: s.isLagna,
      bodies: s.bodies,
      layout: layoutLabels(s.bodies),
    };
  });
}

/** The Moon's sign, nakshatra and pada in words, straight from the chart response (the fact tiles). */
export function moonFacts(chart: ChartResponse["chart"], t: Messages["chart"]) {
  const mo = chart.bodies.Mo;
  return { sign: t.signs[mo.sign - 1]!, nakshatra: t.nakshatras[mo.nakshatra - 1]!, pada: String(mo.pada) };
}

// ---- The centre (spec §7.1) ------------------------------------------------------------------------

export const CENTRE_TITLE_FONT = 16;
export const CENTRE_TEXT_FONT = 11;
/** Widest centre line: the 200-unit centre minus 8 on each side. */
export const CENTRE_LINE_WIDTH = 2 * CELL - 16;

export interface CentreLine {
  text: string;
  size: number;
  /** Baseline, absolute. */
  y: number;
  kind: "title" | "birth" | "place";
}

/**
 * The centre, top to bottom: "Rasi chart (D-1)" / "Navamsa (D-9)", "14 Aug 1992 · 6:45 AM", then the
 * place (or "Near …" for typed coordinates, D-144) on one or two lines. Spaced as drawn (title, +26,
 * +18, +16) and centred on the middle of the chart.
 */
export function centreLines(title: string, dateTime: string, place: string): CentreLine[] {
  const places = placeLines(place, CENTRE_TEXT_FONT, CENTRE_LINE_WIDTH);
  const items: { text: string; size: number; step: number; kind: CentreLine["kind"] }[] = [
    { text: title, size: CENTRE_TITLE_FONT, step: 0, kind: "title" },
    { text: dateTime, size: CENTRE_TEXT_FONT, step: 26, kind: "birth" },
    ...places.map((text, i) => ({ text, size: CENTRE_TEXT_FONT, step: i === 0 ? 18 : 16, kind: "place" as const })),
  ];
  // With one place line the baselines are 184 / 210 / 228 (as drawn); a second line moves all up by 8.
  let y = 184 - (places.length - 1) * 8;
  return items.map((l, i) => {
    if (i > 0) y += l.step;
    return { text: l.text, size: l.size, y, kind: l.kind };
  });
}
