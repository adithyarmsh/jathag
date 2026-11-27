// Contrast of every colour pair the app shell uses (step 0.4.5, design spec §1.2 and §15, NFR-ACC-01),
// in both themes, read from globals.css (which tokens.test.ts ties to docs/design/tokens.json).
// Text needs 4.5:1 (WCAG 2.2 AA); control edges and the focus ring need 3:1 (WCAG 1.4.11).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./contrast";

const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
/** [light, dark] for a colour token (the first two of its three definitions). */
const token = (name: string) => {
  const v = [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, "g"))].map((m) => m[1]!);
  expect(v, name).toHaveLength(3);
  return [v[0]!, v[1]!] as const;
};

// [foreground, background, minimum, where it is used]
const PAIRS: [string, string, number, string][] = [
  ["ink", "bg", 4.5, "header links, wordmark, menu rows"],
  ["ink", "card", 4.5, "card text"],
  ["ink", "raised", 4.5, "inner tiles"],
  ["muted", "bg", 4.5, "footer text, menu sub-lines"],
  ["muted", "card", 4.5, "hints, one-liners"],
  ["muted", "raised", 4.5, "tile text"],
  ["accent-text", "bg", 4.5, "gold text on the page"],
  ["accent-text", "card", 4.5, "eyebrows, hero phrase"],
  ["on-accent", "accent", 4.5, "primary button, selected toggle"],
  ["ink", "accent-soft", 4.5, "Beta band, current menu row"],
  ["muted", "accent-soft", 4.5, "menu sub-line on the current row"],
  ["accent-text", "accent-soft", 4.5, "highlighted phrases"],
  ["error", "card", 4.5, "error messages"],
  ["field-border", "card", 3, "field, toggle and chip edges"],
  ["field-border", "bg", 3, "BETA pill and menu toggle edge"],
  ["focus", "bg", 3, "focus ring on the page"],
  ["focus", "card", 3, "focus ring in cards"],
];

describe.each([
  ["light", 0],
  ["dark", 1],
] as const)("%s theme", (_theme, i) => {
  it.each(PAIRS.map(([fg, bg, min, use]) => [`${fg} on ${bg} (${use})`, fg, bg, min] as const))(
    "%s",
    (_name, fg, bg, min) => {
      expect(contrast(token(fg)[i], token(bg)[i])).toBeGreaterThanOrEqual(min);
    },
  );
});
