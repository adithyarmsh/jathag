// Page width on phones (step 0.3.7.3, D-119). Hidden screen-reader texts (Tailwind's `sr-only`) are
// `position: absolute`. Inside a horizontal scroll box that is not a positioning container they are
// not clipped by the box and make the whole page wider than the screen (814 px on a 390 px phone).
// So every scroll box must be a positioning container. Checked two ways:
//   1. every element in the page code with an overflow-*-auto/scroll class also has relative,
//      absolute, fixed or sticky;
//   2. the real planet table and transit list, rendered for a reference birth, put their hidden
//      texts inside a scroll box that is `relative`.
// The page width itself was measured in the browser (see the 0.3.7.3 PR report).
import { vi } from "vitest";

// The home form uses the app router (to open /chart); these server renders have none, so a stand-in.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }), usePathname: () => "/" }));
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateChartResponse } from "@jathag/api";
import NotFound from "../app/not-found";
import { PlaceholderPage, type PlaceholderKey } from "../components/placeholder-page";
import { SiteFooter } from "../components/site-footer";
import { HeaderBar, PhoneMenu } from "../components/site-header";
import { PlanetTable } from "../app/planet-table";
import { TransitList } from "../app/transit-list";
import { listContext } from "./list-context";
import { clockChoiceView } from "./clock-choice";
import Home from "../app/page";
import { AdvancedSettings } from "../app/advanced-settings";
import en from "../messages/en.json";

const APP = join(import.meta.dirname, "../app");
const SCROLL = /\boverflow(?:-[xy])?-(?:auto|scroll)\b/;
const POSITIONED = /\b(?:relative|absolute|fixed|sticky)\b/;

describe("scroll boxes are positioning containers (D-119)", () => {
  const files = readdirSync(APP).filter((f) => f.endsWith(".tsx"));
  const boxes = files.flatMap((f) =>
    [...readFileSync(join(APP, f), "utf8").matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
      .map((m) => m[1] ?? m[2] ?? "")
      .filter((c) => SCROLL.test(c))
      .map((c) => ({ file: f, className: c })),
  );

  it("finds the scroll boxes in the page code", () => {
    expect(boxes.map((b) => b.file).sort()).toEqual(["place-search.tsx", "planet-table.tsx", "transit-list.tsx"]);
  });

  it.each(boxes.map((b) => [`${b.file}: ${b.className}`, b] as const))("%s", (_name, b) => {
    expect(b.className).toMatch(POSITIONED);
  });

  // R01 (Chennai 1992-08-14 06:45, made-up reference birth) through the real chart API logic.
  const res = calculateChartResponse(
    { date: "1992-08-14", time: "06:45", manual: { lat: 13.0878, lng: 80.2785, utcOffsetSeconds: 19800 } },
    { asOf: "2026-11-24T12:00:00Z" },
  );

  /** Every role="region" box in the markup: its class and its inner HTML (regions are not nested). */
  function regions(html: string) {
    return [...html.matchAll(/<div class="([^"]*)" tabindex="0" role="region"[^>]*>([\s\S]*?)<\/table><\/div>/g)].map((m) => ({
      className: m[1]!,
      inner: m[2]!,
    }));
  }

  it("the planet table's hidden texts sit inside a relative scroll box", () => {
    const html = renderToStaticMarkup(createElement(PlanetTable, { result: res, t: en, labelledBy: "planets-title" }));
    const r = regions(html);
    expect(r).toHaveLength(1);
    expect(r[0]!.inner).toContain('class="sr-only"'); // Rahu/Ketu retrograde, the Sun's combust …
    expect(r[0]!.className.split(" ")).toContain("relative");
    expect(r[0]!.className.split(" ")).toContain("overflow-x-auto");
  });

  it("today's positions table (transit list) likewise", () => {
    const html = renderToStaticMarkup(createElement(TransitList, { ctx: listContext(res, en) }));
    const r = regions(html);
    expect(r).toHaveLength(1);
    expect(r[0]!.inner).toContain('class="sr-only"'); // Rahu/Ketu retrograde "—"
    expect(r[0]!.className.split(" ")).toContain("relative");
  });
});

// Step 0.4.5 (D-120, design spec §15): the new pages (placeholders, 404) and the open phone menu. The
// width itself was measured in the browser at 360 and 390 px for every page, menu open (0.4.5 PR
// report: always exactly the screen width). Here, the rules that keep it so:
//   1. scroll boxes in the shared components are positioning containers too;
//   2. nothing in the rendered markup has a fixed or minimum width a 360 px phone can't hold
//      (360 minus the 16 px page padding on each side = 328 px);
//   3. the open menu is pinned to both edges of the screen and has no minimum width.
describe("new pages and the open phone menu stay within a 360 / 390 px screen (0.4.5)", () => {
  const COMPONENTS = join(import.meta.dirname, "../components");
  const PHONE_CONTENT = 360 - 2 * 16;

  it("scroll boxes in components/ are positioning containers", () => {
    for (const f of readdirSync(COMPONENTS).filter((f) => f.endsWith(".tsx"))) {
      for (const m of readFileSync(join(COMPONENTS, f), "utf8").matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const c = m[1] ?? m[2] ?? "";
        if (SCROLL.test(c)) expect(c, f).toMatch(POSITIONED);
      }
    }
  });

  const t = { header: en.header, menu: en.menu, footer: en.footer };
  const pages: PlaceholderKey[] = ["settings", "about", "faq", "disclaimer", "privacy", "sources"];
  const screens: [string, string][] = [
    ["header + open menu", renderToStaticMarkup(createElement(HeaderBar, { t, current: "about", open: true })) + renderToStaticMarkup(createElement(PhoneMenu, { t, current: "about" }))],
    ["footer", renderToStaticMarkup(createElement(SiteFooter, { t: en.footer, commit: "7e5a8dc" }))],
    ["404", renderToStaticMarkup(createElement(NotFound))],
    ...pages.map((p): [string, string] => [`/${p}`, renderToStaticMarkup(createElement(PlaceholderPage, { page: p }))]),
  ];

  it.each(screens)("%s: no fixed or minimum width wider than a phone", (_name, html) => {
    const widths = [...html.matchAll(/(?<![\w-])(?:min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\]/g)].map((m) => Number(m[1]) * (m[2] === "rem" ? 16 : 1));
    const inline = [...html.matchAll(/style="[^"]*(?<![\w-])(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of [...widths, ...inline]) expect(w).toBeLessThanOrEqual(PHONE_CONTENT);
  });

  it("the open menu is fixed to both screen edges, with no minimum width", () => {
    const css = readFileSync(join(APP, "globals.css"), "utf8");
    const menu = /\n\.site-menu \{([^}]*)\}/.exec(css)![1]!;
    expect(menu).toContain("position: fixed");
    expect(menu).toMatch(/right: 0;[\s\S]*left: 0;/);
    expect(menu).not.toMatch(/min-width|width:/);
  });
});

// Step 0.4.6: the home page with the full form, and Advanced settings open (coordinates ticked, and with
// the "Which clock?" section). Measured in the browser at 360 and 390 px too, with the "i" note open and
// a result calculated (0.4.6 PR report).
describe("home page and the full form stay within a 360 px screen (0.4.6)", () => {
  const PHONE_CONTENT = 360 - 2 * 16;
  const IDS = { panel: "a", manual: "b", lat: "c", lng: "d", offset: "e", latError: "f", lngError: "g", clockLegend: "h", clockPrefix: "i", seconds: "j" };
  const MUMBAI = { geonameId: 1275339, countryCode: "IN", admin1Code: "16", admin2Code: "", lng: 72.88261 };
  const clock = clockChoiceView(MUMBAI, "1943-03-01", en.form.advanced.clock, en.clockNote);
  const noop = () => {};
  const adv = (manualOn: boolean) =>
    renderToStaticMarkup(
      createElement(AdvancedSettings, {
        t: en.form.advanced, comingSoon: en.hero.comingSoon, ids: IDS, open: true, manualOn, onManual: noop, lat: "", lng: "",
        offset: 19800, onLat: noop, onLng: noop, onOffset: noop, onCoordLeave: noop, clock, clockChoice: null, onClock: noop,
        secondsOn: true, onSeconds: noop,
      }),
    );
  const screens: [string, string][] = [
    ["home page with the form", renderToStaticMarkup(createElement(Home))],
    ["Advanced settings open, clock section", adv(false)],
    ["Advanced settings open, coordinates ticked", adv(true)],
  ];
  it.each(screens)("%s: no fixed or minimum width wider than a phone", (_name, html) => {
    const widths = [...html.matchAll(/(?<![\w-])(?:min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\]/g)].map((m) => Number(m[1]) * (m[2] === "rem" ? 16 : 1));
    const inline = [...html.matchAll(/style="[^"]*(?<![\w-])(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of [...widths, ...inline]) expect(w).toBeLessThanOrEqual(PHONE_CONTENT);
  });
});
