// Small helpers of the full birth form (step 0.4.6): typed coordinates, the UTC-offset list, the
// remembered chart style, the first field to fix, and the "also known as" line.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { searchPlaces } from "@jathag/api";
import { PlaceIndex } from "@jathag/places";
import en from "../messages/en.json";
import { CHART_STYLE_KEY, readChartStyle, saveChartStyle } from "./chart-style";
import { formatCoordinateShort, parseCoordinate } from "./coordinates";
import { checkDate, checkTime, firstProblem } from "./form-checks";
import { alsoKnownAsLine } from "./place-suggestion";
import { DEFAULT_UTC_OFFSET, UTC_OFFSETS, utcOffsetLabel } from "./utc-offsets";

describe("typed coordinates", () => {
  it.each([
    ["13.0827", "lat", 13.0827],
    ["-33.8688", "lat", -33.8688],
    ["−33.8688", "lat", -33.8688],
    ["13,0827", "lat", 13.0827],
    [" 80.2707 ", "lng", 80.2707],
    ["90", "lat", 90],
    ["-180", "lng", -180],
    [".5", "lng", 0.5],
  ] as const)("%s (%s) → %s", (text, axis, value) => {
    expect(parseCoordinate(text, axis)).toBe(value);
  });
  it.each([
    ["", "lat"],
    ["abc", "lat"],
    ["90.1", "lat"],
    ["-91", "lat"],
    ["180.5", "lng"],
    ["13.08 N", "lat"],
    ["1e2", "lng"],
    ["--3", "lng"],
  ] as const)("%s (%s) is refused", (text, axis) => {
    expect(parseCoordinate(text, axis)).toBeNull();
  });
  it("short form under the place: degrees and minutes", () => {
    expect(formatCoordinateShort(13.08784, "lat")).toBe("13° 05′ N");
    expect(formatCoordinateShort(80.27847, "lng")).toBe("80° 17′ E");
    expect(formatCoordinateShort(-33.8688, "lat")).toBe("33° 52′ S");
    expect(formatCoordinateShort(-74.00597, "lng")).toBe("74° 00′ W");
  });
});

describe("UTC offsets in the Time zone dropdown", () => {
  it("the real steps from UTC−12:00 to UTC+14:00, default UTC+5:30", () => {
    expect(UTC_OFFSETS.map(utcOffsetLabel)).toEqual([
      "UTC−12:00", "UTC−11:00", "UTC−10:00", "UTC−9:30", "UTC−9:00", "UTC−8:00", "UTC−7:00", "UTC−6:00", "UTC−5:00",
      "UTC−4:00", "UTC−3:30", "UTC−3:00", "UTC−2:00", "UTC−1:00", "UTC±0:00", "UTC+1:00", "UTC+2:00", "UTC+3:00",
      "UTC+3:30", "UTC+4:00", "UTC+4:30", "UTC+5:00", "UTC+5:30", "UTC+5:45", "UTC+6:00", "UTC+6:30", "UTC+7:00",
      "UTC+8:00", "UTC+8:45", "UTC+9:00", "UTC+9:30", "UTC+10:00", "UTC+10:30", "UTC+11:00", "UTC+12:00", "UTC+12:45",
      "UTC+13:00", "UTC+14:00",
    ]);
    expect(UTC_OFFSETS).toContain(DEFAULT_UTC_OFFSET);
    expect(utcOffsetLabel(DEFAULT_UTC_OFFSET)).toBe("UTC+5:30");
    expect(UTC_OFFSETS[3]).toBe(-(9 * 3600 + 30 * 60));
    // All within what the chart API accepts (±18 h, whole seconds)
    for (const o of UTC_OFFSETS) expect(Math.abs(o)).toBeLessThanOrEqual(18 * 3600);
  });
});

describe("chart style: South the first time, then the last choice", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };
  it("first visit South; after choosing North and calculating, North", () => {
    const s = memory();
    expect(readChartStyle(s)).toBe("south");
    saveChartStyle(s, "north");
    expect(readChartStyle(s)).toBe("north");
    expect([...s.m.keys()]).toEqual([CHART_STYLE_KEY]);
    expect(s.m.get("chartStyle")).toBe("north");
  });
  it("unknown values, no storage or blocked storage → South, no crash", () => {
    const s = memory();
    s.setItem(CHART_STYLE_KEY, "east");
    expect(readChartStyle(s)).toBe("south");
    expect(readChartStyle(null)).toBe("south");
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readChartStyle(blocked)).toBe("south");
    expect(() => saveChartStyle(blocked, "north")).not.toThrow();
  });

  it('page code stores only "theme" and "chartStyle" in the browser (no sessionStorage, no cookies)', () => {
    const WEB = join(import.meta.dirname, "..");
    const files = ["app", "components", "lib"].flatMap((d) =>
      readdirSync(join(WEB, d)).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts")).map((f) => join(WEB, d, f)),
    );
    const users = files.filter((f) => /localStorage/.test(readFileSync(f, "utf8"))).map((f) => f.slice(WEB.length + 1)).sort();
    expect(users).toEqual(["app/birth-form.tsx", "app/layout.tsx" /* a comment only */, "components/theme-store.ts", "lib/chart-style.ts", "lib/theme.ts"]);
    // birth-form.tsx only hands localStorage to the chart-style helpers.
    const form = readFileSync(join(WEB, "app/birth-form.tsx"), "utf8");
    expect([...form.matchAll(/localStorage[^\n]*/g)].map((m) => m[0])).toEqual(['localStorage "chartStyle" (FR-IN-10).', "localStorage),", "localStorage, chartStyle);"]);
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/sessionStorage|document\.cookie|indexedDB/);
    }
  });
});

describe("the first field to fix (focus after \"See my chart\")", () => {
  const months = en.form.date.months;
  const date = (d: string, m: string, y: string) => checkDate(d, m, y, { missing: en.missing, errors: en.errors, months });
  const ok = date("14", "8", "1992");
  it("in the order of the form", () => {
    expect(firstProblem(date("", "", ""), null, { manual: false, placeChosen: false })).toEqual({ field: "day", inAdvanced: false });
    expect(firstProblem(ok, checkTime("6", "45", null, en), { manual: false, placeChosen: false })).toEqual({ field: "period", inAdvanced: false });
    expect(firstProblem(ok, checkTime("", "45", "am", en), { manual: false, placeChosen: true })).toEqual({ field: "hour", inAdvanced: false });
    expect(firstProblem(ok, null, { manual: false, placeChosen: false })).toEqual({ field: "place", inAdvanced: false });
    expect(firstProblem(ok, null, { manual: false, placeChosen: true })).toBeNull();
  });
  it("typed coordinates: the place is not needed; bad coordinates open Advanced settings", () => {
    expect(firstProblem(ok, null, { manual: true, latOk: false, lngOk: true })).toEqual({ field: "lat", inAdvanced: true });
    expect(firstProblem(ok, null, { manual: true, latOk: true, lngOk: false })).toEqual({ field: "lng", inAdvanced: true });
    expect(firstProblem(ok, null, { manual: true, latOk: true, lngOk: true })).toBeNull();
  });
  it("the messages", () => {
    expect(en.missing.place).toBe("Please choose a place from the list.");
    expect(en.missing.period).toBe("Please choose AM or PM.");
    expect(en.missing.latitude).toBe("Please enter a latitude between −90 and 90, e.g. 13.0827.");
  });
});

describe('"also known as" (D-091 item 4)', () => {
  const index = new PlaceIndex(gunzipSync(readFileSync(join(import.meta.dirname, "../../../data/places/index/places.tsv.gz"))).toString("utf8"));
  it('"bombay" → Mumbai with "also known as Bombay"; "mumbai" → no second line', () => {
    const bombay = searchPlaces(index, "bombay").results[0]!;
    expect(bombay.label).toBe("Mumbai, Maharashtra, India");
    expect(alsoKnownAsLine(bombay, en.form.place)).toBe("also known as Bombay");
    const mumbai = searchPlaces(index, "mumbai").results[0]!;
    expect(mumbai.label).toBe("Mumbai, Maharashtra, India");
    expect(alsoKnownAsLine(mumbai, en.form.place)).toBeNull();
  });
});
