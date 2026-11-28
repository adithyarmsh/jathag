// What the drawn charts show (step 0.5.2, design spec §7, D-143): for one chart response and one chart
// type (Rasi D1 or Navamsa D9), which sign each body is in, the Lagna's sign, the house of every sign
// counted from THAT chart's Lagna, and the label of each body ("Sa (R)"). Display only: nothing is
// calculated here. D1 uses `sign`, D9 uses `navamsaSign` (calculated by the engine and checked against
// Jagannatha Hora for all 29 reference births, D-079). Shared by the South and North drawings
// (lib/south-chart.ts, lib/north-chart.ts) and their screen-reader sentence.
//
// Also here: estimated text widths (Inter, measured in the browser) and the row fitting both drawings
// use: labels on centred rows, the largest font size where they all fit, never below MIN_FONT.

import type { ChartResponse } from "@jathag/api";
import { fill, TABLE_BODIES } from "./chart-format";
import type { Messages } from "./i18n";

export type BodyCode = keyof ChartResponse["chart"]["bodies"];
export type ChartKind = "d1" | "d9";
export type Chart = ChartResponse["chart"];

/** The sign (1 = Aries … 12 = Pisces) of a body in this chart type. */
export function signIn(chart: Chart, code: BodyCode, kind: ChartKind): number {
  const b = chart.bodies[code];
  return kind === "d1" ? b.sign : b.navamsaSign;
}

/** House of a sign counted from the Lagna's sign (whole signs): Lagna's sign = 1, next sign = 2, … */
export function houseFromLagna(sign: number, lagnaSign: number): number {
  return ((sign - lagnaSign + 12) % 12) + 1;
}

/** The sign in a house (the reverse of houseFromLagna). */
export function signOfHouse(house: number, lagnaSign: number): number {
  return ((lagnaSign + house - 2) % 12) + 1;
}

export interface BodyLabel {
  code: BodyCode;
  /** "Sa", "Sa (R)"; never a degree (D-108). */
  text: string;
  retrograde: boolean;
}

/**
 * One label: the two-letter abbreviation, plus "(R)" when retrograde. Never (R) for Rahu/Ketu (always
 * moving backwards, the table shows "—" for them, D-093) or the Lagna. Shown the same in D9 as in D1
 * (retrograde is a property of the planet, D-143 item 4).
 */
export function bodyLabel(code: BodyCode, chart: Chart, t: Messages["chart"]): BodyLabel {
  const retrograde = code !== "La" && code !== "Ra" && code !== "Ke" && chart.bodies[code].retrograde === true;
  const base = t.abbreviations[code];
  return { code, retrograde, text: retrograde ? `${base} ${t.southChart.retrogradeMark}` : base };
}

export interface SignContents {
  sign: number;
  /** 1–12, counted from this chart's Lagna */
  house: number;
  isLagna: boolean;
  /** In table order, La first. */
  bodies: BodyLabel[];
}

/** The twelve signs (Aries first) with their house and bodies, for one chart type. */
export function chartSigns(chart: Chart, kind: ChartKind, t: Messages["chart"]): SignContents[] {
  const lagnaSign = signIn(chart, "La", kind);
  const bySign = new Map<number, BodyLabel[]>();
  for (const code of TABLE_BODIES) {
    const s = signIn(chart, code, kind);
    const list = bySign.get(s) ?? [];
    list.push(bodyLabel(code, chart, t));
    bySign.set(s, list);
  }
  return Array.from({ length: 12 }, (_, i) => {
    const sign = i + 1;
    return { sign, house: houseFromLagna(sign, lagnaSign), isLagna: sign === lagnaSign, bodies: bySign.get(sign) ?? [] };
  });
}

// ---- Text widths ----------------------------------------------------------------------------------

/**
 * Width of each character in em (× font size) in the site's Inter font, measured in the browser
 * (the widest of weights 400, 500 and 600). Characters not listed count as 1 em (wider than any).
 */
const CHAR_EM: Readonly<Record<string, number>> = (() => {
  const m: Record<string, number> = { " ": 0.3, "(": 0.39, ")": 0.39, ",": 0.27, ".": 0.27, "-": 0.65, "…": 0.96, "·": 0.3, "′": 0.3, "″": 0.45, "°": 0.42, ":": 0.3 };
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

/** Estimated width of a text in em (× font size), with a 10% margin so a label never runs out of its space. */
export function textWidthEm(text: string): number {
  let w = 0;
  for (const ch of text) w += CHAR_EM[ch] ?? 1;
  return w * WIDTH_MARGIN;
}

// ---- Fitting labels on rows -----------------------------------------------------------------------

/** The smallest planet text in any chart (the size of the old sign names; never smaller). */
export const MIN_FONT = 9.5;
/** Row height × font size, and the space between two labels on a row × font size. */
export const LINE_HEIGHT = 1.25;
export const GAP = 0.5;
/** Inter's cap height is 0.73 em: a baseline 0.36 em below a row's middle centres capitals on it. */
const BASELINE_FROM_MIDDLE = 0.36;
/** Text top above the baseline and bottom below it ("(" and ")" reach lowest), × font size. */
export const TEXT_TOP = 0.76;
export const TEXT_BOTTOM = 0.22;

export interface PlacedLabel {
  code: BodyCode;
  text: string;
  /** Left edge (SVG units, absolute). */
  x: number;
  /** Baseline (SVG units, absolute). */
  y: number;
  /** Estimated width at the chosen size. */
  width: number;
}

export interface LabelLayout {
  fontSize: number;
  labels: PlacedLabel[];
  rows: number;
}

/**
 * The space a box offers for planet labels. `span(top, bottom)` = the horizontal room [left, right]
 * that is free over the whole height of a row from `top` to `bottom` (null when none); `centreX` is
 * where rows are centred; rows are stacked around `centreY` and must stay within [minY, maxY].
 */
export interface LabelArea {
  centreX: number;
  centreY: number;
  minY: number;
  maxY: number;
  span: (top: number, bottom: number) => readonly [number, number] | null;
}

/**
 * Lays out labels on rows centred in the area (the shrink rule, D-143 item 7):
 * - the Lagna's "La" always gets a row of its own, first;
 * - at the starting size at most two labels share a row ("two per line", spec §7.1); when they need
 *   more rows than the box holds, the text shrinks one unit at a time (then half a unit near the end),
 *   and from the first smaller size a row holds as many as fit;
 * - the largest size where every label fits is used, never smaller than MIN_FONT (9.5). If even that
 *   does not fit (never in a real chart, tested), the labels are placed at MIN_FONT anyway.
 */
export function fitLabels(items: readonly BodyLabel[], area: LabelArea, sizes: readonly number[]): LabelLayout {
  if (items.length === 0) return { fontSize: sizes[0]!, labels: [], rows: 0 };
  for (let i = 0; i < sizes.length; i++) {
    const placed = tryRows(items, area, sizes[i]!, i === 0 ? 2 : Infinity);
    if (placed) return placed;
  }
  const smallest = sizes[sizes.length - 1]!;
  return tryRows(items, area, smallest, Infinity, true)!;
}

function tryRows(items: readonly BodyLabel[], area: LabelArea, f: number, perRow: number, force = false): LabelLayout | null {
  const lh = f * LINE_HEIGHT;
  const gap = GAP * f;
  const widths = items.map((it) => textWidthEm(it.text) * f);
  const maxRows = Math.max(1, Math.floor((area.maxY - area.minY) / lh));
  for (let rows = 1; rows <= (force ? items.length : maxRows); rows++) {
    // The block of rows centred on centreY, moved inside [minY, maxY] when it would stick out.
    let top = area.centreY - (rows * lh) / 2;
    if (!force) {
      top = Math.max(area.minY, Math.min(top, area.maxY - rows * lh));
      if (top < area.minY - 1e-9) return null;
    }
    const spans = Array.from({ length: rows }, (_, r) => {
      const s = area.span(top + r * lh, top + (r + 1) * lh);
      if (!s) return 0;
      // Room is measured both ways from centreX, so every row stays centred under the one above.
      return 2 * Math.max(0, Math.min(area.centreX - s[0], s[1] - area.centreX));
    });
    // Fill rows in order; "La" alone on the first row.
    const rowsOf: number[][] = [];
    let r = 0;
    let ok = true;
    let width = 0;
    for (let i = 0; i < items.length; i++) {
      const w = widths[i]!;
      const row = rowsOf[r];
      const own = items[i]!.code === "La" || (i > 0 && items[i - 1]!.code === "La");
      if (row && !own && row.length < perRow && width + gap + w <= spans[r]! + 1e-9) {
        row.push(i);
        width += gap + w;
        continue;
      }
      if (row) r++;
      if (r >= rows || (w > spans[r]! + 1e-9 && !force)) {
        ok = false;
        break;
      }
      rowsOf[r] = [i];
      width = w;
    }
    if (!ok) continue;
    // Shift the block so the used rows stay centred on centreY.
    const used = rowsOf.length;
    let blockTop = area.centreY - (used * lh) / 2;
    if (!force) blockTop = Math.max(area.minY, Math.min(blockTop, area.maxY - used * lh));
    // Re-check the room at the final position (it may differ from the trial one).
    const labels: PlacedLabel[] = [];
    let fits = true;
    rowsOf.forEach((row, ri) => {
      const s = area.span(blockTop + ri * lh, blockTop + (ri + 1) * lh);
      const room = s ? 2 * Math.max(0, Math.min(area.centreX - s[0], s[1] - area.centreX)) : 0;
      const rowWidth = row.reduce((a, i) => a + widths[i]!, 0) + gap * (row.length - 1);
      if (rowWidth > room + 1e-9) fits = false;
      let x = area.centreX - rowWidth / 2;
      const y = blockTop + ri * lh + lh / 2 + f * BASELINE_FROM_MIDDLE;
      for (const i of row) {
        labels.push({ code: items[i]!.code, text: items[i]!.text, x, y, width: widths[i]! });
        x += widths[i]! + gap;
      }
    });
    if (fits || force) return { fontSize: f, labels, rows: used };
  }
  return null;
}

// ---- Words around the drawing ---------------------------------------------------------------------

export type ChartStyleName = "south" | "north";

/** "Rasi chart (D-1)" / "Navamsa (D-9)": the title in the South centre and above the North chart. */
export function chartTitle(kind: ChartKind, t: Messages["chart"]): string {
  return kind === "d1" ? t.drawing.titleD1 : t.drawing.titleD9;
}

/**
 * The screen-reader sentence (role="img", spec §7.1): which chart, the birth, the Lagna's sign, then
 * every occupied sign with its house and bodies, e.g. "… Lagna in Leo, the 1st house, with Jupiter and
 * Venus. Cancer, 12th house: Sun and Mercury. …". The planet table stays the full text version.
 */
export function chartAriaLabel(
  chart: Chart,
  kind: ChartKind,
  style: ChartStyleName,
  birth: { dateTime: string; place: string },
  t: Messages["chart"],
): string {
  const d = t.drawing;
  const signs = chartSigns(chart, kind, t);
  const name = (b: BodyLabel) => (b.retrograde ? fill(d.aria.retrograde, { name: t.bodies[b.code] }) : t.bodies[b.code]);
  const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(d.aria.comma)}${d.aria.and}${names.at(-1)}`);
  const parts: string[] = [
    fill(d.aria.intro, { style: style === "south" ? d.styleSouth : d.styleNorth, chart: chartTitle(kind, t), dateTime: birth.dateTime, place: birth.place }),
  ];
  const lagna = signs.find((s) => s.isLagna)!;
  const withLagna = lagna.bodies.filter((b) => b.code !== "La").map(name);
  parts.push(
    withLagna.length
      ? fill(d.aria.lagnaWith, { sign: t.signs[lagna.sign - 1]!, bodies: list(withLagna) })
      : fill(d.aria.lagna, { sign: t.signs[lagna.sign - 1]! }),
  );
  for (const s of [...signs].sort((a, b) => a.house - b.house)) {
    if (s.isLagna || s.bodies.length === 0) continue;
    parts.push(fill(d.aria.sign, { sign: t.signs[s.sign - 1]!, house: t.southChart.ordinals[s.house - 1]!, bodies: list(s.bodies.map(name)) }));
  }
  parts.push(d.aria.outro);
  return parts.join(" ");
}

/**
 * The place for the centre, on at most two lines that fit `maxWidth` at `fontSize`. Long labels are
 * shortened by leaving out middle parts (keeping the town and the country), e.g.
 * "Kandivli, Mumbai Suburban, Maharashtra, India" → "Kandivli, Maharashtra, India"; a single part that
 * is still too long is cut with "…".
 */
export function placeLines(label: string, fontSize: number, maxWidth: number): string[] {
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
