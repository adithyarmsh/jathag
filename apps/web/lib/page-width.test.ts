// Page width on phones (step 0.3.7.3, D-119). Hidden screen-reader texts (Tailwind's `sr-only`) are
// `position: absolute`. Inside a horizontal scroll box that is not a positioning container they are
// not clipped by the box and make the whole page wider than the screen (814 px on a 390 px phone).
// So every scroll box must be a positioning container. Checked two ways:
//   1. every element in the page code with an overflow-*-auto/scroll class also has relative,
//      absolute, fixed or sticky;
//   2. the real planet table and transit list, rendered for a reference birth, put their hidden
//      texts inside a scroll box that is `relative`.
// The page width itself was measured in the browser (see the 0.3.7.3 PR report).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateChartResponse } from "@jathag/api";
import { PlanetTable } from "../app/planet-table";
import { TransitList } from "../app/transit-list";
import { listContext } from "./list-context";
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
    const html = renderToStaticMarkup(createElement(PlanetTable, { result: res, summary: "R01", t: en.chart }));
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
