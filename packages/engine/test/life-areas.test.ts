// Life-area windows (step 0.3.4, D-028, D-104): hand-made checks of the rule and the period helper.
// The check on all 29 reference births is in tests/reference/life-areas.test.ts.
import { describe, expect, it } from 'vitest';
import {
  calculateChart,
  DashaInputError,
  dashaRefs,
  GRAHAS,
  LIFE_AREA_HOUSES,
  LIFE_AREAS,
  LifeAreaInputError,
  lifeAreaLinks,
  lifeAreasForChart,
  periodsForLifeArea,
  signsRuledBy,
  vimshottariTimeline,
  type DashaLevel,
  type GrahaCode,
  type LifeAreaId,
  type LifeAreaLinks,
} from '../src/index.ts';

type Signs = Record<GrahaCode, number>;
/** All grahas in Aries unless overridden. */
const signs = (over: Partial<Signs> = {}): Signs => ({ Su: 1, Mo: 1, Ma: 1, Me: 1, Ju: 1, Ve: 1, Sa: 1, Ra: 1, Ke: 7, ...over });
const areasOf = (links: LifeAreaLinks, g: GrahaCode) => links[g].map((l) => l.area);
const linkOf = (links: LifeAreaLinks, g: GrahaCode, a: LifeAreaId) => links[g].find((l) => l.area === a);

describe('the life-area table (Requirements §6.6)', () => {
  it('has the ten areas with their houses, and every house belongs to at least one area', () => {
    expect(LIFE_AREAS).toEqual(['self', 'money', 'communication', 'home', 'learning', 'health', 'relationships', 'career', 'luck', 'spirituality']);
    expect(LIFE_AREA_HOUSES).toEqual({
      self: [1], money: [2, 11], communication: [3], home: [4], learning: [5], health: [1, 6],
      relationships: [7], career: [6, 10], luck: [9], spirituality: [8, 12],
    });
    const covered = new Set(Object.values(LIFE_AREA_HOUSES).flat());
    expect([...covered].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('sign lords are the standard Parashari ones; Rahu and Ketu rule nothing', () => {
    expect(Object.fromEntries(GRAHAS.map((g) => [g, signsRuledBy(g)]))).toEqual({
      Su: [5], Mo: [4], Ma: [1, 8], Me: [3, 6], Ju: [9, 12], Ve: [2, 7], Sa: [10, 11], Ra: [], Ke: [],
    });
  });
});

describe('the rule (rules or occupies one of the area houses)', () => {
  it('a planet that rules and sits in the same house: one flag, two reasons', () => {
    // Aries Lagna, Mars in Aries: rules + occupies house 1 (Self, Health), also rules Scorpio = house 8.
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ma: 1 }) });
    expect(l.Ma).toEqual([
      { area: 'self', reasons: [{ kind: 'rules', house: 1, sign: 1 }, { kind: 'occupies', house: 1 }] },
      { area: 'health', reasons: [{ kind: 'rules', house: 1, sign: 1 }, { kind: 'occupies', house: 1 }] },
      { area: 'spirituality', reasons: [{ kind: 'rules', house: 8, sign: 8 }] },
    ]);
  });

  it('a dual-sign lord flags the areas of both houses it rules', () => {
    // Aries Lagna, Venus in Cancer: rules Taurus (2, Money) and Libra (7, Relationships), sits in 4 (Home).
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ve: 4 }) });
    expect(l.Ve).toEqual([
      { area: 'money', reasons: [{ kind: 'rules', house: 2, sign: 2 }] },
      { area: 'home', reasons: [{ kind: 'occupies', house: 4 }] },
      { area: 'relationships', reasons: [{ kind: 'rules', house: 7, sign: 7 }] },
    ]);
  });

  it('one area reached through two houses lists both reasons, houses ascending', () => {
    // Taurus Lagna, Jupiter in Cancer: rules Sagittarius (8) and Pisces (11), sits in 3.
    // Spirituality (12, 8) gets house 8; Money (2, 11) gets 11; Communication gets 3.
    const l = lifeAreaLinks({ lagnaSign: 2, signs: signs({ Ju: 4 }) });
    expect(l.Ju).toEqual([
      { area: 'money', reasons: [{ kind: 'rules', house: 11, sign: 12 }] },
      { area: 'communication', reasons: [{ kind: 'occupies', house: 3 }] },
      { area: 'spirituality', reasons: [{ kind: 'rules', house: 8, sign: 9 }] },
    ]);
    // Leo Lagna, Saturn in Pisces (8): rules Capricorn (6) and Aquarius (7).
    const s = lifeAreaLinks({ lagnaSign: 5, signs: signs({ Sa: 12 }) });
    expect(linkOf(s, 'Sa', 'spirituality')).toEqual({ area: 'spirituality', reasons: [{ kind: 'occupies', house: 8 }] });
    // Money via both its houses: Aries Lagna, Venus rules 2 and sits in Aquarius (11).
    const v = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ve: 11 }) });
    expect(linkOf(v, 'Ve', 'money')).toEqual({ area: 'money', reasons: [{ kind: 'rules', house: 2, sign: 2 }, { kind: 'occupies', house: 11 }] });
  });

  it('house 6 flags both Health and Career', () => {
    // Aries Lagna, Mercury in Virgo: rules Gemini (3) and Virgo (6), sits in 6.
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Me: 6 }) });
    const six = [{ kind: 'rules', house: 6, sign: 6 }, { kind: 'occupies', house: 6 }];
    expect(l.Me).toEqual([
      { area: 'communication', reasons: [{ kind: 'rules', house: 3, sign: 3 }] },
      { area: 'health', reasons: six },
      { area: 'career', reasons: six },
    ]);
  });

  it('house 1 flags Self and Health; the Lagna lord always does', () => {
    // Aries Lagna, Saturn in Aries: sits in 1, rules Capricorn (10) and Aquarius (11).
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Sa: 1 }) });
    expect(l.Sa).toEqual([
      { area: 'self', reasons: [{ kind: 'occupies', house: 1 }] },
      { area: 'money', reasons: [{ kind: 'rules', house: 11, sign: 11 }] },
      { area: 'health', reasons: [{ kind: 'occupies', house: 1 }] },
      { area: 'career', reasons: [{ kind: 'rules', house: 10, sign: 10 }] },
    ]);
    // Mars is the Aries Lagna lord: Self and Health wherever it sits.
    for (let s = 1; s <= 12; s++) {
      const m = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ma: s }) });
      expect(linkOf(m, 'Ma', 'self')?.reasons[0]).toEqual({ kind: 'rules', house: 1, sign: 1 });
      expect(linkOf(m, 'Ma', 'health')?.reasons[0]).toEqual({ kind: 'rules', house: 1, sign: 1 });
    }
  });

  it('Rahu and Ketu are flagged by occupation only, never as a sign lord', () => {
    // Aries Lagna, Rahu in Leo (5), Ketu in Aquarius (11).
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ra: 5, Ke: 11 }) });
    expect(l.Ra).toEqual([{ area: 'learning', reasons: [{ kind: 'occupies', house: 5 }] }]);
    expect(l.Ke).toEqual([{ area: 'money', reasons: [{ kind: 'occupies', house: 11 }] }]);
    // Rahu in house 6 (Virgo): Health and Career, and still only by occupation.
    const r6 = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ra: 6, Ke: 12 }) });
    expect(areasOf(r6, 'Ra')).toEqual(['health', 'career']);
    expect(areasOf(r6, 'Ke')).toEqual(['spirituality']);
    // Over every Lagna and every sign: exactly one reason, "occupies" (no lordship of the sign they sit in).
    for (let lagna = 1; lagna <= 12; lagna++) {
      for (let s = 1; s <= 12; s++) {
        const x = lifeAreaLinks({ lagnaSign: lagna, signs: signs({ Ra: s, Ke: ((s + 5) % 12) + 1 }) });
        for (const g of ['Ra', 'Ke'] as const) {
          const reasons = x[g].flatMap((a) => a.reasons);
          expect(reasons.every((r) => r.kind === 'occupies')).toBe(true);
          expect(new Set(reasons.map((r) => r.house)).size).toBe(1);
        }
      }
    }
  });

  it('the Sun and the Moon rule one sign each', () => {
    // Aries Lagna. Sun in Aries: sits in 1, rules Leo (5). Moon in Cancer: rules + sits in 4.
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Su: 1, Mo: 4 }) });
    expect(l.Su).toEqual([
      { area: 'self', reasons: [{ kind: 'occupies', house: 1 }] },
      { area: 'learning', reasons: [{ kind: 'rules', house: 5, sign: 5 }] },
      { area: 'health', reasons: [{ kind: 'occupies', house: 1 }] },
    ]);
    expect(l.Mo).toEqual([{ area: 'home', reasons: [{ kind: 'rules', house: 4, sign: 4 }, { kind: 'occupies', house: 4 }] }]);
  });

  it('no karaka flags: Venus is not linked to Relationships unless it rules or sits in house 7', () => {
    // Gemini Lagna, Venus in Taurus: rules Taurus (12) and Libra (5), sits in 12.
    const l = lifeAreaLinks({ lagnaSign: 3, signs: signs({ Ve: 2 }) });
    expect(areasOf(l, 'Ve')).toEqual(['learning', 'spirituality']);
    // Capricorn Lagna, Jupiter (karaka of Money, Learning, Luck) in Gemini (6): rules 3 and 12.
    const j = lifeAreaLinks({ lagnaSign: 10, signs: signs({ Ju: 3 }) });
    expect(areasOf(j, 'Ju')).toEqual(['communication', 'health', 'career', 'spirituality']);
  });

  it('a graha with no matching house has an empty list, never a missing key', () => {
    const l = lifeAreaLinks({ lagnaSign: 1, signs: signs() });
    expect(Object.keys(l)).toEqual([...GRAHAS]);
    // Every graha always rules or occupies something, and every house is in some area, so none is empty.
    for (const g of GRAHAS) expect(l[g].length).toBeGreaterThan(0);
  });

  it('refuses bad input', () => {
    expect(() => lifeAreaLinks({ lagnaSign: 0, signs: signs() })).toThrow(LifeAreaInputError);
    expect(() => lifeAreaLinks({ lagnaSign: 13, signs: signs() })).toThrow(LifeAreaInputError);
    expect(() => lifeAreaLinks({ lagnaSign: 1, signs: signs({ Sa: 1.5 }) })).toThrow(LifeAreaInputError);
    const { Ke: _k, ...missing } = signs();
    expect(() => lifeAreaLinks({ lagnaSign: 1, signs: missing as Signs })).toThrow(LifeAreaInputError);
  });
});

// Lord of houses 1–12 for each Lagna, written out by hand (not computed) so the house numbering is checked
// independently of the code.
const LORDS_BY_LAGNA: Record<number, string> = {
  1: 'Ma Ve Me Mo Su Me Ve Ma Ju Sa Sa Ju',
  2: 'Ve Me Mo Su Me Ve Ma Ju Sa Sa Ju Ma',
  3: 'Me Mo Su Me Ve Ma Ju Sa Sa Ju Ma Ve',
  4: 'Mo Su Me Ve Ma Ju Sa Sa Ju Ma Ve Me',
  5: 'Su Me Ve Ma Ju Sa Sa Ju Ma Ve Me Mo',
  6: 'Me Ve Ma Ju Sa Sa Ju Ma Ve Me Mo Su',
  7: 'Ve Ma Ju Sa Sa Ju Ma Ve Me Mo Su Me',
  8: 'Ma Ju Sa Sa Ju Ma Ve Me Mo Su Me Ve',
  9: 'Ju Sa Sa Ju Ma Ve Me Mo Su Me Ve Ma',
  10: 'Sa Sa Ju Ma Ve Me Mo Su Me Ve Ma Ju',
  11: 'Sa Ju Ma Ve Me Mo Su Me Ve Ma Ju Sa',
  12: 'Ju Ma Ve Me Mo Su Me Ve Ma Ju Sa Sa',
};

describe('lordship → house numbering for every Lagna sign', () => {
  it.each(Object.entries(LORDS_BY_LAGNA).map(([l, s]) => [Number(l), s.split(' ')] as const))('Lagna sign %i', (lagna, lords) => {
    // Every graha sits in the Lagna sign; only "rules" reasons are looked at here.
    const l = lifeAreaLinks({ lagnaSign: lagna, signs: signs(Object.fromEntries(GRAHAS.map((g) => [g, lagna])) as Signs) });
    for (let house = 1; house <= 12; house++) {
      const sign = ((lagna - 1 + house - 1) % 12) + 1;
      const rulers = GRAHAS.filter((g) => l[g].some((a) => a.reasons.some((r) => r.kind === 'rules' && r.house === house)));
      expect(rulers, `house ${house}`).toEqual([lords[house - 1]]);
      const reason = l[rulers[0]].flatMap((a) => a.reasons).find((r) => r.kind === 'rules' && r.house === house);
      expect(reason).toEqual({ kind: 'rules', house, sign });
    }
    // The Lagna lord is in Self and Health with "rules house 1".
    expect(linkOf(l, lords[0] as GrahaCode, 'self')?.reasons).toContainEqual({ kind: 'rules', house: 1, sign: lagna });
    expect(linkOf(l, lords[0] as GrahaCode, 'health')?.reasons).toContainEqual({ kind: 'rules', house: 1, sign: lagna });
  });
});

describe('periods for one life area (all three levels)', () => {
  // Fixed timeline, no ephemeris: Moon at 0° (Ashwini) → first mahadasha Ketu, from birth.
  const timeline = vimshottariTimeline({ moonLon: 0, birthUtc: '2000-01-01T00:00:00Z', dashaYear: '365.25' });
  // Aries Lagna; Venus rules 7; Jupiter sits in Libra (7). Nobody else touches house 7.
  const links = lifeAreaLinks({ lagnaSign: 1, signs: signs({ Ju: 7, Ve: 2, Ke: 4, Ra: 10 }) });
  const rel = (level: DashaLevel) => periodsForLifeArea(timeline, links, 'relationships', level);

  it('mahadasha level: the Venus and Jupiter mahadashas, in time order, with their reasons', () => {
    const md = rel('mahadasha');
    expect(md.map((p) => [p.path, p.lord])).toEqual([[[1], 'Ve'], [[6], 'Ju']]);
    expect(md[0].start).toBe(timeline.mahadashas[1].start);
    expect(md[0].end).toBe(timeline.mahadashas[1].end);
    expect(md[0].reasons).toEqual([{ kind: 'rules', house: 7, sign: 7 }]);
    expect(md[1].reasons).toEqual([{ kind: 'occupies', house: 7 }]);
  });

  it('antardasha and pratyantardasha levels: every Venus or Jupiter period, each by its own lord', () => {
    const ad = rel('antardasha');
    const pd = rel('pratyantardasha');
    expect(ad).toHaveLength(2 * 9);
    expect(pd).toHaveLength(2 * 81);
    for (const p of [...ad, ...pd]) expect(['Ve', 'Ju']).toContain(p.lord);
    // The path points at the real period, with the same lord and dates.
    for (const p of ad) {
      const a = timeline.mahadashas[p.path[0]].antardashas[p.path[1]];
      expect([a.lord, a.start, a.end]).toEqual([p.lord, p.start, p.end]);
    }
    for (const p of pd) {
      const x = timeline.mahadashas[p.path[0]].antardashas[p.path[1]].pratyantardashas[p.path[2]];
      expect([x.lord, x.start, x.end]).toEqual([p.lord, p.start, p.end]);
    }
    // Time order, no overlaps.
    for (const list of [ad, pd]) for (let i = 1; i < list.length; i++) expect(list[i].start >= list[i - 1].end).toBe(true);
    // A Venus pratyantardasha inside the Ketu mahadasha / Saturn antardasha is flagged by Venus, not by its parents.
    const keSaVe = pd.find((p) => p.path[0] === 0 && timeline.mahadashas[0].antardashas[p.path[1]].lord === 'Sa' && p.lord === 'Ve');
    expect(keSaVe).toBeDefined();
  });

  it('counts at each level match the lords linked to the area, for every area', () => {
    for (const area of LIFE_AREAS) {
      const k = GRAHAS.filter((g) => links[g].some((l) => l.area === area)).length;
      expect(periodsForLifeArea(timeline, links, area, 'mahadasha')).toHaveLength(k);
      expect(periodsForLifeArea(timeline, links, area, 'antardasha')).toHaveLength(9 * k);
      expect(periodsForLifeArea(timeline, links, area, 'pratyantardasha')).toHaveLength(81 * k);
    }
  });

  it('dashaRefs lists 9 / 81 / 729 periods; unknown levels and areas are refused', () => {
    expect(dashaRefs(timeline, 'mahadasha')).toHaveLength(9);
    expect(dashaRefs(timeline, 'antardasha')).toHaveLength(81);
    expect(dashaRefs(timeline, 'pratyantardasha')).toHaveLength(729);
    expect(() => dashaRefs(timeline, 'sookshma' as DashaLevel)).toThrow(DashaInputError);
    expect(() => periodsForLifeArea(timeline, links, 'fame' as LifeAreaId, 'mahadasha')).toThrow(LifeAreaInputError);
  });

  it('returned reasons are copies: changing them does not change the links', () => {
    const md = rel('mahadasha');
    md[0].reasons[0].house = 99;
    expect(linkOf(links, 'Ve', 'relationships')?.reasons[0].house).toBe(7);
  });
});

describe('from a calculated chart', () => {
  it('uses the chart Lagna and signs, and is deterministic', () => {
    const chart = calculateChart({ utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 });
    const s = Object.fromEntries(GRAHAS.map((g) => [g, chart.bodies[g].sign])) as Signs;
    const a = lifeAreasForChart(chart);
    expect(a).toEqual(lifeAreaLinks({ lagnaSign: chart.bodies.La.sign, signs: s }));
    expect(JSON.stringify(lifeAreasForChart(chart))).toBe(JSON.stringify(a));
  });
});
