import { describe, expect, it } from "vitest";
import { fakeResponse } from "./list-fixtures";
import { listContext } from "./list-context";
import { positionRows, sadeSatiPeriodViews, sadeSatiStatus, sadeSatiSummary, signChangeGroups, signChangeRowCount, signChangeSummary } from "./transit-view";
import en from "../messages/en.json";

const AS_OF = "2026-11-22T06:00:00.000Z";
const base = { birthUtc: "1992-08-14T01:15:00Z", asOf: AS_OF, cycleStart: "1985-01-01T00:00:00Z" };

const phases = (r: string | null, p: string | null, s: string | null, end: string | null) => ({
  rising: { start: r, end: p },
  peak: { start: p, end: s },
  setting: { start: s, end },
});

describe("transit lists", () => {
  it("today's positions: 9 grahas, houses from Moon and Lagna, R as in the planet table (never on Rahu/Ketu)", () => {
    const rows = positionRows(listContext(fakeResponse(base), en));
    expect(rows.map((r) => r.name)).toEqual(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]);
    const by = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(by.Sa).toMatchObject({ sign: "Pisces", fromMoon: "3", fromLagna: "8", retrograde: "" });
    expect(by.Ma!.retrograde).toBe("R");
    expect(by.Ra!.retrograde).toBe("—"); // retrograde in the data, never marked (D-093)
    expect(by.Ke!.retrograde).toBe("—");
  });

  it("Saturn 2022–2023: enters / moves back into / enters again (D-099 item 3), dates on the birth clock", () => {
    const groups = signChangeGroups(listContext(fakeResponse(base), en));
    expect(groups.map((g) => g.name)).toEqual(["Saturn", "Jupiter", "Rahu", "Ketu"]);
    expect(groups[0]!.rows.map((r) => `${r.date} ${r.text}`)).toEqual([
      "29 Apr 2022 Enters Aquarius",
      "12 Jul 2022 Moves back into Capricorn",
      "17 Jan 2023 Enters Aquarius again",
    ]);
    expect(groups[1]!.rows).toEqual([]);
    // Rahu and Ketu always "enter" (separate rows)
    expect(groups[2]!.rows.map((r) => r.text)).toEqual(["Enters Aquarius"]);
    expect(groups[3]!.rows.map((r) => r.text)).toEqual(["Enters Leo"]);
  });

  it("Sade Sati status: none → next start and where Saturn is now", () => {
    const st = sadeSatiStatus(listContext(fakeResponse(base), en));
    expect(st.statusText).toBe("Not running");
    expect(st.current).toBeNull();
    expect(st.nextText).toBe("No further Sade Sati within 120 years of birth.");
    expect(st.saturnText).toBe("Saturn now: Pisces, house 3 from the Moon");
  });

  it("Sade Sati running now: phase, dates, You are here, crossings inside the period", () => {
    const p0 = {
      start: "2020-01-24T06:55:00Z",
      end: "2028-02-23T05:00:00Z",
      startedBeforeBirth: false,
      startOutsideData: false,
      endOutsideData: false,
      phases: phases("2020-01-24T06:55:00Z", "2022-04-28T20:00:00Z", "2025-03-29T04:00:00Z", "2028-02-23T05:00:00Z"),
      crossings: [
        { planet: "Sa", utc: "2020-01-24T06:55:00Z", fromSign: 8, toSign: 9, kind: "enters", fromHouse: 11, toHouse: 12 },
        { planet: "Sa", utc: "2022-07-12T09:00:00Z", fromSign: 11, toSign: 10, kind: "moves-back", fromHouse: 2, toHouse: 1 },
      ],
    };
    const p1 = { ...p0, start: "2049-01-01T00:00:00Z", end: "2057-01-01T00:00:00Z", crossings: [] };
    const ref = (i: number, p: typeof p0) => ({ index: i, start: p.start, end: p.end, phases: p.phases });
    const ctx = listContext(
      fakeResponse({
        ...base,
        sadeSati: {
          periods: [p0, p1] as never,
          status: { asOf: AS_OF, phase: "setting", current: ref(0, p0), next: ref(1, p1), saturn: { sign: 11, houseFromMoon: 2 } } as never,
        },
      }),
      en,
    );
    const st = sadeSatiStatus(ctx);
    expect(st.statusText).toBe("Setting phase");
    expect(st.current?.range).toBe("24 Jan 2020 – 23 Feb 2028");
    expect(st.current?.phases.map((p) => p.text)).toEqual([
      "Rising: Saturn in Sagittarius, from 24 Jan 2020",
      "Peak: Saturn in Capricorn, from 29 Apr 2022",
      "Setting: Saturn in Aquarius, from 29 Mar 2025",
    ]);
    const all = sadeSatiPeriodViews(ctx);
    expect(all.map((p) => p.current)).toEqual([true, false]);
    expect(all[0]!.crossings.map((c) => `${c.date} ${c.text}`)).toEqual([
      "24 Jan 2020 Enters Sagittarius · house 12 from the Moon",
      "12 Jul 2022 Moves back into Capricorn · house 1 from the Moon",
    ]);
  });

  it("null start/end (outside the ephemeris data, 1800 births) in words, never 'null'", () => {
    const early = {
      start: null,
      end: "1803-05-01T00:00:00Z",
      startedBeforeBirth: true,
      startOutsideData: true,
      endOutsideData: false,
      phases: phases(null, null, "1801-02-01T00:00:00Z", "1803-05-01T00:00:00Z"),
      crossings: [],
    };
    const late = {
      start: "2398-01-01T00:00:00Z",
      end: null,
      startedBeforeBirth: false,
      startOutsideData: false,
      endOutsideData: true,
      phases: phases("2398-01-01T00:00:00Z", "2399-09-01T00:00:00Z", null, null),
      crossings: [],
    };
    const ctx = listContext(
      fakeResponse({
        ...base,
        birthUtc: "1800-01-02T00:00:00Z",
        sadeSati: {
          periods: [early, late] as never,
          status: { asOf: AS_OF, phase: "none", current: null, next: { index: 1, start: late.start, end: null, phases: late.phases }, saturn: { sign: 11, houseFromMoon: 2 } } as never,
        },
      }),
      en,
    );
    const [a, b] = sadeSatiPeriodViews(ctx);
    expect(a!.range).toBe("before 1800 (outside our data) – 1 May 1803");
    expect(a!.beganBeforeBirth).toBe(true);
    expect(a!.phases.map((p) => p.text)).toEqual([
      "Rising: Saturn in Sagittarius, from before 1800 (outside our data)",
      "Peak: Saturn in Capricorn, from before 1800 (outside our data)",
      "Setting: Saturn in Aquarius, from 1 Feb 1801",
    ]);
    expect(b!.range).toBe("1 Jan 2398 – after 2399 (outside our data)");
    expect(b!.phases[2]!.text).toBe("Setting: Saturn in Aquarius, from after 2399 (outside our data)");
    expect(sadeSatiStatus(ctx).nextText).toBe("Next Sade Sati starts 1 Jan 2398");
    const words = JSON.stringify(sadeSatiPeriodViews(ctx));
    expect(words).not.toMatch(/null|undefined|NaN|Invalid/);
  });
});

describe("collapsed-list summaries (0.3.7.1, D-115 item 6)", () => {
  it("sign changes: the next change after asOf, same-day changes joined; a general line when none is left", () => {
    const res = fakeResponse(base);
    expect(signChangeSummary(listContext(res, en))).toBe("Sign changes of Saturn, Jupiter, Rahu and Ketu");
    res.transits.signChanges.Ra.push({ planet: "Ra", utc: "2026-12-06T08:00:00Z", fromSign: 11, toSign: 10, kind: "enters" });
    res.transits.signChanges.Ke.push({ planet: "Ke", utc: "2026-12-06T08:00:00Z", fromSign: 5, toSign: 4, kind: "enters" });
    res.transits.signChanges.Sa.push({ planet: "Sa", utc: "2027-06-03T00:00:00Z", fromSign: 12, toSign: 1, kind: "enters" });
    const ctx = listContext(res, en);
    expect(signChangeSummary(ctx)).toBe("Next: Rahu enters Capricorn and Ketu enters Cancer on 6 Dec 2026");
    expect(signChangeRowCount(ctx)).toBe(8);
  });

  it("Sade Sati: number of periods", () => {
    const res = fakeResponse(base);
    expect(sadeSatiSummary(listContext(res, en))).toBe("No Sade Sati between birth and 120 years after birth.");
    const p = { start: "2020-01-01T00:00:00Z", end: "2027-01-01T00:00:00Z", startedBeforeBirth: false, startOutsideData: false, endOutsideData: false, phases: phases(null, null, null, null), crossings: [] };
    res.transits.sadeSati.periods = [p] as never;
    expect(sadeSatiSummary(listContext(res, en))).toBe("1 period from birth to 120 years after birth");
    res.transits.sadeSati.periods = [p, p, p, p] as never;
    expect(sadeSatiSummary(listContext(res, en))).toBe("4 periods from birth to 120 years after birth");
  });
});

describe("per-planet sign-change summaries (0.3.7.1)", () => {
  it("count and the next change", () => {
    const res = fakeResponse(base);
    res.transits.signChanges.Ra.push({ planet: "Ra", utc: "2026-12-06T08:00:00Z", fromSign: 11, toSign: 10, kind: "enters" });
    const g = signChangeGroups(listContext(res, en));
    expect(g.map((x) => x.summary)).toEqual([
      "3 sign changes",
      "0 sign changes",
      "2 sign changes · next: enters Capricorn on 6 Dec 2026",
      "1 sign change",
    ]);
  });
});
