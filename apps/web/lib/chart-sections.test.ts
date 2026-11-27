// Edge cases of the chart page's section view models (step 0.5.1): time left, period lengths, a birth after
// the calculation moment, the 120-year cycle over, and no Sade Sati running. R01's own values are checked
// in chart-page.test.ts; all 29 reference births go through the 0.3.7 builders in tests/reference.
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { mahaRowViews, nextSignChanges, periodYears, rightNowView, sadeSatiCard, timeLeft } from "./chart-sections";
import { fakeResponse } from "./list-fixtures";
import { listContext } from "./list-context";

const AS_OF = "2026-11-26T12:00:00Z";

describe("time left and lengths", () => {
  it.each([
    ["2026-11-26T18:00:00Z", "1 day left"],
    ["2026-12-01T12:00:00Z", "5 days left"],
    ["2027-01-05T12:00:00Z", "40 days left"],
    ["2027-10-11T12:00:00Z", "about 10 months left"],
    ["2031-11-26T12:00:00Z", "about 5 years left"],
  ])("until %s → %s", (end, words) => {
    expect(timeLeft(AS_OF, end, en)).toBe(words);
  });

  it("whole Vimshottari years", () => {
    expect(periodYears("2011-10-11T00:00:00Z", "2027-10-11T06:00:00Z")).toBe(16);
    expect(periodYears("2090-01-01T00:00:00Z", "2096-01-01T00:00:00Z")).toBe(6);
  });
});

describe("a birth after the calculation moment (D-113)", () => {
  const ctx = listContext(fakeResponse({ birthUtc: "2030-03-01T00:00:00Z", asOf: AS_OF, cycleStart: "2020-01-01T00:00:00Z" }), en);
  it("Right now keeps its plain line, no tiers, no active areas; the dasha rows still work", () => {
    const v = rightNowView(ctx);
    expect(v.heading).toBe("Your periods");
    expect(v.message).toBe("The timeline starts at birth (1 Mar 2030). No period is running yet.");
    expect(v.tiers).toEqual([]);
    expect(v.lifeAreasLink).toBeNull();
    expect(v.comingUp.length).toBeGreaterThan(0);
    expect(mahaRowViews(ctx).every((m) => !m.row.current)).toBe(true);
  });
  it("Sade Sati: none now, said calmly, with what comes next", () => {
    const c = sadeSatiCard(ctx);
    expect(c.phase).toBe("none");
    expect(c.heading).toBe("No Sade Sati right now");
    expect(c.segments).toBeNull();
    expect(c.detail).toBe("No further Sade Sati within 120 years of birth.");
    expect(rightNowView(ctx).sadeSatiLink).toBe("Sade Sati: not running now. No further Sade Sati within 120 years of birth.");
  });
});

describe("after the 120-year cycle (D-114)", () => {
  const ctx = listContext(fakeResponse({ birthUtc: "1853-06-28T12:25:00Z", asOf: AS_OF, cycleStart: "1850-01-01T00:00:00Z", offsetSeconds: -5 * 3600 }), en);
  it("says so; nothing coming up", () => {
    const v = rightNowView(ctx);
    expect(v.message).toMatch(/^The 120-year dasha cycle of this chart ended on/);
    expect(v.comingUp).toEqual([]);
    expect(v.nothingNext).toBe(en.lists.rightNow.nothingNext);
  });
  it("next sign changes: only those after the calculation moment (none in this fixture)", () => {
    expect(nextSignChanges(ctx)).toEqual([]);
  });
});
