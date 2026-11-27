// Design tokens (step 0.4.5, design spec §1.1): every colour in docs/design/tokens.json must be in
// apps/web/app/globals.css with the same value in light (:root) and in BOTH dark blocks (device dark and
// data-theme="dark"), and the spacing and radius values must match too. Fails as soon as the file and
// the CSS drift apart.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_COLOR } from "./theme";

const ROOT = join(import.meta.dirname, "../../..");
const tokens = JSON.parse(readFileSync(join(ROOT, "docs/design/tokens.json"), "utf8")) as {
  color: { tokens: { name: string; value: { light: string; dark: string } }[] };
  spacing: { tokens: { name: string; value: string }[] };
  radius: { tokens: { name: string; value: string }[] };
  shadow: { tokens: { name: string; value: string }[] };
};
const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");

/** The body of the first block that starts with `selector {` (no nested braces inside it). */
function block(selector: string, from = 0): string {
  const start = css.indexOf(`${selector} {`, from);
  expect(start, `block "${selector}" in globals.css`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}
const light = block(":root");
const darkDevice = block(':root:not([data-theme="light"])', css.indexOf("@media (prefers-color-scheme: dark)"));
const darkSwitch = block(':root[data-theme="dark"]');

function value(body: string, name: string): string | undefined {
  return new RegExp(`(?:^|[;\\s])--${name}:\\s*([^;]+);`).exec(body)?.[1]?.trim();
}
const norm = (v: string | undefined) => v?.replace(/\s+/g, "").toLowerCase();

describe("design tokens: tokens.json ↔ globals.css", () => {
  it("reads the token file (18 colours)", () => {
    expect(tokens.color.tokens).toHaveLength(18);
  });

  it.each(tokens.color.tokens.map((t) => [t.name, t] as const))("colour %s in light and both dark blocks", (_n, t) => {
    expect(norm(value(light, t.name)), "light").toBe(norm(t.value.light));
    expect(norm(value(darkDevice, t.name)), "dark (device)").toBe(norm(t.value.dark));
    expect(norm(value(darkSwitch, t.name)), "dark (switch)").toBe(norm(t.value.dark));
  });

  it("the two dark blocks are identical", () => {
    expect(norm(darkDevice)).toBe(norm(darkSwitch));
  });

  it("no colour token is defined anywhere else (one light value, two dark ones)", () => {
    for (const t of tokens.color.tokens) {
      const defs = [...css.matchAll(new RegExp(`--${t.name}:\\s*#`, "g"))];
      expect(defs, t.name).toHaveLength(3);
    }
  });

  it.each([...tokens.spacing.tokens, ...tokens.radius.tokens].map((t) => [t.name, t.value] as const))("%s = %s", (name, v) => {
    expect(norm(value(light, name))).toBe(norm(v));
  });

  it("Tailwind's rounded-* classes use the same corners", () => {
    const theme = block("@theme");
    for (const t of tokens.radius.tokens) expect(norm(value(theme, t.name)), t.name).toBe(norm(t.value));
  });

  it("shadows: the card shadow in light only (none in dark), the pop shadow in both", () => {
    const card = tokens.shadow.tokens.find((t) => t.name === "shadow-card")!.value;
    const pop = tokens.shadow.tokens.find((t) => t.name === "shadow-pop")!.value;
    expect(norm(value(light, "shadow-card"))).toBe(norm(card));
    expect(norm(value(light, "shadow-pop"))).toBe(norm(pop));
    expect(value(darkDevice, "shadow-card")).toBe("none");
    expect(value(darkSwitch, "shadow-card")).toBe("none");
  });

  it("background stars: their own colour (D-140: lighter warm gold in light, the accent in dark) and strength", () => {
    expect(value(light, "star-colour")).toBe("#C49A3A");
    expect(value(darkDevice, "star-colour")).toBe("var(--accent)");
    expect(value(darkSwitch, "star-colour")).toBe("var(--accent)");
    expect(value(light, "star-strength")).toBe("0.6");
    expect(value(darkDevice, "star-strength")).toBe("0.38");
    expect(value(darkSwitch, "star-strength")).toBe("0.38");
    expect(block(".star-field-svg")).toContain("fill: var(--star-colour)");
    expect(block(".gap-stars-svg")).toContain("fill: var(--star-colour)");
  });

  it("--star-colour is decoration only: used as a star fill, never for text, borders or backgrounds", () => {
    const uses = [...css.matchAll(/([\w-]+):\s*var\(--star-colour\)/g)].map((m) => m[1]);
    expect(uses).toEqual(["fill", "fill"]); // the star field and its copy in the desktop gap
  });

  it("the browser's address-bar colours are the bg token", () => {
    const bg = tokens.color.tokens.find((t) => t.name === "bg")!.value;
    expect(THEME_COLOR).toEqual({ light: bg.light, dark: bg.dark });
  });

  it("removed names are gone (spec §1.2)", () => {
    for (const old of ["--shadow:", "--star:", "--accent-border", "--sun-soft", "--soon-border", "--font-cormorant"]) {
      expect(css, old).not.toContain(old);
    }
  });
});

describe("no hard-coded colours in components", () => {
  const files = ["app", "components"].flatMap((dir) => {
    const path = join(import.meta.dirname, "..", dir);
    return readdirSync(path, { recursive: true })
      .map(String)
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => join(dir, f));
  });

  it("finds the page and component files", () => {
    expect(files).toContain(join("components", "site-header.tsx"));
    expect(files).toContain(join("app", "birth-form.tsx"));
  });

  it.each(files.map((f) => [f] as const))("%s has no hex colour", (f) => {
    const text = readFileSync(join(import.meta.dirname, "..", f), "utf8");
    expect(text.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])/g) ?? []).toEqual([]);
  });
});
