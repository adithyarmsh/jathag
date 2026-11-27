import { describe, expect, it } from "vitest";
import { emptySky, extendSky, OPACITY_MAX, OPACITY_MIN, STAR_MAX, STAR_MIN, STARS_PER_TILE, starCount, starsInRect, type Random } from "./stars";

/** A repeatable random source (mulberry32) so tests can fix the sequence. */
function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("background stars", () => {
  it("count follows the area: 38 per 320 × 320 px (D-140: about 35% more than the 28 of D-117)", () => {
    expect(STARS_PER_TILE).toBe(38);
    expect(starCount(320, 320)).toBe(38);
    expect(starCount(640, 320)).toBe(76);
    expect(starCount(360, 3000)).toBe(401); // 360 × 3000 × 38 / 320² = 400.8
    expect(starCount(0, 500)).toBe(0);
    expect(starCount(-1, 500)).toBe(0);
  });

  it("sizes from STAR_MIN to 1.5 × STAR_MIN; opacity 0.5–1 rises with size; inside the area", () => {
    expect(STAR_MIN).toBe(3.5); // D-118: 3.5 px to 5.25 px tip to tip
    expect(STAR_MAX).toBe(5.25);
    expect(STAR_MAX).toBe(STAR_MIN * 1.5);
    const stars = starsInRect(10, 20, 1000, 2000, seeded(1));
    expect(stars.length).toBe(starCount(1000, 2000));
    for (const s of stars) {
      expect(s.size).toBeGreaterThanOrEqual(STAR_MIN);
      expect(s.size).toBeLessThanOrEqual(STAR_MAX);
      expect(s.opacity).toBeGreaterThanOrEqual(OPACITY_MIN);
      expect(s.opacity).toBeLessThanOrEqual(OPACITY_MAX);
      expect(s.x).toBeGreaterThanOrEqual(10);
      expect(s.x).toBeLessThan(1010);
      expect(s.y).toBeGreaterThanOrEqual(20);
      expect(s.y).toBeLessThan(2020);
    }
    const bySize = [...stars].sort((a, b) => a.size - b.size);
    for (let i = 1; i < bySize.length; i++) expect(bySize[i]!.opacity).toBeGreaterThanOrEqual(bySize[i - 1]!.opacity);
    // The full range is used
    expect(bySize[0]!.size).toBeLessThan(STAR_MIN + 0.1);
    expect(bySize.at(-1)!.size).toBeGreaterThan(STAR_MAX - 0.1);
  });

  it("different random sources give different positions (every page load differs)", () => {
    const a = starsInRect(0, 0, 360, 800, seeded(1));
    const b = starsInRect(0, 0, 360, 800, seeded(2));
    expect(a.length).toBe(b.length);
    expect(a.map((s) => s.x)).not.toEqual(b.map((s) => s.x));
    // Same source → same stars (the tests can fix it)
    expect(starsInRect(0, 0, 360, 800, seeded(1))).toEqual(a);
  });

  it("growing the page keeps every existing star and fills only the new area", () => {
    const r = seeded(7);
    const s1 = extendSky(emptySky, 360, 1000, r);
    expect(s1.stars.length).toBe(starCount(360, 1000));
    const s2 = extendSky(s1, 360, 3000, r); // taller after "See my chart"
    expect(s2.stars.slice(0, s1.stars.length)).toEqual(s1.stars);
    const added = s2.stars.slice(s1.stars.length);
    expect(added.length).toBe(starCount(360, 2000));
    for (const s of added) expect(s.y).toBeGreaterThanOrEqual(1000);
    const s3 = extendSky(s2, 1280, 3000, r); // wider window
    expect(s3.stars.slice(0, s2.stars.length)).toEqual(s2.stars);
    for (const s of s3.stars.slice(s2.stars.length)) expect(s.x).toBeGreaterThanOrEqual(360);
    // Density stays about 38 per tile over the whole area
    expect(s3.stars.length / starCount(1280, 3000)).toBeCloseTo(1, 1);
    // Shrinking changes nothing
    expect(extendSky(s3, 360, 500, r)).toBe(s3);
  });
});
