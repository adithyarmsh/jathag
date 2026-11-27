// The red "Coming soon" tag (D-115 item 1): its text must reach WCAG 4.5:1 against the tag's own
// background, in both themes. The colours are read from globals.css, so the test follows the tokens.
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
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe("Coming soon tag colours", () => {
  const text = values("soon-text");
  const bg = values("soon-bg");
  // The surfaces the tag sits on since 0.4.5: the home page's raised tiles and the placeholder cards
  const surfaces = [values("raised"), values("card")];

  it("has one light and one dark shade (dark repeated for the switch)", () => {
    expect(text).toHaveLength(3);
    expect(bg).toHaveLength(3);
    expect(text[1]).toBe(text[2]);
    expect(bg[1]).toBe(bg[2]);
    expect(text[0]).not.toBe(text[1]);
  });

  it.each([
    ["light", 0],
    ["dark", 1],
  ] as const)("%s: text ≥ 4.5:1 on the tag background and on the surfaces around it", (_name, i) => {
    expect(contrast(text[i]!, bg[i]!)).toBeGreaterThanOrEqual(4.5);
    for (const s of surfaces) expect(contrast(text[i]!, s[i]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("is a red (red channel clearly highest)", () => {
    for (const c of [text[0]!, text[1]!]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      expect(r!).toBeGreaterThan(g! + 40);
      expect(r!).toBeGreaterThan(b! + 40);
    }
  });
});
