// One right edge (D-140 item 1) and the stars in the desktop gap (D-140 item 2b).
// - The details bar and every block below it live in ONE container (the chart page's <main>), and
//   nothing between that container and the blocks adds a horizontal margin or padding of its own, so
//   they all end on the container's right edge.
// - The container is centred on a whole pixel (`page-frame`), so the fixed bar (its own layer, snapped
//   to whole pixels) and the content below cannot round 1 px apart. The same frame is used by the
//   header, the home page and the footer.
// - The gap shows a copy of the page's own star group; it is hidden on phones and tablets.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GapStars } from "../app/gap-stars";
import { SKY_ID } from "../app/star-field";

const WEB = join(import.meta.dirname, "..");
const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
const source = (f: string) => readFileSync(join(WEB, f), "utf8");

/** Bodies of every rule whose selector is exactly `sel` (at any media level). */
const rules = (sel: string) => [...css.matchAll(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`, "g"))].map((m) => m[1]!);

/** The whole-pixel left margin the CSS works out: max(0, round down((W − 1168) / 2)). */
const frameLeft = (containerWidth: number) => Math.max(0, Math.floor((containerWidth - 1168) / 2));

describe("one right edge (D-140 item 1)", () => {
  it("the page frame rounds its centring down to a whole pixel (with plain centring as the fallback)", () => {
    const [body] = rules(".page-frame");
    expect(body).toMatch(/margin-inline: auto;[^]*margin-left: max\(0px, round\(down, calc\(\(100% - 1168px\) \/ 2\), 1px\)\);/);
    // 1280 px window − 15 px scrollbar: 48.5 px with mx-auto, 48 px now; right edge 48 + 1168 − 24 = 1192
    expect(frameLeft(1265)).toBe(48);
    expect(frameLeft(1265) + 1168 - 24).toBe(1192);
    expect(frameLeft(1425)).toBe(128); // 1440 px window
    expect(frameLeft(1009)).toBe(0); // 1024 px window: full width, nothing to centre
    for (const w of [1169, 1201, 1265, 1425, 1919]) expect(Number.isInteger(frameLeft(w))).toBe(true);
  });

  it("header, chart page, home page and footer share the frame; none is centred on a half pixel any more", () => {
    for (const f of ["app/chart-page.tsx", "app/page.tsx", "components/site-header.tsx", "components/site-footer.tsx"]) {
      const text = source(f);
      expect(text, f).toMatch(/page-frame[^"]*max-w-\[1168px\]/);
      expect(text, f).not.toMatch(/mx-auto[^"]*max-w-\[1168px\]/);
    }
  });

  it("the details bar and the sections sit in the same container", () => {
    const page = source("app/chart-page.tsx");
    const main = page.indexOf('<main className="chart-main page-frame');
    const bar = page.indexOf('className="details-sticky"');
    const layout = page.indexOf('className="chart-layout"');
    const end = page.indexOf("</main>");
    expect(main).toBeGreaterThan(0);
    expect(bar).toBeGreaterThan(main);
    expect(layout).toBeGreaterThan(bar);
    expect(end).toBeGreaterThan(layout);
  });

  it("nothing between the container and the blocks adds a horizontal margin or padding", () => {
    for (const sel of [".details-sticky", ".chart-layout", ".chart-section", ".birth-chart-facts", ".fact-tiles", ".details-bar"]) {
      expect(rules(sel).length, sel).toBeGreaterThan(0);
      for (const body of rules(sel)) {
        const sides = body.match(/(?:^|[\s;])((?:margin|padding)[\w-]*):/g)?.map((d) => d.replace(/[\s;:]/g, "")) ?? [];
        for (const d of sides) {
          if (sel === ".details-bar" && d === "padding") continue; // inside the bar's own border: moves no edge
          expect(["margin-top", "margin-bottom", "padding-top", "padding-bottom"], `${sel} ${d}`).toContain(d);
        }
      }
    }
  });
});

describe("background stars in the desktop gap (D-140 item 2b)", () => {
  const html = renderToStaticMarkup(createElement(GapStars));

  it("a decoration-only copy of the page's star group", () => {
    expect(SKY_ID).toBe("jathag-sky");
    expect(source("app/star-field.tsx")).toMatch(/<g id=\{SKY_ID\}>/);
    expect(html).toMatch(/^<div aria-hidden="true" class="gap-stars"><svg[^>]*class="gap-stars-svg"[^>]*><use href="#jathag-sky"><\/use><\/svg><\/div>$/);
    expect(html).not.toMatch(/tabindex|role=|href="(?!#jathag-sky)/);
  });

  it("only on desktop, clipped to the 24 px gap, no clicks; the gap itself stays solid so content disappears under it", () => {
    expect(rules(".gap-stars").join(" ")).toMatch(/display: none/);
    expect(css).toMatch(/@media \(width >= 64rem\) \{\n  \.gap-stars \{ display: block; \}/);
    const desktop = rules(".gap-stars").find((b) => b.includes("overflow"))!;
    expect(desktop).toMatch(/position: absolute;[^]*height: 24px;[^]*overflow: hidden;[^]*pointer-events: none;/);
    expect(rules(".details-sticky").join(" ")).toMatch(/padding-top: 24px;[^]*background-color: var\(--bg\);/);
    expect(source("app/chart-page.tsx")).toMatch(/className="details-sticky">\s*<GapStars \/>/);
  });

  it("moved by a transform only, read once per animation frame (no layout thrash)", () => {
    const code = source("app/gap-stars.tsx");
    expect(code).toMatch(/requestAnimationFrame\(place\)/);
    expect(code).toMatch(/svg\.style\.transform = `translate\(/);
    expect(code).toMatch(/addEventListener\("scroll", schedule, \{ passive: true \}\)/);
    expect(code.match(/getBoundingClientRect\(\)/g)).toHaveLength(2);
  });
});
