// Page code runs in the browser and must never pull in the engine or the API package at runtime (they
// load Swiss Ephemeris and Node modules; CLAUDE.md, D-113). Types are fine: `import type` is removed
// when the code is built. This walks every page file (apps/web/app/*.tsx and apps/web/lib/*.ts, not the
// server folder, API routes or tests) and fails on a runtime import of @jathag/engine or @jathag/api.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB = join(import.meta.dirname, "..");

const pageFiles = [
  ...readdirSync(join(WEB, "app")).filter((f) => /\.tsx?$/.test(f)).map((f) => join(WEB, "app", f)),
  ...readdirSync(join(WEB, "lib")).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts")).map((f) => join(WEB, "lib", f)),
];

describe("page code imports only types from the engine and the API", () => {
  it("finds the page files", () => {
    const names = pageFiles.map((f) => f.slice(WEB.length + 1));
    for (const f of ["app/birth-form.tsx", "app/dasha-list.tsx", "app/right-now.tsx", "lib/dasha-view.ts", "lib/list-context.ts"]) {
      expect(names).toContain(f);
    }
  });

  it.each(pageFiles.map((f) => [f.slice(WEB.length + 1), f] as const))("%s", (_name, file) => {
    const text = readFileSync(file, "utf8");
    const imports = [...text.matchAll(/^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+['"](@jathag\/(?:engine|api)[^'"]*)['"]/gm)];
    for (const m of imports) expect(m[2], `${m[0].trim()}`).toBe("type ");
    // No dynamic import either
    expect(text).not.toMatch(/import\(\s*['"]@jathag\/(engine|api)/);
  });
});
