import { describe, expect, it } from "vitest";
import type { ChartResponse } from "@jathag/api";
import en from "../messages/en.json";
import {
  CELL,
  CENTRE_LINE_WIDTH,
  CENTRE_PADDING,
  centreLines,
  HOUSE_BASELINE,
  HOUSE_FONT,
  moonFacts,
  SIGN_BASELINE,
  SIGN_FONT,
  FONT_SIZES,
  houseFromLagna,
  LABEL_AREA,
  layoutLabels,
  PLACE_FONT,
  placeLines,
  SIGN_CELLS,
  southChartBoxes,
  textWidthEm,
} from "./south-chart";

const t = en.chart;
type Chart = ChartResponse["chart"];
type Code = keyof Chart["bodies"];
const CODES: Code[] = ["La", "Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

/** A made-up chart: every body at the given sign and degree (only the fields the chart uses). */
function chartWith(place: Partial<Record<Code, { sign: number; deg: number; retrograde?: boolean }>>): Chart {
  const bodies = {} as Record<Code, unknown>;
  for (const code of CODES) {
    const p = place[code] ?? { sign: 1, deg: 0 };
    bodies[code] = { sign: p.sign, lon: (p.sign - 1) * 30 + p.deg, retrograde: p.retrograde ?? false };
  }
  return { bodies } as unknown as Chart;
}

/** Every label sits inside its box's label area (estimated widths). */
function expectInside(layout: ReturnType<typeof layoutLabels>) {
  for (const l of layout.labels) {
    expect(l.x).toBeGreaterThanOrEqual(LABEL_AREA.x - 1e-9);
    expect(l.x + l.width).toBeLessThanOrEqual(LABEL_AREA.x + LABEL_AREA.width + 1e-9);
    // Text top (baseline − ~0.8 em) and bottom (baseline + ~0.25 em for descenders like "(")
    expect(l.y - layout.fontSize * 0.86).toBeGreaterThanOrEqual(LABEL_AREA.y - 1e-9);
    expect(l.y + layout.fontSize * 0.25).toBeLessThanOrEqual(LABEL_AREA.y + LABEL_AREA.height + 1e-9);
  }
}

describe("South Indian layout", () => {
  it("puts the 12 fixed signs in the classic boxes", () => {
    const at = (col: number, row: number) =>
      Object.entries(SIGN_CELLS).find(([, [c, r]]) => c === col && r === row)?.[0];
    const name = (col: number, row: number) => t.signs[Number(at(col, row)) - 1];
    // Top row, left to right
    expect([0, 1, 2, 3].map((c) => name(c, 0))).toEqual(["Pisces", "Aries", "Taurus", "Gemini"]);
    // Right column, below Gemini, top to bottom
    expect([1, 2].map((r) => name(3, r))).toEqual(["Cancer", "Leo"]);
    // Bottom row, right to left
    expect([3, 2, 1, 0].map((c) => name(c, 3))).toEqual(["Virgo", "Libra", "Scorpio", "Sagittarius"]);
    // Left column, bottom to top (above Sagittarius)
    expect([2, 1].map((r) => name(0, r))).toEqual(["Capricorn", "Aquarius"]);
    // The middle 2 × 2 is empty (the centre)
    for (const [c, r] of [[1, 1], [2, 1], [1, 2], [2, 2]]) expect(at(c!, r!)).toBeUndefined();
    expect(Object.keys(SIGN_CELLS)).toHaveLength(12);
  });

  it("runs the signs clockwise round the edge", () => {
    // Walking the edge clockwise from Pisces must give Pisces, Aries, …, Aquarius.
    const ring = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]];
    const signs = ring.map(([c, r]) => Number(Object.entries(SIGN_CELLS).find(([, [x, y]]) => x === c && y === r)![0]));
    expect(signs).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("counts houses from the Lagna's sign", () => {
    expect(houseFromLagna(5, 5)).toBe(1);
    expect(houseFromLagna(6, 5)).toBe(2);
    expect(houseFromLagna(4, 5)).toBe(12);
    expect(houseFromLagna(11, 5)).toBe(7);
    expect(houseFromLagna(1, 12)).toBe(2);
  });
});

describe("southChartBoxes", () => {
  const chart = chartWith({
    La: { sign: 5, deg: 3.99 },
    Su: { sign: 4, deg: 27.999 },
    Mo: { sign: 9, deg: 0.2 },
    Sa: { sign: 10, deg: 12.7, retrograde: true },
    Ra: { sign: 9, deg: 15.5, retrograde: true },
    Ke: { sign: 3, deg: 15.5, retrograde: true },
  });
  const boxes = southChartBoxes(chart, t);
  const box = (sign: number) => boxes.find((b) => b.sign === sign)!;

  it("gives 12 boxes, Lagna's box = 1st house, marked", () => {
    expect(boxes.map((b) => b.sign)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(box(5).isLagna).toBe(true);
    expect(boxes.filter((b) => b.isLagna)).toHaveLength(1);
    expect(box(5).houseLabel).toBe("1st house");
    expect(box(11).houseLabel).toBe("7th house");
    expect(box(4).houseLabel).toBe("12th house");
    expect(box(5).signName).toBe("Leo");
  });

  it("shows the abbreviation only (no degrees, D-108) and marks (R), never on Rahu/Ketu", () => {
    expect(box(5).bodies.map((b) => b.text)).toEqual(["La"]);
    expect(box(4).bodies.map((b) => b.text)).toEqual(["Su"]);
    expect(box(10).bodies.map((b) => b.text)).toEqual(["Sa (R)"]);
    expect(box(9).bodies.map((b) => b.text)).toEqual(["Mo", "Ra"]);
    expect(box(3).bodies.map((b) => b.text)).toEqual(["Ke"]);
  });

  it("no planet label contains a digit, whatever the degree", () => {
    for (const deg of [0, 9.99, 15.5, 28.75, 29.999]) {
      const all = southChartBoxes(chartWith(Object.fromEntries(CODES.map((c, i) => [c, { sign: (i % 12) + 1, deg, retrograde: true }]))), t);
      for (const b of all.flatMap((x) => x.bodies)) expect(b.text).not.toMatch(/\d/);
      for (const l of all.flatMap((x) => x.layout.labels)) expect(l.text).not.toMatch(/\d/);
    }
  });

  it("the card heading is 'South Indian Birth Chart'", () => {
    expect(t.southChart.heading).toBe("South Indian Birth Chart");
    // The key line and the screen-reader description don't mention degrees
    expect(t.southChart.key).not.toMatch(/degree|°/i);
    expect(t.southChart.svgDescription).not.toMatch(/degree|°/i);
  });

  it("keeps the table order inside a box (La first)", () => {
    const crowded = southChartBoxes(chartWith({}), t); // everything in Aries
    expect(crowded[0]!.bodies.map((b) => b.code)).toEqual(CODES);
  });
});

describe("crowded boxes stay inside", () => {
  const worst = CODES.map((code) => ({
    code,
    // Widest possible labels: (R) on every graha that can be retrograde (never Su, Mo, Ra, Ke)
    text: `${code}${["Ma", "Me", "Ju", "Ve", "Sa"].includes(code) ? " (R)" : ""}`,
  }));

  it("fits all 9 grahas + La in one box, never smaller than the sign names (9.5)", () => {
    const layout = layoutLabels(worst);
    expect(layout.labels).toHaveLength(10);
    expectInside(layout);
    expect(layout.fontSize).toBe(9.5);
    expect(FONT_SIZES[0]).toBe(14);
  });

  it("fits every count from 1 to 10, shrinking the text only as needed", () => {
    let previous = Infinity;
    for (let n = 1; n <= 10; n++) {
      const layout = layoutLabels(worst.slice(0, n));
      expect(layout.labels).toHaveLength(n);
      expectInside(layout);
      expect(layout.fontSize).toBeLessThanOrEqual(previous);
      previous = layout.fontSize;
    }
    // One or two labels get the largest size; up to three stay at 13 or more
    expect(layoutLabels(worst.slice(0, 1)).fontSize).toBe(14);
    expect(layoutLabels(worst.slice(0, 2)).fontSize).toBe(14);
    expect(layoutLabels(worst.slice(0, 3)).fontSize).toBeGreaterThanOrEqual(13);
  });

  it("fits a real crowded chart (La + 8 grahas in one sign) through southChartBoxes", () => {
    const chart = chartWith(
      Object.fromEntries(
        // Retrograde wherever a real chart can be (never the Sun or the Moon)
        CODES.map((c) => [c, c === "Ke" ? { sign: 7, deg: 28.5 } : { sign: 1, deg: 28.5, retrograde: c !== "Su" && c !== "Mo" }]),
      ),
    );
    const aries = southChartBoxes(chart, t)[0]!;
    expect(aries.bodies).toHaveLength(9);
    expectInside(aries.layout);
    expect(aries.layout.fontSize).toBeGreaterThanOrEqual(9.5);
  });

  it("box geometry: label area sits between the sign name and the house number", () => {
    expect(LABEL_AREA.x + LABEL_AREA.width).toBeLessThanOrEqual(CELL);
    expect(LABEL_AREA.y + LABEL_AREA.height).toBeLessThanOrEqual(CELL - 12);
  });
});

describe("placeLines", () => {
  const fits = (s: string) => textWidthEm(s) * PLACE_FONT <= CENTRE_LINE_WIDTH;

  it("keeps a short place whole", () => {
    expect(placeLines("Chennai, Tamil Nadu, India").join(" ")).toBe("Chennai, Tamil Nadu, India");
  });

  it("uses at most two lines and leaves out middle parts when long", () => {
    const lines = placeLines("Kandivli, Mumbai Suburban, Maharashtra, India");
    expect(lines.length).toBeLessThanOrEqual(2);
    lines.forEach((l) => expect(fits(l)).toBe(true));
    const text = lines.join(" ");
    expect(text.startsWith("Kandivli")).toBe(true);
    expect(text.endsWith("India")).toBe(true);
  });

  it("cuts a single very long name with …", () => {
    const lines = placeLines("Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch, Wales, United Kingdom");
    expect(lines.length).toBeLessThanOrEqual(2);
    lines.forEach((l) => expect(fits(l)).toBe(true));
    expect(lines[0]!.endsWith("…")).toBe(true);
  });
});

describe("chart centre with the Moon's sign, nakshatra and pada (D-115 item 3)", () => {
  const moonChart = (sign: number, nakshatra: number, pada: number) =>
    ({ bodies: { Mo: { sign, nakshatra, pada } } }) as unknown as Chart;
  const birth = { date: "28 September 1992", time: "12:45 PM", place: "Kandivli, Mumbai Suburban, Maharashtra, India" };

  it("puts the lines in order: title, date, time, Moon sign, nakshatra, pada, place", () => {
    const lines = centreLines(moonChart(9, 26, 4), birth, t);
    expect(lines.map((l) => l.text)).toEqual([
      "Rasi chart (D-1)",
      "28 September 1992",
      "12:45 PM",
      "Moon sign (Rasi): Sagittarius",
      "Nakshatra: Uttara Bhadrapada",
      "Pada: 4",
      ...placeLines(birth.place),
    ]);
    expect(lines.map((l) => l.kind)).toEqual(["title", "birth", "birth", "moon", "moon", "moon", "place", "place"].slice(0, lines.length));
    expect(moonFacts(moonChart(9, 26, 4), t)).toEqual({ sign: "Sagittarius", nakshatra: "Uttara Bhadrapada", pada: "4" });
  });

  it("fits every sign × nakshatra with the longest place and date: inside the width, clear of the frame, no overlap", () => {
    const longPlace = "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch, Wales, United Kingdom";
    const longDate = "30 September 2000";
    for (let sign = 1; sign <= 12; sign++)
      for (let nak = 1; nak <= 27; nak++) {
        const lines = centreLines(moonChart(sign, nak, 4), { date: longDate, time: "12:59 AM", place: longPlace }, t);
        for (const l of lines) expect(textWidthEm(l.text) * l.size, l.text).toBeLessThanOrEqual(CENTRE_LINE_WIDTH);
        const top = lines[0]!.y - lines[0]!.size; // above the first baseline: at most one font size
        const bottom = lines.at(-1)!.y + lines.at(-1)!.size * 0.25;
        expect(top).toBeGreaterThanOrEqual(CELL + CENTRE_PADDING);
        expect(bottom).toBeLessThanOrEqual(3 * CELL - CENTRE_PADDING);
        for (let i = 1; i < lines.length; i++) expect(lines[i]!.y - lines[i - 1]!.y).toBeGreaterThanOrEqual(lines[i]!.size);
      }
  });

  it("box labels are about 30% smaller than before (9.5 / 9), planet labels unchanged", () => {
    expect(SIGN_FONT / 9.5).toBeCloseTo(0.7, 1);
    expect(HOUSE_FONT / 9).toBeCloseTo(0.7, 1);
    expect(FONT_SIZES).toEqual([14, 13, 12, 11, 10, 9.5]);
    expect(LABEL_AREA).toEqual({ x: 3, y: 17, width: CELL - 6, height: 49 });
    // The sign name sits above the label area, the house label below it
    expect(SIGN_BASELINE).toBeLessThanOrEqual(LABEL_AREA.y);
    expect(HOUSE_BASELINE - HOUSE_FONT * 0.75).toBeGreaterThanOrEqual(LABEL_AREA.y + LABEL_AREA.height);
  });

  it("the screen-reader description carries the three facts", () => {
    expect(t.southChart.svgDescription).toContain("{moonSign}");
    expect(t.southChart.svgDescription).toContain("{nakshatra}");
    expect(t.southChart.svgDescription).toContain("{pada}");
  });
});
