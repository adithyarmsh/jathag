import { describe, expect, it } from "vitest";
import { GRAHAS, LIFE_AREAS } from "@jathag/engine";
import { lifeAreaViews } from "./life-area-view";
import { fakeResponse } from "./list-fixtures";
import { GRAHA_ORDER, LIFE_AREA_ORDER, listContext } from "./list-context";
import en from "../messages/en.json";

const AS_OF = "2026-11-22T06:00:00.000Z";

describe("life-area list", () => {
  it("uses the engine's own orders (graha and life area)", () => {
    expect(GRAHA_ORDER).toEqual(GRAHAS);
    expect(LIFE_AREA_ORDER).toEqual(LIFE_AREAS);
    for (const a of LIFE_AREAS) expect(en.lists.lifeAreas.names[a]).toBeTruthy();
  });

  it("lists linked planets with every reason in words; Rahu/Ketu by occupation; empty areas; Health note; current lords", () => {
    const res = fakeResponse({
      birthUtc: "1992-08-14T01:15:00Z",
      asOf: AS_OF,
      cycleStart: "1985-01-01T00:00:00Z",
      lifeAreas: {
        Ju: [
          { area: "luck", reasons: [{ kind: "rules", house: 9, sign: 12 }, { kind: "occupies", house: 9 }] },
          { area: "spirituality", reasons: [{ kind: "rules", house: 12, sign: 3 }] },
        ],
        Ra: [{ area: "relationships", reasons: [{ kind: "occupies", house: 7 }] }],
        Ve: [{ area: "relationships", reasons: [{ kind: "rules", house: 7, sign: 7 }] }],
      },
    });
    const ctx = listContext(res, en);
    const views = lifeAreaViews(ctx);
    expect(views.map((v) => v.area)).toEqual([...LIFE_AREAS]);
    const by = Object.fromEntries(views.map((v) => [v.area, v]));
    expect(by.luck!.planets.map((p) => `${p.name}: ${p.reasons}`)).toEqual(["Jupiter: rules house 9 (Pisces), sits in house 9"]);
    // Two planets, engine graha order (Venus before Rahu); Rahu only "sits in"
    expect(by.relationships!.planets.map((p) => `${p.name}: ${p.reasons}`)).toEqual([
      "Venus: rules house 7 (Libra)",
      "Rahu: sits in house 7",
    ]);
    expect(by.money!.planets).toEqual([]);
    expect(by.money!.empty).toBe("No planet linked");
    expect(by.health!.note).toBe("This is general wellness information, not medical advice.");
    expect(views.filter((v) => v.note).map((v) => v.area)).toEqual(["health"]);

    // Lords of the periods running now are marked
    const cur = res.dashas.current;
    for (const v of views)
      for (const p of v.planets) {
        const want = (["mahadasha", "antardasha", "pratyantardasha"] as const)
          .filter((l) => cur[l]?.lord === p.code)
          .map((l) => `current ${en.lists.levels[l]}`);
        expect(p.current).toEqual(want);
      }
  });
});
