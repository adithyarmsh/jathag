// The chart page /chart (step 0.5.1, D-138): which birth it shows, the request it sends, names and
// titles, the in-memory hand-off, saving with blocked storage, and the rendered sections for R01 (a
// made-up reference birth). Behaviour that needs a real browser (focus moves, scrolling, the
// IntersectionObserver, Esc) was checked in the preview (PR report).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateChartResponse, parseChartRequest } from "@jathag/api";
import en from "../messages/en.json";
import { BirthChartSection } from "../app/birth-chart-section";
import { BirthFormCard } from "../app/birth-form";
import { DesktopContents, PhoneContents } from "../app/contents-panel";
import { DashaList } from "../app/dasha-list";
import { LifeAreaList } from "../app/life-area-list";
import { PlanetTable } from "../app/planet-table";
import { RightNow } from "../app/right-now";
import { SadeSatiSection } from "../app/sade-sati-section";
import { TransitList } from "../app/transit-list";
import Home from "../app/page";
import { InfoPopup } from "../components/info-popup";
import { leaveHandoff, takeHandoff, updateHandoff } from "../components/chart-handoff";
import {
  chartHeading,
  chartHref,
  chartOwner,
  chartSourceFromUrl,
  chartTitle,
  detailsLine,
  pickBirth,
  requestFromBirth,
  SAMPLE_BIRTH,
  SAMPLE_HREF,
} from "./chart-page";
import { clockChoiceView } from "./clock-choice";
import { activeIndex, SECTIONS, sectionFromHash } from "./contents";
import { formDate, formFromBirth, requestFromForm } from "./form-values";
import { listContext } from "./list-context";
import type { BirthInputs, Profile } from "./profiles";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }), usePathname: () => "/chart" }));

const WEB = join(import.meta.dirname, "..");
const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** main's exact R01 request (0.4.6 / 0.4.7 tests). */
const MAIN_R01 =
  '{"date":"1992-08-14","time":"06:45","place":{"geonameId":1264527,"lat":13.08784,"lng":80.27847,"timeZone":"Asia/Kolkata","countryCode":"IN","admin1Code":"25","admin2Code":"603"}}';
const R01: BirthInputs = SAMPLE_BIRTH;
const profile = (birth: BirthInputs, name = "Meera", id = "p-1"): Profile => ({ id, name, createdAt: "", lastUsedAt: "", birth });

describe("the request /chart sends", () => {
  it("R01 (a profile, or the sample) sends main's request, byte for byte", () => {
    expect(JSON.stringify(requestFromBirth(R01, en))).toBe(MAIN_R01);
  });

  it("the same body as the form builds for the same inputs: clock choice, seconds, repeated time, typed coordinates", () => {
    const MUMBAI_1940: BirthInputs = {
      date: "1940-06-01",
      time: { hour: "9", minute: "5", period: "pm", second: "30" },
      where: { kind: "place", place: { label: "Mumbai, Maharashtra, India", geonameId: 1275339, lat: 19.07283, lng: 72.88261, timeZone: "Asia/Kolkata", countryCode: "IN", admin1Code: "16", admin2Code: "" } },
      clock: "bombay",
      repeatedTime: "later",
    };
    const MANUAL: BirthInputs = { date: "2001-02-03", time: { hour: "12", minute: "0", period: "am", second: null }, where: { kind: "manual", manual: { lat: "-33.8688", lng: "151.2093", utcOffsetSeconds: 36000 } } };
    for (const birth of [MUMBAI_1940, MANUAL]) {
      const { values, repeatedTime } = formFromBirth(birth, "Meera");
      const view = values.manualOn ? null : clockChoiceView(values.place, formDate(values), en.form.advanced.clock, en.clockNote);
      const fromForm = JSON.stringify(requestFromForm(values, view, repeatedTime));
      expect(JSON.stringify(requestFromBirth(birth, en))).toBe(fromForm);
      expect(() => parseChartRequest(JSON.parse(fromForm))).not.toThrow();
    }
    expect(JSON.stringify(requestFromBirth(MUMBAI_1940, en))).toContain('"clock":"bombay"');
  });

  it("never carries the name", () => {
    const body = requestFromBirth(R01, en)!;
    expect(Object.keys(body)).toEqual(["date", "time", "place"]);
    expect(JSON.stringify(body)).not.toMatch(/Meera|"name"|label/);
  });
});

describe("routing: which birth /chart shows (D-138)", () => {
  const none = { handoff: () => null, profile: () => null };

  it("the address: only the id or 'sample'; anything else is nothing", () => {
    expect(chartSourceFromUrl("?sample")).toEqual({ kind: "sample" });
    expect(chartSourceFromUrl("?profile=abc-1")).toEqual({ kind: "profile", id: "abc-1", edit: false });
    expect(chartSourceFromUrl("?profile=abc-1&edit")).toEqual({ kind: "profile", id: "abc-1", edit: true });
    for (const bad of ["", "?profile=", "?profile=<script>", "?profile=a%20b", "?date=1992-08-14"]) expect(chartSourceFromUrl(bad)).toBeNull();
    expect(chartHref("abc-1")).toBe("/chart?profile=abc-1");
    expect(chartHref("abc-1", true)).toBe("/chart?profile=abc-1&edit");
    expect(SAMPLE_HREF).toBe("/chart?sample");
  });

  it("no profile, an unknown id or unreadable storage → nothing (the page goes home, replacing the entry)", () => {
    expect(pickBirth(null, none)).toBeNull();
    expect(pickBirth({ kind: "profile", id: "gone", edit: false }, none)).toBeNull();
    const page = readFileSync(join(WEB, "app/chart-page.tsx"), "utf8");
    expect(page).toContain('router.replace("/")');
    expect(page).not.toContain('router.push("/")');
  });

  it("blocked storage: the form's in-memory hand-off is used for that visit (result once, no second request)", () => {
    const result = calculateChartResponse(JSON.parse(MAIN_R01), { asOf: "2026-11-26T12:00:00Z" });
    leaveHandoff({ id: "h-1", name: "Asha", birth: R01, result });
    const src = { kind: "profile", id: "h-1", edit: false } as const;
    const first = pickBirth(src, { handoff: takeHandoff, profile: () => null });
    expect(first).toEqual({ id: "h-1", name: "Asha", birth: R01, result, fromStorage: false });
    // a second visit in the same page memory (Back, then Forward) recalculates
    expect(pickBirth(src, { handoff: takeHandoff, profile: () => null })!.result).toBeNull();
    // another id never gets it; a refresh (empty memory) and nothing stored → home
    expect(takeHandoff("other")).toBeNull();
    updateHandoff({ id: "h-1", name: "Asha K", birth: R01 });
    expect(takeHandoff("h-1")).toMatchObject({ name: "Asha K", result: null });
  });

  it("a saved profile is read from storage (and moves to the top); the sample never touches storage", () => {
    expect(pickBirth({ kind: "profile", id: "p-1", edit: false }, { handoff: () => null, profile: (id) => (id === "p-1" ? profile(R01) : null) })).toMatchObject({
      id: "p-1", name: "Meera", fromStorage: true, result: null,
    });
    const reads: string[] = [];
    const sample = pickBirth({ kind: "sample" }, { handoff: (id) => (reads.push(id), null), profile: (id) => (reads.push(id), null) });
    expect(sample).toEqual({ id: null, name: "", birth: SAMPLE_BIRTH, result: null, fromStorage: false });
    expect(reads).toEqual([]);
    // the page only saves through the form (edit panel, never shown for the sample) and only marks stored profiles
    const page = readFileSync(join(WEB, "app/chart-page.tsx"), "utf8");
    expect(page).not.toContain("saveFromForm");
    expect(page).toContain("if (picked.fromStorage && picked.id) markOpened(picked.id);");
  });

  it("no birth detail or name in any address the chart page builds", () => {
    for (const f of ["app/chart-page.tsx", "lib/chart-page.ts", "app/birth-form.tsx", "components/chart-handoff.ts"]) {
      const src = readFileSync(join(WEB, f), "utf8");
      expect(src, f).not.toMatch(/[?&](date|time|name|lat|lng|place|birth)=/);
      for (const m of src.matchAll(/(?:replaceState|push|replace)\(([^;]*)\);/g)) expect(m[1], f).not.toMatch(/birth|name|date|place/i);
    }
  });
});

describe("names and titles: never a birth detail", () => {
  const sample = { kind: "sample" } as const;
  const own = { kind: "profile", id: "x", edit: false } as const;

  it("Meera's chart / Your chart (the default name) / Sample chart", () => {
    const meera = chartOwner(own, "Meera", en.profiles.defaultName);
    expect(chartTitle(meera, en.chartPage)).toBe("Meera's chart · Jathag");
    expect(chartHeading(meera, en.chartPage)).toEqual({ heading: "Meera's chart", barName: "Meera" });
    const mine = chartOwner(own, "My chart", en.profiles.defaultName);
    expect(chartTitle(mine, en.chartPage)).toBe("Your chart · Jathag");
    expect(chartHeading(mine, en.chartPage).heading).toBe("Your chart");
    expect(chartTitle(chartOwner(own, "  ", en.profiles.defaultName), en.chartPage)).toBe("Your chart · Jathag");
    const s = chartOwner(sample, "", en.profiles.defaultName);
    expect(chartTitle(s, en.chartPage)).toBe("Sample chart · Jathag");
    expect(chartHeading(s, en.chartPage)).toEqual({ heading: "Sample chart", barName: "Sample chart" });
  });

  it("the details bar line", () => {
    expect(detailsLine(R01, en)).toBe("14 Aug 1992 · 6:45 AM · Chennai, Tamil Nadu, India");
    const manual: BirthInputs = { date: "2001-02-03", time: { hour: "12", minute: "5", period: "am", second: "9" }, where: { kind: "manual", manual: { lat: "-33.8688", lng: "151.2093", utcOffsetSeconds: 36000 } }, repeatedTime: "earlier" };
    expect(detailsLine(manual, en)).toBe("3 Feb 2001 · 12:05:09 AM (the first time) · 33° 52′ S · 151° 13′ E");
  });
});

describe("saving with blocked storage (private browsing)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reading storage throws: the form still saves nothing, keeps the edited id and the old name", async () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new DOMException("blocked", "SecurityError");
      },
      dispatchEvent: () => true,
    });
    const { saveFromForm, findProfile } = await import("../components/profiles-store");
    const { browserStore, readChartStyle, saveChartStyle } = await import("./chart-style");
    expect(browserStore()).toBeNull();
    expect(readChartStyle(browserStore())).toBe("south");
    expect(() => saveChartStyle(browserStore(), "north")).not.toThrow();
    expect(findProfile("p-1")).toBeNull();
    expect(saveFromForm(R01, "", "p-1", "My chart", "Meera")).toEqual({ id: "p-1", name: "Meera" });
    const fresh = saveFromForm(R01, "Asha", null, "My chart");
    expect(fresh.name).toBe("Asha");
    expect(fresh.id).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

describe("edit in place: the home page's form, re-used (D-138 Q4 B)", () => {
  const start = formFromBirth(R01, "Meera");
  const html = renderToStaticMarkup(createElement(BirthFormCard, { t: en, start, editing: { id: "p-1", name: "Meera" }, onDone: () => {}, onCancel: () => {} }));

  it("filled with the profile; Update chart and Cancel; no sample link, no second card", () => {
    expect(html).toMatch(/<input id="[^"]*-name"[^>]*value="Meera"/);
    expect(html).toContain('value="Chennai, Tamil Nadu, India"');
    expect(text(html)).toContain("Update chart");
    expect(text(html)).toContain("Cancel");
    expect(text(html)).not.toContain("See my chart");
    expect(text(html)).not.toContain(en.form.sampleLink);
    expect(html).not.toContain("card-outer"); // the panel is the card
  });

  it("the home form keeps See my chart and gains the sample link (to /chart?sample)", () => {
    const home = renderToStaticMarkup(createElement(Home));
    expect(text(home)).toContain("See my chart See a sample chart");
    expect(home).toContain('href="/chart?sample"');
    expect(text(home)).not.toContain("Update chart");
  });

  it("there is one form component: only birth-form.tsx draws a <form>, and the chart page imports it", () => {
    const forms = readdirSync(join(WEB, "app")).filter((f) => f.endsWith(".tsx") && readFileSync(join(WEB, "app", f), "utf8").includes("<form"));
    expect(forms).toEqual(["birth-form.tsx"]);
    expect(readFileSync(join(WEB, "app/chart-page.tsx"), "utf8")).toContain('import { BirthFormCard, type FormDone } from "./birth-form";');
  });
});

// R01 as of 26 Nov 2026, the moment the mockups were drawn: the page shows the same numbers.
const AS_OF = "2026-11-26T12:00:00Z";
const res = calculateChartResponse(JSON.parse(MAIN_R01), { asOf: AS_OF });
const ctx = listContext(res, en);
const BIRTH = { date: "14 August 1992", time: "6:45 AM", place: "Chennai, Tamil Nadu, India" };
const sections = {
  chart: renderToStaticMarkup(createElement(BirthChartSection, { result: res, birth: BIRTH, heading: "Meera's chart", place: "Chennai", t: en })),
  rightNow: renderToStaticMarkup(createElement(RightNow, { ctx })),
  dashas: renderToStaticMarkup(createElement(DashaList, { ctx })),
  lifeAreas: renderToStaticMarkup(createElement(LifeAreaList, { ctx })),
  sadeSati: renderToStaticMarkup(createElement(SadeSatiSection, { ctx })),
  transits: renderToStaticMarkup(createElement(TransitList, { ctx })),
  planets: renderToStaticMarkup(createElement(PlanetTable, { result: res, t: en, labelledBy: "planets-title" })),
};

describe("R01 on the chart page: the same values as before", () => {
  it("birth chart: h1, the three facts, the Rasi notice", () => {
    const v = text(sections.chart);
    expect(sections.chart).toMatch(/<h1 id="chart-title" tabindex="-1"[^>]*>Meera&#x27;s chart<\/h1>/);
    expect(v).toContain("Lagna (rising sign) Leo");
    expect(v).toContain("Moon sign Aquarius");
    expect(v).toContain("Birth star Dhanishta 4");
    expect(v).toContain("Rasi, the main chart. Where each planet stood at birth.");
    expect(v).toContain("seen from Chennai.");
  });

  it("planet table: Lagna Leo 8° 31′ 13″ Magha 3 and all nine planets", () => {
    const v = text(sections.planets);
    expect(v).toContain("Lagna Leo 8° 31′ 13″ Magha 3 1");
    for (const p of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) expect(v).toContain(p);
    expect(v).toContain("Saturn (R) Capricorn 20° 52′ 56″ Shravana 4 6 Own sign");
  });

  it("right now: Jupiter · Rahu · Ketu, coming up, and the jump rows", () => {
    const v = text(sections.rightNow);
    expect(v).toContain("Right now · 26 Nov 2026");
    expect(v).toContain("You are in Jupiter's Mahadasha");
    expect(v).toMatch(/Long-term · Mahadasha Jupiter 95% through · about 10 months left .*11 Oct 2011 – 11 Oct 2027/);
    expect(v).toMatch(/Medium-term · Antardasha Rahu 64% through .*17 May 2025 – 11 Oct 2027/);
    expect(v).toMatch(/Short-term · Pratyantardasha Ketu 9\d% through · \d days left .*11 Oct 2026 – 1 Dec 2026/);
    expect(v).toContain("1 Dec 2026 Venus short-term period begins");
    expect(v).toContain("11 Oct 2027 Saturn Mahadasha begins, 19 years");
    expect(v).toContain("Sade Sati: setting phase, until 23 Feb 2028");
    expect(v).toContain("Active life areas: self, money, learning, health, spirituality");
    // no left-border rules any more (spec §6.4)
    const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
    expect(css).not.toMatch(/border-left:\s*\d+px solid var\(--tier/);
  });

  it("dasha periods: nine chapters from Mars (began before birth), Jupiter is You are here", () => {
    const v = text(sections.dashas);
    expect(v).toContain("Your life in nine chapters");
    const rows = [...sections.dashas.matchAll(/<span class="maha-lord">([^<]+)<\/span>/g)].map((m) => m[1]);
    expect(rows).toEqual(["Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon"]);
    expect(v).toContain("Mars , 1986 – 1993");
    expect(v).toContain("Began before birth, on 11 Oct 1986");
    expect(v).toMatch(/Jupiter , 2011 – 2027 .*16 yrs , You are here/);
  });

  it("life areas: reasons in words, Active now, the wellness line", () => {
    const v = text(sections.lifeAreas);
    expect(v).toContain("Health & wellness Active now Sun rules the 1st · Jupiter and Venus sit in the 1st · Saturn rules and sits in the 6th");
    expect(v).toContain("Money & family Active now Mercury rules the 2nd and 11th · Ketu sits in the 11th");
    expect(v).toContain("General wellness only, not medical advice.");
    expect([...sections.lifeAreas.matchAll(/tag-active/g)]).toHaveLength(5);
  });

  it("Sade Sati: setting, the back-and-forth sentence, five periods", () => {
    const v = text(sections.sadeSati);
    expect(v).toContain("The last stretch of a slow phase");
    expect(v).toContain("Setting phase until 23 Feb 2028");
    expect(v).toContain("Rising · 24 Jan 2020");
    expect(v).toContain("Peak · 29 Apr 2022");
    expect(v).toContain("Setting · 29 Mar 2025");
    expect(v).toContain("Saturn touches Aries on 3 Jun 2027, steps back into Pisces on 20 Oct 2027, and enters Aries for good on 23 Feb 2028.");
    expect(v).toContain("Every Sade Sati, birth to 120 years: 5 periods");
    expect(v).toContain("Running at birth");
  });

  it("transits: ordinals, (R) never on Rahu/Ketu, the next three sign changes", () => {
    const v = text(sections.transits);
    expect(v).toContain("Sun Scorpio 10th 4th");
    expect(v).toContain("Saturn Pisces (R) 2nd 8th");
    expect(v).toContain("Rahu Aquarius 1st 7th");
    expect(v).not.toMatch(/(Rahu|Ketu) \w+ \(R\)/);
    expect(v).toContain("5 Dec 2026 , Rahu enters Capricorn, Ketu enters Cancer");
    expect(v).toContain("25 Jan 2027 , Jupiter moves back into Cancer");
    expect(v).toContain("3 Jun 2027 , Saturn enters Aries");
    expect(v).toContain("All sign changes, next 10 years");
  });

  it("every section is a plain anchored heading (usable without JavaScript)", () => {
    const all = Object.values(sections).join("");
    for (const id of SECTIONS.filter((s) => s !== "planets")) {
      expect(all).toMatch(new RegExp(`<section id="${id}" class="chart-section[^"]*" aria-labelledby="${id}-title"`));
      expect(all).toMatch(new RegExp(`<h[12] id="${id}-title" tabindex="-1"`));
    }
    expect(all).not.toMatch(/data-reveal|opacity:\s*0/); // nothing starts hidden in the server HTML
  });
});

describe("contents panel (D-138 Q1–Q3)", () => {
  const desktop = renderToStaticMarkup(createElement(DesktopContents, { t: en.chartPage.contents, active: "sade-sati", initiallyOpen: true }));
  const phone = renderToStaticMarkup(createElement(PhoneContents, { t: en.chartPage.contents, active: "dashas", initiallyOpen: true }));

  it("seven items in order, one level, links to the anchors, the current one marked", () => {
    for (const html of [desktop, phone]) {
      const items = [...html.matchAll(/<a href="#([^"]+)"[^>]*>(?:<span[^>]*>)?([^<]+)/g)].map((m) => [m[1], m[2]]);
      expect(items).toEqual([["chart", "Chart"], ["right-now", "Right now"], ["dashas", "Dashas"], ["life-areas", "Life areas"], ["sade-sati", "Sade Sati"], ["transits", "Transits"], ["planets", "Planets"]]);
      expect([...html.matchAll(/aria-current="true"/g)]).toHaveLength(1);
    }
    expect(desktop).toMatch(/<a href="#sade-sati" aria-current="true"/);
    expect(phone).toMatch(/<a href="#dashas" aria-current="true"/);
  });

  it("desktop: one dash per section (the current one marked), a real button with a name and aria-expanded", () => {
    expect([...desktop.matchAll(/class="contents-dash( contents-dash-current)?"/g)]).toHaveLength(7);
    expect(desktop).toMatch(/<span aria-hidden="true" class="contents-dash contents-dash-current"><\/span>/);
    expect(desktop).toMatch(/<button type="button" aria-label="Contents" aria-expanded="true" aria-controls="[^"]+" class="contents-dashes">/);
    expect(desktop).toMatch(/<nav id="[^"]+" aria-label="Sections" class="contents-card">/);
    const closed = renderToStaticMarkup(createElement(DesktopContents, { t: en.chartPage.contents, active: "chart" }));
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toMatch(/aria-label="Sections" hidden=""/);
  });

  it("phone: the floating button opens a labelled modal bottom panel with a Close button", () => {
    expect(phone).toMatch(/<button type="button" aria-expanded="true" aria-controls="[^"]+" class="contents-fab">.*Contents<\/button>/);
    expect(phone).toMatch(/role="dialog" aria-modal="true" aria-labelledby="[^"]+-title" class="contents-sheet"/);
    expect(phone).toContain('aria-label="Close contents"');
  });

  it("the current section follows the scroll (reading line, page bottom) and the address hash", () => {
    expect(activeIndex([0, 400, 900], 200, false)).toBe(0);
    expect(activeIndex([-600, 150, 900], 200, false)).toBe(1);
    expect(activeIndex([-1600, -900, 200], 200, false)).toBe(2);
    expect(activeIndex([-1600, 100, 700], 200, true)).toBe(2);
    expect(activeIndex([], 200, false)).toBe(0);
    expect(sectionFromHash("#sade-sati")).toBe("sade-sati");
    expect(sectionFromHash("#nope")).toBeNull();
  });
});

describe('the "i" pop-ups (spec §3.8)', () => {
  const html = renderToStaticMarkup(createElement(InfoPopup, { label: "What is the Lagna?", title: "Lagna, the rising sign", body: "b", more: "m" }));

  it("a named button with aria-expanded, controlling a labelled dialog that starts closed", () => {
    const button = /<button[^>]*>/.exec(html)![0];
    expect(button).toContain('aria-label="What is the Lagna?"');
    expect(button).toContain('aria-expanded="false"');
    const panel = /aria-controls="([^"]+)"/.exec(button)![1]!;
    expect(html).toMatch(new RegExp(`<div id="${panel}" role="dialog" aria-labelledby="[^"]+-title" tabindex="-1" hidden=""`));
    expect(text(html)).toBe("Lagna, the rising sign b m");
  });

  it("the three fact tiles each have one, named after their question", () => {
    const labels = [...sections.chart.matchAll(/class="info-button"/g)];
    expect(labels).toHaveLength(3);
    for (const q of ["What is the Lagna?", "What is the Moon sign?", "What is the birth star?"]) expect(sections.chart).toContain(`aria-label="${q}"`);
  });
});

describe("touch targets: every control on the page is at least 44 px", () => {
  const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
  const size = (cls: string, prop: "min-height" | "height" | "width") => Number(new RegExp(`\\n\\.${cls} \\{[^}]*\\n  ${prop}: (\\d+)px`).exec(css)?.[1] ?? 0);
  it.each([
    ["contents-dashes", "min-height"], ["contents-dashes", "width"], ["contents-item", "min-height"], ["contents-fab", "min-height"],
    ["info-button", "height"], ["info-button", "width"], ["opener-button", "min-height"], ["sub-row", "min-height"],
    ["jump-row", "min-height"], ["sample-link", "min-height"], ["btn", "min-height"],
  ] as const)(".%s %s", (cls, prop) => {
    expect(size(cls, prop)).toBeGreaterThanOrEqual(44);
  });
});

// D-120 / spec §15: /chart at 360 and 390 px. Measured in the browser with the contents panel, the edit
// panel, the tables and every opener open (PR report); here the rules that keep it so.
describe("/chart stays within a 360 px screen", () => {
  const PHONE_CONTENT = 360 - 2 * 16;
  const edit = renderToStaticMarkup(createElement(BirthFormCard, { t: en, start: formFromBirth(R01, "Meera"), editing: { id: "p", name: "Meera" }, onDone: () => {}, onCancel: () => {} }));
  const screens = [...Object.entries(sections), ["edit panel", edit], ["contents (phone, open)", renderToStaticMarkup(createElement(PhoneContents, { t: en.chartPage.contents, active: "chart", initiallyOpen: true }))]];
  it.each(screens)("%s: no fixed or minimum width wider than a phone", (_n, html) => {
    const widths = [...html.matchAll(/(?<![\w-])(?:min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\](?![^"]*lg:min-w-0)/g)].map((m) => Number(m[1]) * (m[2] === "rem" ? 16 : 1));
    const inline = [...html.matchAll(/style="[^"]*(?<![\w-])(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of [...widths, ...inline]) expect(w).toBeLessThanOrEqual(PHONE_CONTENT);
  });

  it("wide tables scroll inside a relative box; the grids and pop-ups cannot push the page wider", () => {
    for (const html of [sections.transits, sections.planets]) expect(html).toMatch(/<div class="relative overflow-x-auto" tabindex="0" role="region"/);
    expect(sections.planets).toContain("min-w-[520px]"); // inside its scroll box only
    const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
    for (const grid of ["right-now-grid", "transit-grid", "fact-tiles"]) expect(new RegExp(`\\n\\.${grid} \\{[^}]*grid-template-columns: minmax\\(0, 1fr\\)`).test(css), grid).toBe(true);
    expect(/\n\.info-panel \{[^}]*left: 0;\s*right: 0;/.test(css)).toBe(true); // phones: the tile's width
    expect(/\n\.contents-sheet \{[^}]*width: 100%;/.test(css)).toBe(true);
  });
});
