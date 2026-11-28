// The chart page's drawn chart, its controls and its index (step 0.5.2, spec §6.3, §7, D-143), plus the
// browser side of "Near <place>" (D-144) and the one remembered chart style (D-143 item 1).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChartResponse } from "@jathag/api";
import en from "../messages/en.json";
import { BirthChartSection } from "../app/birth-chart-section";
import { ChartIndex, indexEntries } from "../app/chart-index";
import { NorthChart } from "../app/north-chart";
import { SouthChart } from "../app/south-chart";
import { chartAriaLabel } from "./drawn-chart";
import { parseProfiles, PROFILES_KEY, serializeProfiles, type Profile } from "./profiles";

const WEB = join(import.meta.dirname, "..");
const res = calculateChartResponse(
  { date: "1992-08-14", time: "06:45", place: { geonameId: 1264527, lat: 13.08784, lng: 80.27847, timeZone: "Asia/Kolkata", countryCode: "IN", admin1Code: "25", admin2Code: "603" } },
  { asOf: "2026-11-28T12:00:00Z" },
);
const BIRTH = { dateTime: "14 Aug 1992 · 6:45 AM", place: "Chennai, Tamil Nadu, India" };
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
const svgTexts = (html: string) => [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);
const render = (kind: "d1" | "d9", style: "south" | "north") => {
  const label = chartAriaLabel(res.chart, kind, style, BIRTH, en.chart);
  const title = kind === "d1" ? en.chart.drawing.titleD1 : en.chart.drawing.titleD9;
  return style === "south"
    ? renderToStaticMarkup(createElement(SouthChart, { chart: res.chart, kind, title, dateTime: BIRTH.dateTime, place: BIRTH.place, label, t: en.chart }))
    : renderToStaticMarkup(createElement(NorthChart, { chart: res.chart, kind, label, t: en.chart }));
};

describe("the drawn charts (R01)", () => {
  it.each([
    ["d1", "south"],
    ["d9", "south"],
    ["d1", "north"],
    ["d9", "north"],
  ] as const)("%s %s: an image with a full sentence, no degrees, no Moon lines, theme colours only", (kind, style) => {
    const html = render(kind, style);
    expect(html).toMatch(/^<svg viewBox="0 0 400 400" role="img" aria-label="[^"]{80,}"/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/); // no hard-coded colours
    const texts = svgTexts(html);
    // Planet labels: abbreviations and (R) only (no degrees, D-108)
    const labels = [...html.matchAll(/data-code="(\w\w)"[^>]*>([^<]*)</g)].map((m) => m[2]!);
    expect(labels).toHaveLength(10);
    for (const l of labels) expect(l).toMatch(/^(La|Su|Mo|Ma|Me|Ju|Ve|Sa|Ra|Ke)( \(R\))?$/);
    expect(labels).toContain("Sa (R)"); // R01's Saturn is retrograde, in D1 and D9 (D-143 item 4)
    expect(texts.join(" ")).not.toMatch(/Moon sign|Nakshatra|Pada|°/);
    // No click on planets yet (0.5.3)
    expect(html).not.toMatch(/<a |onclick|tabindex/i);
  });

  it("South centre: title, date and time, place", () => {
    expect(svgTexts(render("d1", "south")).slice(-3)).toEqual(["Rasi chart (D-1)", "14 Aug 1992 · 6:45 AM", "Chennai, Tamil Nadu, India"]);
    expect(svgTexts(render("d9", "south")).slice(-3)[0]).toBe("Navamsa (D-9)");
  });

  it("R01 D1 (as the SouthChart board): La Ju Ve in Leo, Su Me in Cancer, Sa (R) in Capricorn; D9 Lagna in Gemini (as JHora)", () => {
    const d1 = render("d1", "south");
    const box = (html: string, sign: number) => html.match(new RegExp(`<g transform="[^"]*" data-sign="${sign}" data-house="(\\d+)">([\\s\\S]*?)</g>`))!;
    expect(svgTexts(box(d1, 5)[2]!)).toEqual(["Leo", "1st", "La", "Ju", "Ve"]);
    expect(svgTexts(box(d1, 4)[2]!)).toEqual(["Cancer", "12th", "Su", "Me"]);
    expect(svgTexts(box(d1, 10)[2]!)).toEqual(["Capricorn", "6th", "Sa (R)"]);
    const d9 = render("d9", "south");
    expect(box(d9, 3)[1]).toBe("1");
    expect(svgTexts(box(d9, 3)[2]!).slice(0, 3)).toEqual(["Gemini", "1st", "La"]);
    // North D9: house 1 holds Gemini
    expect(render("d9", "north")).toMatch(/data-house="1" data-sign="3"><text[^>]*>Gem<\/text>/);
    expect(render("d1", "north")).toMatch(/data-house="1" data-sign="5"><text[^>]*>Leo<\/text>/);
  });
});

describe("the birth chart section: controls under the chart, notice, tiles, index", () => {
  const html = renderToStaticMarkup(createElement(BirthChartSection, { result: res, birth: BIRTH, heading: "Meera's chart", place: "Chennai", t: en }));

  it("opens on Rasi (D1), South style: chips are aria-pressed buttons, the toggle a radiogroup", () => {
    expect(html).toMatch(/role="group" aria-label="Chart type"/);
    expect(html).toMatch(/<button type="button" aria-pressed="true" class="chip">Rasi \(D1\)<\/button>/);
    expect(html).toMatch(/<button type="button" aria-pressed="false" class="chip">Navamsa \(D9\)<\/button>/);
    expect(html).toMatch(/role="radiogroup" aria-label="Chart style"/);
    expect(html).toMatch(/role="radio" aria-checked="true" tabindex="0" class="toggle-option">South</);
    expect(html).toMatch(/role="radio" aria-checked="false" tabindex="-1" class="toggle-option">North</);
    expect(html).toContain('data-style="south" data-kind="d1"');
    // In order: drawing, controls, then the notice, tiles and index
    const at = (s: string) => html.indexOf(s);
    expect(at("birth-chart-drawing")).toBeLessThan(at("birth-chart-controls"));
    expect(at("birth-chart-controls")).toBeLessThan(at("birth-chart-facts"));
    expect(text(html)).toContain("Rasi, the main chart. Where each planet stood at birth.");
    expect(text(html)).not.toContain("North Indian drawing arrives"); // the old note is gone
  });

  it("the three fact tiles are the D1 birth facts", () => {
    const v = text(html);
    expect(v).toContain("Lagna (rising sign) Leo");
    expect(v).toContain("Moon sign Aquarius");
    expect(v).toContain("Birth star Dhanishta 4");
  });

  it("the D1 / D9 choice is not remembered; the D9 notice has its own words", () => {
    const code = readFileSync(join(WEB, "app/birth-chart-section.tsx"), "utf8");
    expect(code).toContain('useState<ChartKind>("d1")');
    expect(code).not.toMatch(/setItem|localStorage|chartKind/);
    expect(en.chartPage.chart.navamsaNotice).toMatch(/^\[Navamsa\.\] Each sign split into nine parts\./);
  });
});

describe("the index (spec §7.3, D-130, D-143 item 8)", () => {
  const html = renderToStaticMarkup(createElement(ChartIndex, { t: en.chart }));

  it("signs Ari Aries … Pis Pisces, planets La … Ke and (R), from en.json", () => {
    const { signs, planets } = indexEntries(en.chart);
    expect(signs.map((s) => `${s.a} ${s.n}`)).toEqual([
      "Ari Aries", "Tau Taurus", "Gem Gemini", "Can Cancer", "Leo Leo", "Vir Virgo", "Lib Libra", "Sco Scorpio", "Sag Sagittarius", "Cap Capricorn", "Aqu Aquarius", "Pis Pisces",
    ]);
    expect(planets.map((s) => `${s.a} ${s.n}`)).toEqual([
      "La Lagna, rising sign", "Su Sun", "Mo Moon", "Ma Mars", "Me Mercury", "Ju Jupiter", "Ve Venus", "Sa Saturn", "Ra Rahu", "Ke Ketu", "(R) retrograde",
    ]);
    expect(text(html)).toContain("Index Signs Ari Aries Tau Taurus");
  });

  it("one component for every chart: the section always renders the same index", () => {
    const code = readFileSync(join(WEB, "app/birth-chart-section.tsx"), "utf8");
    expect(code.match(/<ChartIndex /g)).toHaveLength(1);
  });

  it("phones: an opener (closed); desktop: always open (the opener hidden by CSS)", () => {
    expect(html).toMatch(/<button type="button" class="chart-index-opener opener-button" aria-expanded="false" aria-controls="[^"]+-body">/);
    expect(text(html)).toContain("What the letters mean");
    const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
    expect(css).toMatch(/\.chart-index-body \{\n  display: none;/);
    expect(css).toMatch(/\.chart-index\[data-open\] \.chart-index-body \{\n  display: block;/);
    const desktop = css.slice(css.indexOf(".chart-index > .chart-index-opener { display: none; }") - 40);
    expect(desktop).toMatch(/^[\s\S]*@media \(width >= 64rem\) \{\n  \.chart-index > \.chart-index-opener \{ display: none; \}[^\n]*\n  \.chart-index-body,\n  \.chart-index\[data-open\] \.chart-index-body \{\n    display: block;/);
    expect(css).toMatch(/\.chart-index-grid \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.chart-index-grid \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \}/);
  });

  it("reduced motion: chips and the toggle's sliding fill stop moving", () => {
    const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
    const reduce = css.slice(css.indexOf("/* No movement for people who ask their device to reduce motion"));
    expect(reduce).toMatch(/\.chip,\n  \.toggle-fill,\n  \.toggle-option,/);
  });
});

// ---- The browser: a stand-in window with localStorage, events and fetch -----------------------------

class FakeStore {
  m = new Map<string, string>();
  blocked = false;
  getItem(k: string) {
    if (this.blocked) throw new Error("blocked");
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.blocked) throw new Error("blocked");
    this.m.set(k, v);
  }
}

let store: FakeStore;
let fetches: { url: string; body: string }[];
let answer: () => Promise<Response>;
beforeEach(() => {
  store = new FakeStore();
  fetches = [];
  answer = async () => new Response(JSON.stringify({ nearest: { label: "Chennai, Tamil Nadu, India" } }), { status: 200 });
  const target = new EventTarget();
  vi.stubGlobal("window", { localStorage: store, addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target), dispatchEvent: target.dispatchEvent.bind(target) });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    fetches.push({ url, body: String(init.body) });
    return answer();
  });
  vi.resetModules();
});
afterEach(() => vi.unstubAllGlobals());

describe("one remembered chart style (D-143 item 1)", () => {
  it('the toggle writes "chartStyle"; the form reads the same value (and the reverse)', async () => {
    const { setChartStyle } = await import("../components/chart-style-store");
    const { readChartStyle } = await import("./chart-style");
    expect(readChartStyle(store)).toBe("south");
    setChartStyle("north"); // the chart page toggle
    expect(store.m.get("chartStyle")).toBe("north");
    expect(readChartStyle(store)).toBe("north"); // what the home form's cards start with
    setChartStyle("south"); // the form after "See my chart"
    expect(readChartStyle(store)).toBe("south");
    // Both use the same store module
    for (const f of ["app/birth-form.tsx", "app/birth-chart-section.tsx"]) expect(readFileSync(join(WEB, f), "utf8")).toContain('from "@/components/chart-style-store"');
  });

  it("with blocked storage the choice lives in memory for the visit", async () => {
    store.blocked = true;
    const { setChartStyle } = await import("../components/chart-style-store");
    expect(() => setChartStyle("north")).not.toThrow();
    const code = readFileSync(join(WEB, "components/chart-style-store.ts"), "utf8");
    expect(code).toContain("let memory: ChartStyle | null = null;");
  });
});

describe('"Near <place>" in the browser (D-144)', () => {
  const manualProfile = (near?: string | null): Profile => ({
    id: "p1", name: "Meera", createdAt: "t", lastUsedAt: "t",
    birth: {
      date: "1992-08-14",
      time: { hour: "6", minute: "45", period: "am", second: null },
      where: { kind: "manual", manual: { lat: "13.087778", lng: "80.278333", utcOffsetSeconds: 19800, ...(near !== undefined ? { near } : {}) } },
    },
  });

  it("sends only the two numbers, once per pair of coordinates, and saves the label with the profile", async () => {
    store.m.set(PROFILES_KEY, serializeProfiles([manualProfile()]));
    const { nearestForProfile, lookupNearest } = await import("../components/nearest-place");
    const a = await nearestForProfile("p1", { lat: 13.087778, lng: 80.278333 });
    const b = await lookupNearest(13.087778, 80.278333);
    expect([a, b]).toEqual(["Chennai, Tamil Nadu, India", "Chennai, Tamil Nadu, India"]);
    expect(fetches).toEqual([{ url: "/api/places/nearest", body: '{"lat":13.087778,"lng":80.278333}' }]); // no date, time or name
    const saved = parseProfiles(store.m.get(PROFILES_KEY))[0]!;
    expect(saved.birth.where.kind === "manual" && saved.birth.where.manual.near).toBe("Chennai, Tamil Nadu, India");
  });

  it("none within 50 km is saved as null (not looked up again); a failure is silent and tried again later", async () => {
    store.m.set(PROFILES_KEY, serializeProfiles([manualProfile()]));
    answer = async () => new Response(JSON.stringify({ nearest: null }), { status: 200 });
    const { nearestForProfile, lookupNearest } = await import("../components/nearest-place");
    expect(await nearestForProfile("p1", { lat: 13.087778, lng: 80.278333 })).toBeNull();
    const saved = parseProfiles(store.m.get(PROFILES_KEY))[0]!;
    expect(saved.birth.where.kind === "manual" && saved.birth.where.manual.near).toBeNull();
    answer = async () => {
      throw new TypeError("offline");
    };
    expect(await lookupNearest(1, 2)).toBeUndefined();
    answer = async () => new Response("{}", { status: 500 });
    expect(await lookupNearest(1, 2)).toBeUndefined(); // asked again: the failure was not kept
    expect(fetches.filter((f) => f.body === '{"lat":1,"lng":2}')).toHaveLength(2);
  });

  it("the chart page looks up only profiles that have no label yet, and never waits for it", () => {
    const page = readFileSync(join(WEB, "app/chart-page.tsx"), "utf8");
    expect(page).toContain('shown.birth.where.manual.near === undefined');
    expect(page).toMatch(/void nearestForProfile\(/);
    const form = readFileSync(join(WEB, "app/birth-form.tsx"), "utf8");
    // Alongside the chart request, never awaited
    expect(form).toMatch(/if \(coords\) void lookupNearest\(coords\.lat, coords\.lng\);\n\s+let problem/);
    expect(form).toMatch(/if \(coords\) void nearestForProfile\(saved\.id, coords\);/);
  });

  it('shown only in the chart centre and the details bar: no "Near" in the form, Advanced settings or profile cards', () => {
    for (const f of ["app/advanced-settings.tsx", "app/birth-form.tsx", "app/profiles/profile-list.tsx", "lib/profiles-view.ts", "app/planet-table.tsx"]) {
      expect(readFileSync(join(WEB, f), "utf8"), f).not.toMatch(/shownPlace|drawing\.near|\.near\b/);
    }
    const page = readFileSync(join(WEB, "app/chart-page.tsx"), "utf8");
    expect(page.match(/shownPlace\(/g)).toHaveLength(1); // the chart centre / caption
    expect(readFileSync(join(WEB, "lib/chart-page.ts"), "utf8")).toMatch(/place: shownPlace\(birth, t\) \}\);\n\}/); // the details line
  });
});
