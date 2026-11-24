import { describe, expect, it } from "vitest";
import { antardashaRows, dashaNow, mahadashaRows, pratyantardashaRows } from "./dasha-view";
import { fakeResponse } from "./list-fixtures";
import { listContext } from "./list-context";
import en from "../messages/en.json";

const AS_OF = "2026-11-22T06:00:00.000Z";

// Cycle from 1960 with 13-year Mahadashas: the 1st and 2nd ended before a 1990 birth, the 3rd (1986–1999)
// is running at birth; inside it, Antardashas and Pratyantardashas before birth exist as well.
const born = () =>
  listContext(
    fakeResponse({
      birthUtc: "1990-12-01T04:00:00Z",
      asOf: AS_OF,
      cycleStart: "1960-01-01T00:00:00Z",
      lifeAreas: {
        // Rahu = the Mahadasha lord at AS_OF in this cycle
        Ra: [
          { area: "home", reasons: [{ kind: "occupies", house: 4 }] },
          { area: "career", reasons: [{ kind: "occupies", house: 10 }] },
        ],
      },
    }),
    en,
  );

describe("dasha lists: periods before birth (D-113 item 3)", () => {
  it("hides Mahadashas that ended before birth and marks the one running at birth with its true start", () => {
    const ctx = born();
    const rows = mahadashaRows(ctx);
    const tl = ctx.result.dashas.vimshottari;
    expect(tl.mahadashas.filter((m) => m.endedBeforeBirth)).toHaveLength(2);
    expect(rows).toHaveLength(7);
    expect(rows.some((r) => tl.mahadashas[r.path[0]!]!.endedBeforeBirth)).toBe(false);
    const first = rows[0]!;
    expect(first.path).toEqual([2]);
    expect(first.beganBeforeBirth).toBe(true);
    expect(first.startUtc).toBe(tl.mahadashas[2]!.start); // true start, not the birth
    expect(first.start).toBe("31 Dec 1985"); // 1985-12-31T18:00Z on +5:30 = 23:30
    expect(rows.slice(1).every((r) => !r.beganBeforeBirth)).toBe(true);
  });

  it("hides Antardashas and Pratyantardashas that ended before birth too", () => {
    const ctx = born();
    const m = ctx.result.dashas.vimshottari.mahadashas[2]!;
    const antars = antardashaRows(ctx, 2);
    expect(antars).toHaveLength(m.antardashas.filter((a) => !a.endedBeforeBirth).length);
    expect(antars.length).toBeLessThan(9);
    expect(antars[0]!.beganBeforeBirth).toBe(true);
    const j = antars[0]!.path[1]!;
    const prats = pratyantardashaRows(ctx, 2, j);
    expect(prats.length).toBeLessThan(9);
    expect(prats).toHaveLength(m.antardashas[j]!.pratyantardashas.filter((p) => !p.endedBeforeBirth).length);
    expect(prats[0]!.beganBeforeBirth).toBe(true);
    // A later Mahadasha shows all 9 at both levels
    expect(antardashaRows(ctx, 5)).toHaveLength(9);
    expect(pratyantardashaRows(ctx, 5, 4)).toHaveLength(9);
    expect(antardashaRows(ctx, 99)).toEqual([]);
  });

  it("marks exactly the current period at each level (You are here)", () => {
    const ctx = born();
    const cur = ctx.result.dashas.current;
    const mahas = mahadashaRows(ctx).filter((r) => r.current);
    expect(mahas.map((r) => r.path)).toEqual([cur.mahadasha!.path]);
    const antars = antardashaRows(ctx, cur.mahadasha!.path[0]!).filter((r) => r.current);
    expect(antars.map((r) => r.path)).toEqual([cur.antardasha!.path]);
    const [i, j] = cur.antardasha!.path as [number, number];
    expect(pratyantardashaRows(ctx, i, j).filter((r) => r.current).map((r) => r.path)).toEqual([cur.pratyantardasha!.path]);
    // Not current anywhere else
    expect(antardashaRows(ctx, 8).some((r) => r.current)).toBe(false);
  });

  it("formats each row's range with the clock at birth", () => {
    const ctx = born();
    const r = mahadashaRows(ctx)[1]!;
    expect(r.range).toBe(`${r.start} – ${r.end}`);
    expect(r.lordName).toBe(en.chart.bodies[r.lord]);
  });
});

describe("Right now (dashaNow)", () => {
  it("lists the three current periods with level labels and what they activate", () => {
    const ctx = born();
    const now = dashaNow(ctx);
    expect(now.state).toBe("running");
    expect(now.message).toBeNull();
    expect(now.current.map((c) => c.label)).toEqual([
      "Mahadasha (long-term)",
      "Antardasha (medium-term)",
      "Pratyantardasha (short-term)",
    ]);
    expect(now.current[0]!.row.lord).toBe("Ra");
    // Tier labels and progress (0.3.7.1, D-115 item 4)
    expect(now.current.map((c) => c.tierLabel)).toEqual(["Long-term · Mahadasha", "Medium-term · Antardasha", "Short-term · Pratyantardasha"]);
    for (const c of now.current) {
      expect(c.progress!.fraction).toBeGreaterThanOrEqual(0);
      expect(c.progress!.fraction).toBeLessThan(1);
      expect(c.progressText).toBe(`About ${c.progress!.percent}% through`);
    }
    expect(now.current[0]!.activates).toBe("Activates: Home, mother & inner peace, Career & work");
    const other = now.current.find((c) => c.row.lord !== "Ra");
    if (other) expect(other.activates).toBe("Activates: No life area linked");
    // Coming up = dashas.next at each level
    const next = ctx.result.dashas.next;
    expect(now.next.map((n) => n.row.path)).toEqual([next.mahadasha!.path, next.antardasha!.path, next.pratyantardasha!.path]);
    expect(now.next[0]!.startsText).toBe(`starts ${now.next[0]!.row.start}`);
    expect(now.nothingNext).toBeNull();
  });

  it("birth after the calculation moment: no current period, says the timeline starts at birth, shows next starts", () => {
    const ctx = listContext(
      fakeResponse({ birthUtc: "2030-03-01T00:00:00Z", asOf: AS_OF, cycleStart: "2020-01-01T00:00:00Z" }),
      en,
    );
    expect(ctx.result.dashas.current).toEqual({ mahadasha: null, antardasha: null, pratyantardasha: null });
    const now = dashaNow(ctx);
    expect(now.state).toBe("notBorn");
    expect(now.message).toBe("The timeline starts at birth (1 Mar 2030). No period is running yet.");
    expect(now.current).toEqual([]);
    expect(now.next).toHaveLength(3);
    const tl = ctx.result.dashas.vimshottari;
    for (const n of now.next) {
      expect(Date.parse(n.row.startUtc)).toBeGreaterThan(Date.parse(AS_OF));
      const [i, j, k] = n.row.path;
      const p = n.level === "mahadasha" ? tl.mahadashas[i!]! : n.level === "antardasha" ? tl.mahadashas[i!]!.antardashas[j!]! : tl.mahadashas[i!]!.antardashas[j!]!.pratyantardashas[k!]!;
      expect(p.endedBeforeBirth).toBe(false);
    }
    // The API's own "next" Antardasha here ended before birth, so a later one is shown instead
    const apiNext = ctx.result.dashas.next.antardasha!;
    expect(tl.mahadashas[apiNext.path[0]!]!.antardashas[apiNext.path[1]!]!.endedBeforeBirth).toBe(true);
    expect(now.next[1]!.row.path).not.toEqual(apiNext.path);
    // The lists themselves still work
    expect(mahadashaRows(ctx).length).toBeGreaterThan(0);
    expect(mahadashaRows(ctx).some((r) => r.current)).toBe(false);
  });

  it("calculation moment after the 120-year cycle: says so, nothing coming up", () => {
    const ctx = listContext(
      fakeResponse({ birthUtc: "1853-06-28T12:25:00Z", asOf: AS_OF, cycleStart: "1850-01-01T00:00:00Z", offsetSeconds: -5 * 3600 }),
      en,
    );
    const now = dashaNow(ctx);
    expect(now.state).toBe("cycleEnded");
    expect(now.message).toMatch(/^The 120-year dasha cycle of this chart ended on \d{1,2} [A-Z][a-z]{2} 1967\./);
    expect(now.current).toEqual([]);
    expect(now.next).toEqual([]);
    expect(now.nothingNext).toBe(en.lists.rightNow.nothingNext);
  });
});
