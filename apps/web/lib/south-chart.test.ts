// The South Indian chart (step 0.5.2, spec §7.1, D-101): fixed sign boxes, house ordinals from the
// chart's Lagna, labels that fit (the shrink rule), the centre (title, date and time, place; no Moon
// lines, D-129), no degrees in the boxes (D-108). Replaces the 0.3.2.1 tests of the provisional chart.
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { TEXT_BOTTOM, TEXT_TOP, textWidthEm, MIN_FONT, type BodyCode, type BodyLabel } from "./drawn-chart";
import { chartOf } from "./chart-fixtures";
import {
  CELL,
  CENTRE_LINE_WIDTH,
  centreLines,
  CHART_SIZE,
  FONT_SIZES,
  HOUSE_FONT,
  HOUSE_POS,
  LABEL_AREA,
  layoutLabels,
  PLANET_FONT,
  SIGN_CELLS,
  SIGN_FONT,
  SIGN_POS,
  southChartBoxes,
} from "./south-chart";

const t = en.chart;
const CODES: BodyCode[] = ["La", "Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

function expectInside(layout: ReturnType<typeof layoutLabels>) {
  for (const l of layout.labels) {
    expect(l.x).toBeGreaterThanOrEqual(LABEL_AREA.x - 1e-9);
    expect(l.x + l.width).toBeLessThanOrEqual(LABEL_AREA.x + LABEL_AREA.width + 1e-9);
    expect(l.y - layout.fontSize * TEXT_TOP).toBeGreaterThanOrEqual(LABEL_AREA.y - 1e-9);
    expect(l.y + layout.fontSize * TEXT_BOTTOM).toBeLessThanOrEqual(LABEL_AREA.y + LABEL_AREA.height + 1e-9);
  }
}

describe("South Indian layout (D-101)", () => {
  it("puts the 12 fixed signs in the classic boxes", () => {
    const at = (col: number, row: number) => Object.entries(SIGN_CELLS).find(([, [c, r]]) => c === col && r === row)?.[0];
    const name = (col: number, row: number) => t.signs[Number(at(col, row)) - 1];
    expect([0, 1, 2, 3].map((c) => name(c, 0))).toEqual(["Pisces", "Aries", "Taurus", "Gemini"]);
    expect([1, 2].map((r) => name(3, r))).toEqual(["Cancer", "Leo"]);
    expect([3, 2, 1, 0].map((c) => name(c, 3))).toEqual(["Virgo", "Libra", "Scorpio", "Sagittarius"]);
    expect([2, 1].map((r) => name(0, r))).toEqual(["Capricorn", "Aquarius"]);
    for (const [c, r] of [[1, 1], [2, 1], [1, 2], [2, 2]]) expect(at(c!, r!)).toBeUndefined();
    expect(Object.keys(SIGN_CELLS)).toHaveLength(12);
  });

  it("400 × 400 units, sizes as the spec (planets 17, sign names 10, ordinals 10)", () => {
    expect(CHART_SIZE).toBe(400);
    expect(CELL).toBe(100);
    expect([PLANET_FONT, SIGN_FONT, HOUSE_FONT]).toEqual([17, 10, 10]);
    expect(FONT_SIZES[0]).toBe(17);
    expect(FONT_SIZES.at(-1)).toBe(MIN_FONT);
    // Sign name bottom-left, ordinal top-right, the label area between them
    expect(SIGN_POS.y - SIGN_FONT * 0.76).toBeGreaterThanOrEqual(LABEL_AREA.y + LABEL_AREA.height);
    expect(HOUSE_POS.y + HOUSE_FONT * 0.22).toBeLessThanOrEqual(LABEL_AREA.y);
  });

  it("houses run 1–12 clockwise from the Lagna's box, for every Lagna, in D1 and D9", () => {
    const ring = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]];
    for (let lagna = 1; lagna <= 12; lagna++) {
      for (const kind of ["d1", "d9"] as const) {
        const other = ((lagna + 4) % 12) + 1;
        const chart = chartOf({ La: kind === "d1" ? { d1: lagna, d9: other } : { d1: other, d9: lagna } });
        const boxes = southChartBoxes(chart, t, kind);
        const lagnaBox = boxes.find((b) => b.isLagna)!;
        expect(lagnaBox.sign).toBe(lagna);
        expect(lagnaBox.houseLabel).toBe("1st");
        const cells = ring.map(([c, r]) => boxes.find((b) => b.col === c && b.row === r)!);
        const start = cells.indexOf(lagnaBox);
        for (let i = 0; i < 12; i++) expect(cells[(start + i) % 12]!.house).toBe(i + 1);
        expect(cells[(start + 11) % 12]!.houseLabel).toBe("12th");
      }
    }
  });

  it("no degrees in any box, whatever the chart (D-108)", () => {
    const boxes = southChartBoxes(chartOf(Object.fromEntries(CODES.map((c, i) => [c, { d1: (i % 12) + 1, r: true }]))), t);
    for (const b of boxes) for (const l of b.layout.labels) expect(l.text).not.toMatch(/\d|°/);
  });
});

describe("the shrink rule (D-143 item 7)", () => {
  const label = (code: BodyCode, r = false): BodyLabel => ({ code, retrograde: r, text: r ? `${code} (R)` : code });
  // Widest real labels: (R) on every graha that can be retrograde (never Su, Mo; never shown on Ra, Ke)
  const worst = CODES.map((c) => label(c, ["Ma", "Me", "Ju", "Ve", "Sa"].includes(c)));

  it("one or two planets keep the full 17 units, two per line; La on its own first line", () => {
    expect(layoutLabels([label("Su")]).fontSize).toBe(17);
    const two = layoutLabels([label("Su"), label("Me")]);
    expect(two.fontSize).toBe(17);
    expect(two.rows).toBe(1);
    const lagna = layoutLabels([label("La"), label("Ju"), label("Ve")]);
    expect(lagna.fontSize).toBe(17);
    expect(lagna.rows).toBe(2);
    expect(lagna.labels[0]!.code).toBe("La");
    expect(lagna.labels[1]!.y).toBeGreaterThan(lagna.labels[0]!.y);
    expectInside(lagna);
  });

  it("fits every count from 1 to 10 (even impossible ones), shrinking only as needed, never below 9.5", () => {
    let previous = Infinity;
    for (let n = 1; n <= 10; n++) {
      const layout = layoutLabels(worst.slice(0, n));
      expect(layout.labels).toHaveLength(n);
      expectInside(layout);
      expect(layout.fontSize).toBeLessThanOrEqual(previous);
      expect(layout.fontSize).toBeGreaterThanOrEqual(MIN_FONT);
      previous = layout.fontSize;
    }
  });

  it("labels of one row never overlap", () => {
    const layout = layoutLabels(worst);
    const byRow = new Map<number, typeof layout.labels>();
    for (const l of layout.labels) byRow.set(l.y, [...(byRow.get(l.y) ?? []), l]);
    for (const row of byRow.values()) for (let i = 1; i < row.length; i++) expect(row[i]!.x).toBeGreaterThanOrEqual(row[i - 1]!.x + row[i - 1]!.width);
  });
});

describe("the centre (spec §7.1, D-143 item 5)", () => {
  it("title, date and time, place: nothing else (no Moon lines)", () => {
    const lines = centreLines(t.drawing.titleD1, "14 Aug 1992 · 6:45 AM", "Chennai, Tamil Nadu, India");
    expect(lines.map((l) => l.text)).toEqual(["Rasi chart (D-1)", "14 Aug 1992 · 6:45 AM", "Chennai, Tamil Nadu, India"]);
    expect(lines.map((l) => l.y)).toEqual([184, 210, 228]); // as drawn
    expect(lines.map((l) => l.kind)).toEqual(["title", "birth", "place"]);
    expect(lines[0]!.size).toBe(16);
    expect(centreLines(t.drawing.titleD9, "x", "y")[0]!.text).toBe("Navamsa (D-9)");
  });

  it("a long place uses two lines, shortened, inside the centre", () => {
    for (const place of ["Near Kandivli, Mumbai Suburban, Maharashtra, India", "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch, Wales, United Kingdom"]) {
      const lines = centreLines(t.drawing.titleD9, "30 Sep 2000 · 12:59 AM", place);
      expect(lines.length).toBeLessThanOrEqual(4);
      for (const l of lines) expect(textWidthEm(l.text) * l.size, l.text).toBeLessThanOrEqual(CENTRE_LINE_WIDTH);
      expect(lines[0]!.y - 16).toBeGreaterThanOrEqual(CELL + 8);
      expect(lines.at(-1)!.y + 4).toBeLessThanOrEqual(3 * CELL - 8);
    }
  });
});
