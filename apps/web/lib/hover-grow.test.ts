// Hover grow on every clickable thing (D-140 item 3, spec §2 motion 2): one shared rule in globals.css.
// Checks the sizes per kind, that the rule only applies to pointer devices without reduced motion, that
// disabled / switched-off / already selected controls do not grow, that links inside running text never
// grow (they change their underline instead), and that the components really carry the classes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { DesktopContents, PhoneContents } from "../app/contents-panel";
import { InfoPopup } from "../components/info-popup";

const WEB = join(import.meta.dirname, "..");
const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
const source = (f: string) => readFileSync(join(WEB, f), "utf8");

/** The classes given one --grow value: ".a, .b { --grow: 1.02; }" → ["a", "b"]. */
function tier(value: string): string[] {
  const m = new RegExp(`\\n([^{}\\n]+)\\{ --grow: ${value.replace(".", "\\.")}; \\}`).exec(css);
  expect(m, `--grow ${value}`).not.toBeNull();
  return m![1]!.split(",").map((c) => c.trim().replace(/^\./, ""));
}
const BUTTONS = tier("1.02");
const SMALL = tier("1.03");
const BIG = tier("1.01");
const ALL = [...BUTTONS, ...SMALL, ...BIG];

/** The class list inside the first `${fn}(` … `)` that starts with ".btn". */
function list(fn: ":where" | ":is"): string[] {
  const m = new RegExp(`${fn}\\((\\.btn[^)]*)\\)`).exec(css);
  expect(m, fn).not.toBeNull();
  return m![1]!.split(",").map((c) => c.trim().replace(/^\./, ""));
}

describe("hover grow: one shared rule (D-140 item 3)", () => {
  it("buttons ×1.02; chips, toggle options, icon buttons, the i, contents dashes and button ×1.03; big rows and cards ×1.01", () => {
    for (const c of ["btn", "profile-btn", "nav-link", "sample-link", "advanced-toggle"]) expect(BUTTONS).toContain(c);
    for (const c of ["chip", "toggle-option", "icon-button", "info-button", "contents-dashes", "contents-fab"]) expect(SMALL).toContain(c);
    for (const c of ["contents-item", "option-card", "radio-card", "check-row", "opener-button", "sub-row-opener", "jump-row", "menu-row"]) expect(BIG).toContain(c);
    expect(new Set(ALL).size).toBe(ALL.length); // each kind in one tier only
  });

  it("the transition and the hover rule cover exactly the same controls", () => {
    expect(list(":where")).toEqual(ALL);
    expect(list(":is")).toEqual(ALL);
    expect(css).toMatch(/:where\(\.btn[^)]*\) \{\n  transition: scale 150ms var\(--ease\);\n\}/);
  });

  it("pointer devices with hover only, never with reduced motion; not disabled, switched off or already selected", () => {
    const rule = /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{\n  :is\(\.btn[^)]*\):hover:not\(([^)]*)\) \{\n    scale: var\(--grow\);/.exec(css);
    expect(rule).not.toBeNull();
    const not = rule![1]!.split(",").map((s) => s.trim());
    expect(not).toEqual([":disabled", '[aria-disabled="true"]', '[aria-checked="true"]', ".radio-card-off"]);
  });

  it("one rule: no other hover scale anywhere (transform only, nothing around moves)", () => {
    expect(css.match(/scale: var\(--grow\)/g)).toHaveLength(1);
    expect(css).not.toMatch(/:hover[^{]*\{[^}]*transform:\s*scale/);
    // controls with their own transition keep it and add scale
    for (const sel of [".btn", ".chip", ".toggle-option", ".contents-fab"]) {
      const body = new RegExp(`\\n\\${sel} \\{([^}]*)\\}`).exec(css)![1]!;
      expect(body, sel).toMatch(/transition:[^;]*scale 150ms var\(--ease\)/);
    }
  });

  it("links inside running text never grow: they change their underline on hover", () => {
    for (const c of ["footer-link", "clock-note-link"]) {
      expect(ALL).not.toContain(c);
      expect(css).toMatch(new RegExp(`\\.${c}:hover \\{[^}]*text-decoration-(color|thickness)`));
    }
  });

  it("the components carry the classes", () => {
    expect(source("components/site-header.tsx")).toMatch(/className="nav-link"/);
    expect(source("components/site-header.tsx")).toMatch(/className="icon-button/);
    expect(source("components/site-header.tsx")).toMatch(/className="menu-row"/);
    expect(source("app/chart-style-choice.tsx")).toMatch(/className="option-card"/);
    expect(source("app/advanced-settings.tsx")).toMatch(/className="radio-card radio-card-off/);
    expect(source("app/advanced-settings.tsx")).toMatch(/disabled aria-disabled="true" className="chip"/);
    expect(source("app/profiles/profile-list.tsx")).toMatch(/profile-btn/);
    expect(source("app/dasha-list.tsx")).toMatch(/opener-button maha-row/);
    expect(source("app/birth-form.tsx")).toMatch(/className="sample-link"/);
    const info = renderToStaticMarkup(createElement(InfoPopup, { label: "What is the Lagna?", title: "t", body: "b" }));
    expect(info).toMatch(/class="info-button"/);
    const desk = renderToStaticMarkup(createElement(DesktopContents, { t: en.chartPage.contents, active: "chart", initiallyOpen: true }));
    expect(desk).toMatch(/class="contents-dashes"/);
    expect(desk).toMatch(/class="contents-item"/);
    const phone = renderToStaticMarkup(createElement(PhoneContents, { t: en.chartPage.contents, active: "chart" }));
    expect(phone).toMatch(/class="contents-fab"/);
  });
});
