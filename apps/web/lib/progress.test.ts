import { describe, expect, it } from "vitest";
import { periodProgress } from "./progress";

const S = "2020-01-01T00:00:00Z";
const E = "2030-01-01T00:00:00Z";

describe("periodProgress", () => {
  it("start, middle and end", () => {
    expect(periodProgress(S, E, S)).toEqual({ fraction: 0, percent: 0 });
    const mid = new Date((Date.parse(S) + Date.parse(E)) / 2).toISOString();
    expect(periodProgress(S, E, mid)).toEqual({ fraction: 0.5, percent: 50 });
    expect(periodProgress(S, E, E)).toEqual({ fraction: 1, percent: 100 });
  });

  it("rounds the percent to a whole number", () => {
    expect(periodProgress(S, E, "2026-04-20T00:00:00Z")!.percent).toBe(63);
  });

  it("clamps before the start and after the end", () => {
    expect(periodProgress(S, E, "1999-01-01T00:00:00Z")).toEqual({ fraction: 0, percent: 0 });
    expect(periodProgress(S, E, "2099-01-01T00:00:00Z")).toEqual({ fraction: 1, percent: 100 });
  });

  it("null dates, bad dates or no length give null", () => {
    expect(periodProgress(null, E, S)).toBeNull();
    expect(periodProgress(S, null, S)).toBeNull();
    expect(periodProgress("nonsense", E, S)).toBeNull();
    expect(periodProgress(S, E, "nonsense")).toBeNull();
    expect(periodProgress(E, S, S)).toBeNull();
    expect(periodProgress(S, S, S)).toBeNull();
  });
});
