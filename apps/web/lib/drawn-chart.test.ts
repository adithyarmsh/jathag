// The drawn charts' data (step 0.5.2, D-143): D1 and D9, South and North.
// 1. Hand-made charts: houses from each chart's own Lagna, labels, (R) rules, the reverse lookup.
// 2. All 29 reference births through the engine: every body exactly once in the sign JHora's answer key
//    gives (D1 = divisional "1", D9 = divisional "9", D-079), houses counted from that chart's Lagna,
//    (R) only where the planet is retrograde (as JHora marks it in every divisional chart), never on
//    Rahu/Ketu; the same signs and houses in the South boxes and the North houses; every label fits.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChartResponse } from "@jathag/api";
import { calculateChart } from "@jathag/engine";
import { EXPECTED_DIR, loadBirths } from "../../../tests/reference/scripts/parse.mjs";
import en from "../messages/en.json";
import { TABLE_BODIES } from "./chart-format";
import { chartAriaLabel, chartSigns, houseFromLagna, signIn, signOfHouse, textWidthEm, TEXT_BOTTOM, TEXT_TOP, type BodyCode, type ChartKind } from "./drawn-chart";
import { houseArea, insideHouse, northChartHouses } from "./north-chart";
import { chartOf } from "./chart-fixtures";
import { LABEL_AREA, SIGN_CELLS, southChartBoxes } from "./south-chart";

const t = en.chart;
type Chart = ChartResponse["chart"];

describe("houses and signs", () => {
  it("counts houses from the Lagna, and back", () => {
    expect(houseFromLagna(5, 5)).toBe(1);
    expect(houseFromLagna(4, 5)).toBe(12);
    expect(houseFromLagna(1, 12)).toBe(2);
    for (let lagna = 1; lagna <= 12; lagna++)
      for (let house = 1; house <= 12; house++) expect(houseFromLagna(signOfHouse(house, lagna), lagna)).toBe(house);
  });

  // R01-like: D1 Lagna Leo, D9 Lagna Gemini (as JHora).
  const chart = chartOf({
    La: { d1: 5, d9: 3 },
    Su: { d1: 4, d9: 12 },
    Mo: { d1: 11, d9: 8 },
    Ma: { d1: 2, d9: 3 },
    Sa: { d1: 10, d9: 4, r: true },
    Ra: { d1: 9, d9: 2, r: true },
    Ke: { d1: 3, d9: 8, r: true },
  });

  it("D1 uses sign, D9 uses navamsaSign", () => {
    expect(signIn(chart, "Sa", "d1")).toBe(10);
    expect(signIn(chart, "Sa", "d9")).toBe(4);
  });

  it("D9 houses count from the D9 Lagna (D-143 item 3)", () => {
    const d9 = chartSigns(chart, "d9", t);
    expect(d9.find((s) => s.isLagna)!.sign).toBe(3);
    expect(d9.find((s) => s.sign === 3)!.house).toBe(1);
    expect(d9.find((s) => s.sign === 4)!.house).toBe(2); // Saturn's D9 sign
    expect(d9.find((s) => s.sign === 2)!.house).toBe(12);
    const d1 = chartSigns(chart, "d1", t);
    expect(d1.find((s) => s.sign === 5)!.house).toBe(1);
  });

  it("(R) in both charts, never on Rahu, Ketu or the Lagna (D-143 item 4)", () => {
    for (const kind of ["d1", "d9"] as ChartKind[]) {
      const all = chartSigns(chart, kind, t).flatMap((s) => s.bodies);
      expect(all.find((b) => b.code === "Sa")!.text).toBe("Sa (R)");
      expect(all.find((b) => b.code === "Ra")!.text).toBe("Ra");
      expect(all.find((b) => b.code === "Ke")!.text).toBe("Ke");
      expect(all.find((b) => b.code === "La")!.text).toBe("La");
      for (const b of all) expect(b.text).not.toMatch(/\d|°/);
    }
  });

  it("the screen-reader sentence names the chart, the Lagna and every occupied sign with its house", () => {
    const label = chartAriaLabel(chart, "d9", "north", { dateTime: "14 Aug 1992 · 6:45 AM", place: "Chennai, Tamil Nadu, India" }, t);
    expect(label).toContain("North Indian Navamsa (D-9) for 14 Aug 1992 · 6:45 AM, Chennai, Tamil Nadu, India.");
    expect(label).toContain("Lagna in Gemini, the 1st house, with Mars.");
    expect(label).toContain("Cancer, 2nd house: Saturn (retrograde).");
    expect(label).toContain("Scorpio, 6th house: Moon and Ketu.");
    expect(label).toMatch(/The planet table below lists every position in words\.$/);
    expect(label).not.toMatch(/Moon sign|Nakshatra|Pada/); // no Moon lines (D-129 item 5)
  });

  it("text widths: wider text is wider", () => {
    expect(textWidthEm("Sa (R)")).toBeGreaterThan(textWidthEm("Sa"));
  });
});

// ---- All 29 reference births ----------------------------------------------------------------------

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const expected = (id: string) => JSON.parse(readFileSync(join(EXPECTED_DIR, `${id}.json`), "utf8"));

function utcOf(b: Birth): string {
  const [y, mo, d] = b.date.split("-").map(Number);
  const [h, mi, sec = 0] = b.time.split(":").map(Number);
  return new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, sec) - Math.round(b.utc_offset * 3600) * 1000).toISOString();
}

/** The most crowded box / house among the 29 births (reported in the PR). */
const crowded = { south: { n: 0, size: 99, where: "" }, north: { n: 0, size: 99, where: "" } };

describe("all 29 reference births: D1 and D9, South and North, match the JHora answer key", () => {
  it("covers 29 births", () => expect(births).toHaveLength(29));

  it.each(births.map((b) => [b.id, b] as const))("%s", (id, b) => {
    const chart = calculateChart({ utc: utcOf(b), lat: b.lat, lng: b.lng }) as unknown as Chart;
    const key = expected(id);
    for (const [kind, n] of [["d1", "1"], ["d9", "9"]] as const) {
      const jhora: Record<BodyCode, number> = key.divisional[n];
      const label = `${id} ${kind}`;
      const lagna = jhora.La;
      // South: every body exactly once, in its JHora sign's fixed box; houses from this chart's Lagna.
      const boxes = southChartBoxes(chart, t, kind);
      const seen = boxes.flatMap((box) => box.bodies.map((body) => ({ box, body })));
      expect(seen.map((s) => s.body.code).sort(), label).toEqual([...TABLE_BODIES].sort());
      for (const { box, body } of seen) {
        expect(box.sign, `${label} ${body.code}`).toBe(jhora[body.code]);
        expect([box.col, box.row]).toEqual(SIGN_CELLS[box.sign]);
        expect(box.house, `${label} ${body.code}`).toBe(houseFromLagna(jhora[body.code], lagna));
        expect(body.text).toMatch(new RegExp(`^${t.abbreviations[body.code]}( \\(R\\))?$`));
        const r = body.text.endsWith(t.southChart.retrogradeMark);
        if (body.code === "La" || body.code === "Ra" || body.code === "Ke") expect(r, `${label} ${body.code}`).toBe(false);
        // JHora marks retrograde in each divisional chart; (R) where it does (Sun to Saturn).
        else expect(r, `${label} ${body.code}`).toBe(key.chartRetrograde[n][body.code]);
      }
      const lagnaBoxes = boxes.filter((x) => x.isLagna);
      expect(lagnaBoxes.map((x) => x.sign), label).toEqual([lagna]);
      expect(lagnaBoxes[0]!.house).toBe(1);
      for (const box of boxes) {
        for (const l of box.layout.labels) {
          expect(l.x, `${label} ${l.code}`).toBeGreaterThanOrEqual(LABEL_AREA.x - 1e-9);
          expect(l.x + l.width).toBeLessThanOrEqual(LABEL_AREA.x + LABEL_AREA.width + 1e-9);
          expect(l.y - TEXT_TOP * box.layout.fontSize).toBeGreaterThanOrEqual(LABEL_AREA.y - 1e-9);
          expect(l.y + TEXT_BOTTOM * box.layout.fontSize).toBeLessThanOrEqual(LABEL_AREA.y + LABEL_AREA.height + 1e-9);
        }
        if (box.bodies.length > crowded.south.n || (box.bodies.length === crowded.south.n && box.layout.fontSize < crowded.south.size))
          Object.assign(crowded.south, { n: box.bodies.length, size: box.layout.fontSize, where: `${label} ${box.signName}` });
      }
      // North: house 1 holds the Lagna's sign, then the signs in order; same bodies as South.
      const houses = northChartHouses(chart, t, kind);
      expect(houses.map((h) => h.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      for (const h of houses) {
        expect(h.sign, `${label} house ${h.house}`).toBe(signOfHouse(h.house, lagna));
        const south = boxes.find((x) => x.sign === h.sign)!;
        expect(h.bodies.map((x) => x.text)).toEqual(south.bodies.map((x) => x.text));
        expect(south.house).toBe(h.house);
        const area = houseArea(h.house);
        for (const l of h.layout.labels) {
          const top = l.y - TEXT_TOP * h.layout.fontSize;
          const bottom = l.y + TEXT_BOTTOM * h.layout.fontSize;
          for (const [x, y] of [[l.x, top], [l.x + l.width, top], [l.x, bottom], [l.x + l.width, bottom]] as const) {
            expect(insideHouse(h.house, x, y), `${label} house ${h.house} ${l.code}`).toBe(true);
          }
          expect(top).toBeGreaterThanOrEqual(area.minY - 1e-9);
          expect(bottom).toBeLessThanOrEqual(area.maxY + 1e-9);
        }
        if (h.bodies.length > crowded.north.n || (h.bodies.length === crowded.north.n && h.layout.fontSize < crowded.north.size))
          Object.assign(crowded.north, { n: h.bodies.length, size: h.layout.fontSize, where: `${label} house ${h.house}` });
      }
      expect(houses[0]!.bodies[0]!.code, label).toBe("La");
    }
  });

  it("the most crowded box in each style (for the PR report)", () => {
    // Printed so the report can name it; the sizes must stay at or above the smallest allowed (9.5).
    console.info(`[0.5.2] most crowded: South ${JSON.stringify(crowded.south)} · North ${JSON.stringify(crowded.north)}`);
    expect(crowded.south.size).toBeGreaterThanOrEqual(9.5);
    expect(crowded.north.size).toBeGreaterThanOrEqual(9.5);
  });
});

