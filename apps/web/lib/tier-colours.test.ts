// The Right now tier colours (D-115 item 4): label text on the card must reach 4.5:1 in both themes,
// and each bar fill must stand out from its track (3:1, WCAG non-text). Read from globals.css.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
const values = (name: string) => [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, "g"))].map((m) => m[1]!);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe("Right now tier colours", () => {
  const card = values("card");
  const line = values("line");
  it.each([
    ["light", 0],
    ["dark", 1],
  ] as const)("%s theme", (_n, i) => {
    const tiers = [values("tier-1")[i]!, values("tier-2")[i]!, values("tier-3")[i]!];
    expect(new Set(tiers).size).toBe(3);
    for (const c of tiers) {
      expect(contrast(c, card[i]!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c, line[i]!)).toBeGreaterThanOrEqual(3);
    }
  });
});
