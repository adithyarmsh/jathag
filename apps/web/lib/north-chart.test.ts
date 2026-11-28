// The North Indian chart (step 0.5.2, spec §7.2, D-130): fixed houses (1st = the top diamond, counting
// counter-clockwise), the sign in each house from the chart's own Lagna, short sign names, labels inside
// their house and clear of the sign name; tested for all 12 Lagnas in D1 and D9.
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { MIN_FONT, TEXT_BOTTOM, TEXT_TOP, type BodyCode } from "./drawn-chart";
import { chartOf } from "./chart-fixtures";
import { houseArea, insideHouse, NORTH_FONT_SIZES, NORTH_HOUSES, NORTH_PLANET_FONT, NORTH_SIGN_FONT, northChartHouses } from "./north-chart";

const t = en.chart;
const CODES: BodyCode[] = ["La", "Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

/** Angle of a point seen from the chart's middle, counter-clockwise from straight up (screen y points down). */
const angle = ([x, y]: readonly [number, number]) => (Math.atan2(-(x - 200), -(y - 200)) * 180) / Math.PI;

describe("North Indian houses", () => {
  it("sizes as the spec: planets 15, sign names 11", () => {
    expect([NORTH_PLANET_FONT, NORTH_SIGN_FONT]).toEqual([15, 11]);
    expect(NORTH_FONT_SIZES.at(-1)).toBe(MIN_FONT);
  });

  it("house 1 is the top diamond; houses run counter-clockwise", () => {
    expect(NORTH_HOUSES[1]!.polygon).toEqual([[200, 0], [300, 100], [200, 200], [100, 100]]);
    const angles = Array.from({ length: 12 }, (_, i) => {
      const a = angle(NORTH_HOUSES[i + 1]!.centre);
      return (a + 360) % 360;
    });
    expect(angles[0]).toBeCloseTo(0, 6); // straight up
    for (let i = 1; i < 12; i++) expect(angles[i]!).toBeGreaterThan(angles[i - 1]!); // counter-clockwise
    // Diamonds at 1, 4, 7, 10 (top, left, bottom, right)
    expect([1, 4, 7, 10].map((h) => NORTH_HOUSES[h]!.polygon.length)).toEqual([4, 4, 4, 4]);
    expect([2, 3, 5, 6, 8, 9, 11, 12].every((h) => NORTH_HOUSES[h]!.polygon.length === 3)).toBe(true);
  });

  it("every house's centre and sign name sit inside the house", () => {
    for (let h = 1; h <= 12; h++) {
      expect(insideHouse(h, ...NORTH_HOUSES[h]!.centre), `house ${h}`).toBe(true);
      expect(insideHouse(h, ...NORTH_HOUSES[h]!.sign), `house ${h} sign`).toBe(true);
    }
  });

  it("each house shows the sign that falls there, for all 12 Lagnas, in D1 and D9", () => {
    for (let lagna = 1; lagna <= 12; lagna++) {
      for (const kind of ["d1", "d9"] as const) {
        const other = ((lagna + 6) % 12) + 1;
        const chart = chartOf({ La: kind === "d1" ? { d1: lagna, d9: other } : { d1: other, d9: lagna } });
        const houses = northChartHouses(chart, t, kind);
        expect(houses.map((h) => h.sign)).toEqual(Array.from({ length: 12 }, (_, i) => ((lagna - 1 + i) % 12) + 1));
        expect(houses[0]!.isLagna).toBe(true);
        expect(houses.filter((h) => h.isLagna)).toHaveLength(1);
        expect(houses[0]!.signShort).toBe(t.signsShort[lagna - 1]);
        expect(houses[0]!.layout.labels[0]!.code).toBe("La");
      }
    }
  });

  it("short sign names Ari … Pis", () => {
    expect(t.signsShort).toEqual(["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"]);
  });

  it("crowded houses: La + 8 grahas (the most a real sign can hold) fit in EVERY house, at 9.5 or more", () => {
    const retro = ["Ma", "Me", "Ju", "Ve", "Sa"];
    for (let house = 1; house <= 12; house++) {
      // Put everything but Ketu in the sign of `house` (Lagna Aries → sign = house).
      const sign = house;
      const chart = chartOf(
        Object.fromEntries(CODES.map((c) => [c, c === "Ke" ? { d1: ((sign + 5) % 12) + 1 } : { d1: c === "La" ? 1 : sign, r: retro.includes(c) }])),
      );
      // Lagna in Aries; for house 1 everything is with the Lagna.
      const h = northChartHouses(chart, t, "d1")[house - 1]!;
      const area = houseArea(house);
      expect(h.layout.fontSize, `house ${house}`).toBeGreaterThanOrEqual(MIN_FONT);
      for (const l of h.layout.labels) {
        const top = l.y - TEXT_TOP * h.layout.fontSize;
        const bottom = l.y + TEXT_BOTTOM * h.layout.fontSize;
        for (const [x, y] of [[l.x, top], [l.x + l.width, top], [l.x, bottom], [l.x + l.width, bottom]] as const)
          expect(insideHouse(house, x, y), `house ${house} ${l.code}`).toBe(true);
        expect(top).toBeGreaterThanOrEqual(area.minY - 1e-9);
        expect(bottom).toBeLessThanOrEqual(area.maxY + 1e-9);
      }
    }
  });

  it("one or two planets keep the full 15 units in every house", () => {
    for (let house = 1; house <= 12; house++) {
      const chart = chartOf({ La: { d1: 1 }, Su: { d1: house }, Me: { d1: house }, Mo: { d1: 7 }, Ma: { d1: 7 }, Ju: { d1: 7 }, Ve: { d1: 7 }, Sa: { d1: 7 }, Ra: { d1: 7 }, Ke: { d1: 1 } });
      const h = northChartHouses(chart, t, "d1")[house - 1]!;
      if (house === 7) continue;
      expect(h.layout.fontSize, `house ${house}`).toBe(15);
    }
  });
});
