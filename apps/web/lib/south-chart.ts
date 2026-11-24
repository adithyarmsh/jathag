// The basic South Indian Rasi (D-1) chart on the home page (step 0.3.2.1, D-101): chart API
// response → 12 boxes with sign, house number and planet labels, laid out to fit. Display only: no
// calculation happens here, every sign, house and retrograde comes from the API (the same path as
// the planet table, chart-format.ts). No degrees in the boxes: the planet table shows them (D-108).
// The drawing is in app/south-chart.tsx.
//
// All sizes are in the SVG's own units: the chart is a 320 × 320 square (viewBox), 4 × 4 boxes of
// 80 × 80, the middle 2 × 2 merged into the centre. The SVG scales to the space it gets.

import type { ChartResponse } from "@jathag/api";
import { fill, TABLE_BODIES } from "./chart-format";
import type { Messages } from "./i18n";

type BodyCode = keyof ChartResponse["chart"]["bodies"];

export const CHART_SIZE = 320;
export const CELL = CHART_SIZE / 4;

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

/** House of a sign counted from the Lagna's sign (whole signs): Lagna's sign = 1, next sign = 2, … */
export function houseFromLagna(sign: number, lagnaSign: number): number {
  return ((sign - lagnaSign + 12) % 12) + 1;
}

// ---- Fitting the labels into a box ----------------------------------------------------------------

/**
 * Space inside a box for the planet labels (between the sign name and the house number). Since 0.3.5.1
 * one unit narrower top and bottom than before, so three rows of labels drop to 13 and keep a little
 * air from the sign name and the house number.
 */
export const LABEL_AREA = { x: 3, y: 17, width: CELL - 6, height: 49 } as const;
/**
 * Font sizes tried, largest first; the largest one where every label fits is used (D-108 item 3).
 * Without degrees even the fullest real box (La + all 9 grahas, the five that can be retrograde with
 * "(R)"; the Sun and Moon never are, Rahu/Ketu never show it) fits at 9.5, the size of the sign names.
 * The top is capped at 14 (the centre title is 15) so a box with one or two planets doesn't shout;
 * uncapped they would fit at 20.
 */
export const FONT_SIZES = [14, 13, 12, 11, 10, 9.5] as const;
const LINE_HEIGHT = 1.18; // × font size
const GAP = 0.45; // space between two labels on one row, × font size

/**
 * Width of each character in em (× font size) in the site's Inter font, measured in the browser
 * (the widest of weights 400, 500 and 600). Characters not listed count as 1 em (wider than any).
 */
const CHAR_EM: Readonly<Record<string, number>> = (() => {
  const m: Record<string, number> = { " ": 0.3, "(": 0.39, ")": 0.39, ",": 0.27, ".": 0.27, "-": 0.65, "…": 0.96 };
  const set = (chars: string, widths: number[]) => [...chars].forEach((c, i) => (m[c] = widths[i]!));
  set("0123456789", Array(10).fill(0.648));
  set("abcdefghijklmnopqrstuvwxyz", [
    0.574, 0.624, 0.583, 0.624, 0.591, 0.389, 0.626, 0.612, 0.262, 0.262, 0.57, 0.262, 0.9, 0.612, 0.609, 0.624,
    0.624, 0.397, 0.549, 0.353, 0.612, 0.587, 0.839, 0.569, 0.589, 0.566,
  ]);
  set("ABCDEFGHIJKLMNOPQRSTUVWXYZ", [
    0.728, 0.659, 0.737, 0.722, 0.605, 0.59, 0.749, 0.746, 0.277, 0.58, 0.703, 0.565, 0.922, 0.759, 0.769, 0.645,
    0.773, 0.652, 0.65, 0.66, 0.744, 0.728, 1.02, 0.72, 0.714, 0.652,
  ]);
  return m;
})();

/** Safety margin on the measured widths (rounding, font rendering). */
const WIDTH_MARGIN = 1.1;

/**
 * Estimated width of a text in em (× font size): measured character widths plus a 10% margin, so a
 * label never runs out of its box.
 */
export function textWidthEm(text: string): number {
  let w = 0;
  for (const ch of text) w += CHAR_EM[ch] ?? 1;
  return w * WIDTH_MARGIN;
}

export interface PlacedLabel {
  code: BodyCode;
  text: string;
  /** Left edge, relative to the box's left edge. */
  x: number;
  /** Text baseline, relative to the box's top edge. */
  y: number;
  /** Estimated width at the chosen font size. */
  width: number;
}

export interface LabelLayout {
  fontSize: number;
  labels: PlacedLabel[];
  /** Number of rows used. */
  rows: number;
}

/**
 * Lays out a box's labels (in the given order) on centred rows, wrapping when a row is full, at the
 * largest font size where they all fit inside LABEL_AREA. With the smallest size even 10 labels (La +
 * all 9 grahas, impossible in a real chart since Rahu and Ketu are always opposite) still fit (tested).
 */
export function layoutLabels(items: { code: BodyCode; text: string }[]): LabelLayout {
  if (items.length === 0) return { fontSize: FONT_SIZES[0], labels: [], rows: 0 };
  for (const fontSize of FONT_SIZES) {
    const rows = wrap(items, fontSize);
    if (rows && rows.length * fontSize * LINE_HEIGHT <= LABEL_AREA.height) return place(rows, fontSize);
  }
  // Not reachable with up to 10 labels of this kind (tested); place at the smallest size anyway.
  const smallest = FONT_SIZES[FONT_SIZES.length - 1];
  return place(wrap(items, smallest) ?? items.map((i) => [i]), smallest);
}

function wrap(items: { code: BodyCode; text: string }[], fontSize: number) {
  const gap = GAP * fontSize;
  const rows: { code: BodyCode; text: string }[][] = [];
  let width = 0;
  for (const item of items) {
    const w = textWidthEm(item.text) * fontSize;
    if (w > LABEL_AREA.width) return null; // one label wider than the box
    const row = rows[rows.length - 1];
    if (row && width + gap + w <= LABEL_AREA.width) {
      row.push(item);
      width += gap + w;
    } else {
      rows.push([item]);
      width = w;
    }
  }
  return rows;
}

function place(rows: { code: BodyCode; text: string }[][], fontSize: number): LabelLayout {
  const lineHeight = fontSize * LINE_HEIGHT;
  const gap = GAP * fontSize;
  // The block of rows is centred vertically in the label area; each row centred horizontally.
  const top = LABEL_AREA.y + (LABEL_AREA.height - rows.length * lineHeight) / 2;
  const labels: PlacedLabel[] = [];
  rows.forEach((row, r) => {
    const widths = row.map((i) => textWidthEm(i.text) * fontSize);
    const rowWidth = widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1);
    let x = LABEL_AREA.x + (LABEL_AREA.width - rowWidth) / 2;
    // Baseline about 0.8 of a line below the row's top (cap height of the font).
    const y = top + r * lineHeight + fontSize * 0.86;
    row.forEach((item, i) => {
      labels.push({ code: item.code, text: item.text, x, y, width: widths[i]! });
      x += widths[i]! + gap;
    });
  });
  return { fontSize, labels, rows: rows.length };
}

// ---- The 12 boxes ---------------------------------------------------------------------------------

export interface ChartBox {
  /** 1 = Aries … 12 = Pisces */
  sign: number;
  signName: string;
  col: number;
  row: number;
  /** 1–12, counted from the Lagna */
  house: number;
  /** e.g. "7th house" */
  houseLabel: string;
  isLagna: boolean;
  /** Bodies in this sign, in table order (La first). */
  bodies: { code: BodyCode; text: string; retrograde: boolean }[];
  layout: LabelLayout;
}

/**
 * One label: the two-letter abbreviation, plus "(R)" when retrograde, e.g. "Sa (R)", "Ve". No degree
 * (D-108: the planet table shows them). Never (R) for Rahu/Ketu (the table shows "—" for them, D-093)
 * or the Lagna.
 */
function labelFor(code: BodyCode, body: ChartResponse["chart"]["bodies"]["La"], t: Messages["chart"]) {
  const retrograde = code !== "La" && code !== "Ra" && code !== "Ke" && body.retrograde === true;
  const base = t.abbreviations[code];
  return { code, retrograde, text: retrograde ? `${base} ${t.southChart.retrogradeMark}` : base };
}

/** Chart response → the 12 boxes in sign order (Aries first). */
export function southChartBoxes(chart: ChartResponse["chart"], t: Messages["chart"]): ChartBox[] {
  const lagnaSign = chart.bodies.La.sign;
  const bySign = new Map<number, ChartBox["bodies"]>();
  for (const code of TABLE_BODIES) {
    const body = chart.bodies[code];
    const list = bySign.get(body.sign) ?? [];
    list.push(labelFor(code, body, t));
    bySign.set(body.sign, list);
  }
  return Array.from({ length: 12 }, (_, i) => {
    const sign = i + 1;
    const [col, row] = SIGN_CELLS[sign]!;
    const house = houseFromLagna(sign, lagnaSign);
    const bodies = bySign.get(sign) ?? [];
    return {
      sign,
      signName: t.signs[i]!,
      col,
      row,
      house,
      houseLabel: fill(t.southChart.houseLabel, { n: t.southChart.ordinals[house - 1]! }),
      isLagna: sign === lagnaSign,
      bodies,
      layout: layoutLabels(bodies),
    };
  });
}

// ---- The centre -----------------------------------------------------------------------------------

/** Widest line in the centre, in SVG units, and the font size of the place lines. */
export const CENTRE_LINE_WIDTH = 2 * CELL - 10;
export const PLACE_FONT = 9.5;

/**
 * The place for the centre, on at most two lines that fit CENTRE_LINE_WIDTH. Long labels are
 * shortened by leaving out middle parts (keeping the town and the country), e.g.
 * "Kandivli, Mumbai Suburban, Maharashtra, India" → "Kandivli, Maharashtra, India"; a single part
 * that is still too long is cut with "…".
 */
export function placeLines(label: string, fontSize = PLACE_FONT, maxWidth = CENTRE_LINE_WIDTH): string[] {
  const fits = (s: string) => textWidthEm(s) * fontSize <= maxWidth;
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  const cut = (s: string) => {
    let out = s;
    while (out.length > 1 && !fits(`${out}…`)) out = out.slice(0, -1).trimEnd();
    return fits(s) ? s : `${out}…`;
  };
  while (parts.length > 0) {
    const lines = toLines(parts, fits);
    if (lines.length <= 2) return lines.map(cut);
    if (parts.length <= 2) return [cut(parts[0]!), cut(parts.slice(1).join(", "))];
    parts.splice(1, 1); // drop the part after the town (usually the district), keep the country
  }
  return [];
}

function toLines(parts: string[], fits: (s: string) => boolean): string[] {
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const last = lines.length - 1;
    const piece = parts[i]! + (i < parts.length - 1 ? "," : "");
    if (last >= 0 && fits(`${lines[last]} ${piece}`)) lines[last] = `${lines[last]} ${piece}`;
    else lines.push(piece);
  }
  return lines;
}
