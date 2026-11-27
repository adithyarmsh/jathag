// The full birth form and home layout as rendered (step 0.4.6, spec §5, D-134). Server-rendered
// markup (no browser here): what the face of the form shows and in which order, the hidden heading,
// Advanced settings (order, switched-off choices, coordinates, clock section), and the "Coming soon"
// tag on the home page. Keyboard, focus and the opening motion were checked in the browser (PR report).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import Home from "../app/page";
import { AdvancedSettings, type AdvancedIds } from "../app/advanced-settings";
import { BirthForm } from "../app/birth-form";
import { ChartStyleChoice } from "../app/chart-style-choice";
import { clockChoiceView } from "./clock-choice";
import type { ClockPlace } from "./clock-rule";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
/** Visible text: without the screen-reader-only parts. */
const visibleText = (html: string) => text(html.replace(/<(\w+)[^>]*class="sr-only"[^>]*>[\s\S]*?<\/\1>/g, " "));
const order = (haystack: string, needles: string[]) => needles.map((n) => haystack.indexOf(n));
/** Every <input …> tag that has all the given attributes (in any order). */
const inputs = (html: string, ...attrs: string[]) => [...html.matchAll(/<input [^>]*>/g)].map((m) => m[0]).filter((tag) => attrs.every((a) => tag.includes(a)));

describe("the face of the form", () => {
  const html = renderToStaticMarkup(createElement(BirthForm, { t: en }));
  const face = html.slice(0, html.indexOf('class="advanced-panel"'));

  it("no visible heading, one accessible name", () => {
    expect(face).not.toContain("Generate Your Chart");
    expect(face).not.toContain("Five questions");
    const h2 = [...html.matchAll(/<h2 id="([^"]+)" class="sr-only">([^<]+)<\/h2>/g)];
    expect(h2).toHaveLength(1);
    expect(h2[0]![2]).toBe("Your birth details");
    expect(html).toContain(`aria-labelledby="${h2[0]![1]}"`);
    expect([...html.matchAll(/<form /g)]).toHaveLength(1);
    expect(html.match(/<form [^>]*>/)![0]).toContain(`aria-labelledby="${h2[0]![1]}"`);
  });

  it("only Name, Date, Time, Place (two hints), Chart style, the Advanced link, See my chart and the privacy line, in that order", () => {
    const words = [
      "Name", "Date of birth", "Time of birth", "As written on the birth record. 12 AM = midnight · 12 PM = noon.",
      "Place of birth", "Type your town or city, e.g. Hyderabad.",
      "To narrow it down, add the state or country after a comma: Hyderabad, Telangana.",
      "Chart style", "South Indian", "North Indian", "Advanced settings",
    ];
    const v = visibleText(face);
    const at = order(v, words);
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    const after = visibleText(html.slice(html.indexOf('type="submit"')));
    expect(after.indexOf("See my chart")).toBeLessThan(after.indexOf(en.form.privacy));
    // Not on the face any more (D-134)
    for (const gone of ["optional", "Not sure of the exact time?", "Which clock was the time written on?", "Which chart style"]) {
      expect(v).not.toContain(gone);
    }
  });

  it("the name is not required and has no hint; AM/PM has neither pre-selected; South is selected", () => {
    const name = html.match(/<input id="[^"]*-name"[^>]*>/)![0];
    expect(name).not.toContain("required");
    expect(name).not.toContain("aria-describedby");
    expect([...html.matchAll(/role="radio" aria-checked="true"/g)]).toHaveLength(0);
    expect(inputs(html, 'type="radio"', 'value="south"', 'checked=""')).toHaveLength(1);
    expect(inputs(html, 'type="radio"', 'value="north"', 'checked=""')).toHaveLength(0);
  });

  it('"Advanced settings" is a real button with aria-expanded and aria-controls, directly above "See my chart"', () => {
    const toggle = html.match(/<button id="[^"]*-adv-toggle"[^>]*>/)![0];
    expect(toggle).toContain('type="button"');
    expect(toggle).toContain('aria-expanded="false"');
    const controls = /aria-controls="([^"]+)"/.exec(toggle)![1]!;
    expect(html).toContain(`<div id="${controls}" class="advanced-panel">`); // closed: no data-open
    const between = html.slice(html.indexOf(toggle), html.indexOf('type="submit"'));
    expect(visibleText(between.replace(/<div id="[^"]*" class="advanced-panel"[\s\S]*$/, ""))).toBe("Advanced settings");
  });
});

const IDS: AdvancedIds = {
  panel: "adv", manual: "man", lat: "lat", lng: "lng", offset: "off", latError: "late", lngError: "lnge",
  clockLegend: "clk", clockPrefix: "clk-opt", seconds: "sec",
};
const MUMBAI: ClockPlace = { geonameId: 1275339, countryCode: "IN", admin1Code: "16", admin2Code: "", lng: 72.88261 };
const noop = () => {};
const advanced = (over: Partial<Parameters<typeof AdvancedSettings>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(AdvancedSettings, {
      t: en.form.advanced, comingSoon: en.hero.comingSoon, ids: IDS, open: true, manualOn: false, onManual: noop,
      lat: "", lng: "", offset: 19800, onLat: noop, onLng: noop, onOffset: noop, onCoordLeave: noop,
      clock: null, clockChoice: null, onClock: noop, secondsOn: false, onSeconds: noop, ...over,
    }),
  );

describe("Advanced settings", () => {
  it("in order: coordinates · clock (only when it applies) · birth-time certainty · seconds", () => {
    const clock = clockChoiceView(MUMBAI, "1940-06-01", en.form.advanced.clock, en.clockNote);
    const v = text(advanced({ clock }));
    const at = order(v, ["Enter coordinates yourself", "Which clock was the time written on?", "How sure are you of the birth time?", "Add seconds to the time"]);
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text(advanced())).not.toContain("Which clock");
  });

  it("Mumbai 1940: IST (or not sure) selected, Bombay local time offered", () => {
    const clock = clockChoiceView(MUMBAI, "1940-06-01", en.form.advanced.clock, en.clockNote);
    const html = advanced({ clock });
    expect(inputs(html, 'id="clk-opt-ist"', 'name="clk-opt"', 'checked=""')).toHaveLength(1);
    expect(inputs(html, 'id="clk-opt-bombay"', 'name="clk-opt"')).toHaveLength(1);
    expect(inputs(html, 'id="clk-opt-bombay"', 'checked=""')).toHaveLength(0);
    expect(text(html)).toContain("IST (or not sure) UTC+5:30 Bombay local time UTC+4:51 · 39 minutes behind IST");
    // A picked clock is shown as selected
    expect(inputs(advanced({ clock, clockChoice: "bombay" }), 'value="bombay"', 'checked=""')).toHaveLength(1);
  });

  it("the two approximate choices are shown but switched off, each tagged Coming soon; their contents too", () => {
    const html = advanced();
    expect(inputs(html, 'value="exact"', 'checked=""')).toHaveLength(1);
    for (const v of ["rough", "unknown"]) expect(inputs(html, `value="${v}"`, 'disabled=""', 'aria-disabled="true"')).toHaveLength(1);
    expect([...html.matchAll(/class="radio-card radio-card-off/g)]).toHaveLength(2);
    expect([...html.matchAll(/tag tag-soon/g)]).toHaveLength(2);
    // From / To and the four part-of-day chips, all disabled
    expect([...html.matchAll(/<input type="text" disabled="" aria-disabled="true"/g)]).toHaveLength(2);
    expect([...html.matchAll(/<button type="button" disabled="" aria-disabled="true" class="chip">/g)]).toHaveLength(4);
    expect(text(html)).toContain(en.form.advanced.certainty.roughText);
  });

  it("coordinates ticked: latitude, longitude and the UTC-offset dropdown (UTC+5:30 selected); no clock section", () => {
    const clock = clockChoiceView(MUMBAI, "1940-06-01", en.form.advanced.clock, en.clockNote);
    const html = advanced({ manualOn: true, clock, latError: en.missing.latitude });
    expect(html).toContain('id="lat"');
    expect(html).toContain('id="lng"');
    expect(html).toMatch(/<option value="19800" selected="">UTC\+5:30<\/option>/);
    expect([...html.matchAll(/<option /g)]).toHaveLength(38);
    expect(text(html)).not.toContain("Which clock");
    // An error on the latitude: aria-invalid + aria-describedby to the message
    const lat = html.match(/<input id="lat"[^>]*>/)![0];
    expect(lat).toContain('aria-invalid="true"');
    expect(lat).toMatch(/aria-describedby="lat-hint late"/);
    expect(html).toContain(`<p id="late" class="field-error mt-1">${en.missing.latitude.replace(/</g, "")}</p>`);
  });

  it("the open panel is marked data-open (the card grows), a closed one is not", () => {
    expect(advanced({ open: true })).toContain('class="advanced-panel" data-open="true"');
    expect(advanced({ open: false })).toContain('<div id="adv" class="advanced-panel">');
  });
});

describe("chart style cards", () => {
  it("a radio group with South and North; the stored choice is selected", () => {
    const html = renderToStaticMarkup(createElement(ChartStyleChoice, { t: en.form.chartStyle, name: "s", value: "north", onChange: noop }));
    expect(html).toContain("<legend class=\"form-label\">Chart style</legend>");
    expect(inputs(html, 'value="north"', 'checked=""')).toHaveLength(1);
    expect(inputs(html, 'value="south"', 'checked=""')).toHaveLength(0);
  });
});

describe("home layout (spec §5.1)", () => {
  const html = renderToStaticMarkup(createElement(Home));

  it('"Coming soon" only on "Plain-language explanations", inside its item', () => {
    const items = [...html.matchAll(/<li class="feature-item">([\s\S]*?)<\/li>/g)].map((m) => m[1]!);
    expect(items.map((i) => /<h3[^>]*>([^<]+)<\/h3>/.exec(i)![1])).toEqual(["An accurate chart", "Your life timeline", "Plain-language explanations"]);
    expect(items.map((i) => i.includes("tag-soon"))).toEqual([false, false, true]);
    expect([...html.matchAll(/tag-soon/g)].length).toBe(1 + 2); // + the two switched-off time choices in Advanced settings
  });

  it("the split starts at 1024 px with 440 px / 48 px, and 480 px / 80 px from 1200 px", () => {
    expect(html.match(/<main class="([^"]+)"/)![1]!.split(" ")).toContain("home-grid");
    const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
    const at = (q: string) => new RegExp(`@media \\(width >= ${q}\\) \\{\\s*\\.home-grid \\{([^}]*)\\}`).exec(css)![1]!;
    expect(at("64rem")).toMatch(/grid-template-columns: minmax\(0, 1fr\) 440px;\s*column-gap: 48px;/);
    expect(at("1200px")).toMatch(/grid-template-columns: minmax\(0, 1fr\) 480px;\s*column-gap: 80px;/);
    // 1024 px comes first in the file, so 1200 px wins above it
    expect(css.indexOf("@media (width >= 1200px) {\n  .home-grid")).toBeGreaterThan(css.indexOf("@media (width >= 64rem) {\n  .home-grid"));
    expect(html).toContain("Know your chart, <em");
  });
});
