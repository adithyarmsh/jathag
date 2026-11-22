// Transits + Sade Sati (step 0.3.2, D-099, TEST-04). There is no JHora answer key for transits, so
// these are self-checks against Swiss Ephemeris itself, an independent dense scan, hand-made cases
// and the Project's remembered Saturn dates. The founder's JHora spot-check is step 0.3.3.
import { describe, expect, it } from 'vitest';
import {
  calculateChart,
  calculateSadeSati,
  createSwephAdapter,
  crossingTimeline,
  EPHEMERIS_DATA_END,
  EPHEMERIS_DATA_START,
  EphemerisError,
  placement,
  rawCrossings,
  STEP_DAYS,
  transitsForChart,
  TransitInputError,
  type Chart,
  type SadeSati,
  type SearchBody,
  type Sign,
  type SignCrossing,
} from '../src/index.ts';

const eph = createSwephAdapter();
const DAY = 86_400_000;
const MIN = 60_000;
const HOUR = 3_600_000;
const ms = (iso: string) => Date.parse(iso);
const jd = (t: number) => t / DAY + 2440587.5;
const signAt = (body: SearchBody | 'Ke', t: number): Sign => {
  if (body === 'Ke') return placement(eph.siderealBody(jd(t), 'Ra').lon + 180).sign;
  return placement(eph.siderealBody(jd(t), body).lon).sign;
};

/** Swiss Ephemeris puts the planet in the from-sign 1 minute before and in the to-sign 1 minute after. */
function expectCrossingHolds(c: SignCrossing) {
  const t = ms(c.utc);
  expect(signAt(c.planet, t - MIN), `${c.planet} ${c.utc} before`).toBe(c.fromSign);
  expect(signAt(c.planet, t + MIN), `${c.planet} ${c.utc} after`).toBe(c.toSign);
  // and to the second: the reported second is the first one in the new sign
  expect(signAt(c.planet, t - 1000)).toBe(c.fromSign);
  expect(signAt(c.planet, t)).toBe(c.toSign);
}

/** Independent dense scan: every sign change between samples `step` apart. */
function denseScan(body: SearchBody, from: string, to: string, step: number) {
  const out: { hourStart: number; from: Sign; to: Sign }[] = [];
  let t = ms(from);
  let s = signAt(body, t);
  for (let u = t + step; u <= ms(to); u += step) {
    const su = signAt(body, u);
    if (su !== s) out.push({ hourStart: t, from: s, to: su });
    t = u;
    s = su;
  }
  return out;
}

const R01 = calculateChart({ utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 });
const AS_OF = '2026-11-22T06:00:00Z';

describe('positions now (FR-TRAN-01/02)', () => {
  it('at asOf = the birth moment, the transit positions are exactly the natal positions', () => {
    const t = transitsForChart(R01, { asOf: R01.meta.input.utc });
    for (const g of ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'] as const) {
      const n = R01.bodies[g];
      const p = t.positions[g];
      expect(p.lon).toBe(n.lon);
      expect(p.speed).toBe(n.speed);
      expect(p.retrograde).toBe(n.retrograde);
      expect([p.sign, p.nakshatra, p.pada, p.navamsaSign]).toEqual([n.sign, n.nakshatra, n.pada, n.navamsaSign]);
      expect(p.houseFromLagna).toBe(n.house);
    }
  });

  it('every graha is the one Swiss Ephemeris gives at asOf; Ketu = Rahu + 180°', () => {
    const t = transitsForChart(R01, { asOf: AS_OF });
    const j = jd(ms(AS_OF));
    for (const g of ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra'] as const) {
      expect(t.positions[g].lon).toBeCloseTo(eph.siderealBody(j, g).lon, 9);
    }
    expect(t.positions.Ke.lon).toBeCloseTo((t.positions.Ra.lon + 180) % 360, 9);
    expect(t.positions.Ra.retrograde).toBe(true);
  });

  it('houses from the Moon sign and from the Lagna sign (hand-made)', () => {
    // A copy of R01 with hand-picked Moon and Lagna signs.
    const fake = (moon: Sign, lagna: Sign): Chart => ({
      ...R01,
      bodies: { ...R01.bodies, Mo: { ...R01.bodies.Mo, sign: moon }, La: { ...R01.bodies.La, sign: lagna } },
    });
    const t = transitsForChart(fake(11, 1), { asOf: '2026-01-01T00:00:00Z' }); // Saturn in Pisces (12)
    expect(t.positions.Sa.sign).toBe(12);
    expect(t.positions.Sa.houseFromMoon).toBe(2); // Pisces is the 2nd from Aquarius
    expect(t.positions.Sa.houseFromLagna).toBe(12); // and the 12th from Aries
    const u = transitsForChart(fake(12, 12), { asOf: '2026-01-01T00:00:00Z' });
    expect(u.positions.Sa.houseFromMoon).toBe(1);
    expect(u.positions.Sa.houseFromLagna).toBe(1);
    const v = transitsForChart(fake(1, 6), { asOf: '2026-01-01T00:00:00Z' });
    expect(v.positions.Sa.houseFromMoon).toBe(12);
    expect(v.positions.Sa.houseFromLagna).toBe(7);
    expect(v.natal).toEqual({ moonSign: 1, lagnaSign: 6 });
  });
});

describe('sign changes (FR-TRAN-03)', () => {
  const t = transitsForChart(R01, { asOf: AS_OF });

  it('every reported crossing: from-sign 1 minute before, to-sign 1 minute after (and to the second)', () => {
    for (const list of Object.values(t.signChanges)) {
      expect(list.length).toBeGreaterThan(0);
      list.forEach(expectCrossingHolds);
    }
  });

  it('window: starts at the most recent "enters" at or before asOf, ends within 10 years after asOf', () => {
    const asOf = ms(AS_OF);
    for (const list of Object.values(t.signChanges)) {
      expect(list[0].kind).toBe('enters');
      expect(ms(list[0].utc)).toBeLessThanOrEqual(asOf);
      const past = list.filter((c) => ms(c.utc) <= asOf);
      expect(past.filter((c) => c.kind === 'enters')).toHaveLength(1);
      expect(ms(list.at(-1)!.utc)).toBeLessThanOrEqual(ms('2036-11-22T06:00:00Z'));
      // times strictly increasing
      for (let i = 1; i < list.length; i++) expect(ms(list[i].utc)).toBeGreaterThan(ms(list[i - 1].utc));
    }
    // ... and the next crossing after the window is more than 10 years away
    const sa = crossingTimeline(eph, 'Sa', ms(AS_OF), ms('2040-01-01T00:00:00Z'));
    const after = sa.crossings.find((c) => c.ms > ms(t.signChanges.Sa.at(-1)!.utc))!;
    expect(after.ms).toBeGreaterThan(ms('2036-11-22T06:00:00Z'));
  });

  it('Rahu and Ketu change sign at the same moments into opposite signs; the mean node only "enters"', () => {
    const { Ra, Ke } = t.signChanges;
    expect(Ke).toHaveLength(Ra.length);
    Ra.forEach((r, i) => {
      expect(Ke[i].utc).toBe(r.utc);
      expect(Ke[i].fromSign).toBe(((r.fromSign + 5) % 12) + 1);
      expect(Ke[i].toSign).toBe(((r.toSign + 5) % 12) + 1);
      expect(r.kind).toBe('enters');
      expect(Ke[i].kind).toBe('enters');
      expect(r.toSign).toBe(r.fromSign === 1 ? 12 : r.fromSign - 1); // backwards through the zodiac
    });
  });

  it('kinds: "moves-back" goes against the normal direction, "enters-again" re-enters the sign just left', () => {
    for (const list of [t.signChanges.Sa, t.signChanges.Ju]) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const forward = c.toSign === (c.fromSign % 12) + 1;
        expect(forward).toBe(c.kind !== 'moves-back');
        if (c.kind === 'enters-again') {
          expect(list[i - 1].kind).toBe('moves-back');
          expect(list[i - 1].fromSign).toBe(c.toSign);
        }
      }
    }
  });

  it("the Project's Saturn example (sidereal Lahiri) matches within 1 day", () => {
    const sa = crossingTimeline(eph, 'Sa', ms('2019-06-01T00:00:00Z'), ms('2025-12-31T00:00:00Z')).crossings;
    const want: [string, number, number, string][] = [
      ['2020-01-24', 9, 10, 'enters'], // into Capricorn
      ['2022-04-29', 10, 11, 'enters'], // into Aquarius
      ['2022-07-12', 11, 10, 'moves-back'], // back into Capricorn
      ['2023-01-17', 10, 11, 'enters-again'], // into Aquarius again
      ['2025-03-29', 11, 12, 'enters'], // into Pisces
    ];
    expect(sa).toHaveLength(want.length);
    want.forEach(([day, from, to, kind], i) => {
      expect([sa[i].from, sa[i].to, sa[i].kind]).toEqual([from, to, kind]);
      // within 1 day of the date (taken as noon UTC of that day, so either Indian or UTC date is fine)
      expect(Math.abs(sa[i].ms - ms(`${day}T12:00:00Z`))).toBeLessThan(DAY);
    });
  });
});

describe('completeness: an independent dense scan finds exactly the same crossings', () => {
  const compare = (body: SearchBody, from: string, to: string) => {
    const ours = rawCrossings(eph, body, ms(from), ms(to));
    const dense = denseScan(body, from, to, HOUR);
    expect(ours.length).toBe(dense.length);
    ours.forEach((c, i) => {
      expect([c.from, c.to]).toEqual([dense[i].from, dense[i].to]);
      expect(c.ms).toBeGreaterThan(dense[i].hourStart);
      expect(c.ms).toBeLessThanOrEqual(dense[i].hourStart + HOUR);
    });
    return ours.length;
  };
  it('Saturn, 1960–2040 (1-hour scan)', () => {
    expect(compare('Sa', '1960-01-01T00:00:00Z', '2040-01-01T00:00:00Z')).toBeGreaterThan(40);
  });
  it('Jupiter, 1990–2040 (1-hour scan)', () => {
    expect(compare('Ju', '1990-01-01T00:00:00Z', '2040-01-01T00:00:00Z')).toBeGreaterThan(60);
  });
  it('Rahu, 2000–2030 (1-hour scan)', () => {
    expect(compare('Ra', '2000-01-01T00:00:00Z', '2030-01-01T00:00:00Z')).toBe(19);
  });
});

describe('why a 5-day step is safe', () => {
  /** Stations (speed changes sign) found with a 1-day scan over the whole data range. */
  const stations = (body: SearchBody) => {
    const out: number[] = [];
    const a = ms(EPHEMERIS_DATA_START);
    const b = ms(EPHEMERIS_DATA_END);
    let prev = Math.sign(eph.siderealBody(jd(a), body).speed);
    for (let t = a + DAY; t <= b; t += DAY) {
      const s = Math.sign(eph.siderealBody(jd(t), body).speed);
      if (s !== prev) out.push(t);
      prev = s;
    }
    return out;
  };
  it.each(['Sa', 'Ju'] as const)('%s: stations are always far more than 5 days apart (1800–2400)', (body) => {
    const st = stations(body);
    expect(st.length).toBeGreaterThan(1000);
    let minGap = Infinity;
    for (let i = 1; i < st.length; i++) minGap = Math.min(minGap, st[i] - st[i - 1]);
    expect(minGap / DAY).toBeGreaterThan(100);
    expect(STEP_DAYS).toBe(5);
  });
  it('the mean node never stations: its speed is always negative (1800–2400, every 10 days)', () => {
    for (let t = ms(EPHEMERIS_DATA_START); t <= ms(EPHEMERIS_DATA_END); t += 10 * DAY) {
      const s = eph.siderealBody(jd(t), 'Ra').speed;
      expect(s).toBeLessThan(-0.05);
      expect(s).toBeGreaterThan(-0.056);
    }
  });
  it('the data range constants are right: the data starts at 1800-01-01 01:08:07 UTC; the end limit is inside the data', () => {
    expect(() => eph.siderealBody(jd(ms(EPHEMERIS_DATA_START)), 'Sa')).not.toThrow();
    expect(() => eph.siderealBody(jd(ms(EPHEMERIS_DATA_START) - MIN), 'Sa')).toThrow(EphemerisError);
    expect(() => eph.siderealBody(jd(ms(EPHEMERIS_DATA_END)), 'Sa')).not.toThrow();
  });
});

// ---------------------------------------------------------------- Sade Sati

const sadeSati = (moonSign: Sign, birthUtc: string, asOf = AS_OF) => calculateSadeSati({ moonSign, birthUtc, asOf, ephemeris: eph });

function expectWellFormed(s: SadeSati) {
  for (const p of s.periods) {
    expect(p.phases.rising.end).toBe(p.phases.peak.start);
    expect(p.phases.peak.end).toBe(p.phases.setting.start);
    expect(p.phases.setting.end).toBe(p.end);
    if (p.start) {
      expect(p.phases.rising.start).toBe(p.start);
      expect(p.crossings[0].utc).toBe(p.start);
      expect(p.crossings[0]).toMatchObject({ kind: 'enters', fromHouse: 11, toHouse: 12 });
    }
    if (p.end) {
      // the final exit can be a first entry into the 3rd or a re-entry after a last dip
      expect(p.crossings.at(-1)).toMatchObject({ utc: p.end, fromHouse: 2, toHouse: 3 });
      expect(p.crossings.at(-1)!.kind).not.toBe('moves-back');
    }
    p.crossings.forEach(expectCrossingHolds);
    // phase starts are first entries
    if (p.phases.peak.start) expect(p.crossings.find((c) => c.toHouse === 1)!.utc).toBe(p.phases.peak.start);
    if (p.phases.setting.start) expect(p.crossings.find((c) => c.toHouse === 2)!.utc).toBe(p.phases.setting.start);
    // every crossing inside stays within houses 11–3 (a dip out of the 12th or 2nd at most)
    for (const c of p.crossings) expect([11, 12, 1, 2, 3]).toContain(c.toHouse);
    expect(p.startedBeforeBirth).toBe(p.start == null || ms(p.start) < ms(s.span.start));
    if (p.start && p.end) {
      const years = (ms(p.end) - ms(p.start)) / (365.25 * DAY);
      expect(years).toBeGreaterThan(6); // shortest seen ≈ 6.4 years (Saturn fast near perihelion)
      expect(years).toBeLessThan(9.5);
    }
  }
  // overlap the span, in order, far apart
  for (let i = 0; i < s.periods.length; i++) {
    const p = s.periods[i];
    if (p.end) expect(ms(p.end)).toBeGreaterThan(ms(s.span.start));
    if (p.start) expect(ms(p.start)).toBeLessThanOrEqual(ms(s.span.end));
    if (i > 0) expect(ms(p.start!) - ms(s.periods[i - 1].end!)).toBeGreaterThan(15 * 365.25 * DAY);
  }
}

describe('Sade Sati (FR-TRAN-04, D-099)', () => {
  it('Moon sign Aquarius: rising from 24 Jan 2020, peak from 29 Apr 2022, setting from 29 Mar 2025', () => {
    const s = sadeSati(11, '1990-06-15T00:00:00Z');
    expectWellFormed(s);
    expect(s.signs).toEqual({ rising: 10, peak: 11, setting: 12 });
    const p = s.periods.find((x) => x.start!.startsWith('2020'))!;
    expect(p.phases.rising.start!.slice(0, 10)).toBe('2020-01-24');
    expect(p.phases.peak.start!.slice(0, 10)).toBe('2022-04-29');
    expect(p.phases.setting.start!.slice(0, 10)).toBe('2025-03-29');
    expect(p.end!.slice(0, 7)).toBe('2028-02'); // final exit from Pisces (after the 2027 dip)
    // the dip inside the peak is listed, not split off
    expect(p.crossings.map((c) => [c.utc.slice(0, 10), c.kind, c.toHouse])).toEqual([
      ['2020-01-24', 'enters', 12],
      ['2022-04-29', 'enters', 1],
      ['2022-07-12', 'moves-back', 12],
      ['2023-01-17', 'enters-again', 1],
      ['2025-03-29', 'enters', 2],
      ['2027-06-02', 'enters', 3],
      ['2027-10-20', 'moves-back', 2],
      ['2028-02-23', 'enters-again', 3],
    ]);
    expect(p.startedBeforeBirth).toBe(false);
  });

  it('status: setting now; during a dip the phase stays "peak" while Saturn is back in the 12th', () => {
    const now = sadeSati(11, '1990-06-15T00:00:00Z', AS_OF).status;
    expect(now.phase).toBe('setting');
    expect(now.saturn).toEqual({ sign: 12, houseFromMoon: 2 });
    expect(now.current!.start!.slice(0, 10)).toBe('2020-01-24');
    expect(now.next!.start!.slice(0, 4)).toBe('2049');

    const dip = sadeSati(11, '1990-06-15T00:00:00Z', '2022-09-01T00:00:00Z').status;
    expect(dip.phase).toBe('peak');
    expect(dip.saturn).toEqual({ sign: 10, houseFromMoon: 12 });

    const before = sadeSati(11, '1990-06-15T00:00:00Z', '2019-01-01T00:00:00Z').status;
    expect(before.phase).toBe('none');
    expect(before.current).toBeNull();
    expect(before.next!.start!.slice(0, 10)).toBe('2020-01-24');

    const edge = sadeSati(11, '1990-06-15T00:00:00Z', '2022-04-29T02:23:42Z').status; // the exact second peak starts
    expect(edge.phase).toBe('peak');
  });

  it('works for all 12 Moon signs and finds 4–5 periods in 120 years', () => {
    for (let m = 1 as Sign; m <= 12; m = (m + 1) as Sign) {
      const s = sadeSati(m, '1950-03-03T03:03:03Z');
      expectWellFormed(s);
      expect(s.periods.length).toBeGreaterThanOrEqual(4);
      expect(s.periods.length).toBeLessThanOrEqual(5);
    }
  });

  it('a period already running at birth keeps its true start and is marked', () => {
    const s = sadeSati(11, '2023-05-05T00:00:00Z');
    expectWellFormed(s);
    expect(s.periods[0].start!.slice(0, 10)).toBe('2020-01-24');
    expect(s.periods[0].startedBeforeBirth).toBe(true);
    expect(s.periods.slice(1).every((p) => !p.startedBeforeBirth)).toBe(true);
  });

  it('a birth just after the data begins (1800): a period already running has an unknown start', () => {
    // On 1800-01-01 Saturn was in Cancer (4), retrograde, ~13° from Leo.
    const birth = '1800-01-01T02:00:00Z';
    const peak = sadeSati(4, birth); // Cancer = peak sign
    expectWellFormed(peak);
    expect(peak.periods[0]).toMatchObject({ start: null, startOutsideData: true, startedBeforeBirth: true });
    expect(peak.periods[0].phases.rising).toEqual({ start: null, end: null });
    expect(peak.periods[0].phases.peak.start).toBeNull();
    expect(peak.periods[0].phases.setting.start).not.toBeNull();
    expect(sadeSati(4, birth, '1800-06-01T00:00:00Z').status.phase).toBe('peak');

    const rising = sadeSati(5, birth); // Leo: Cancer is its 12th
    expect(rising.periods[0].start).toBeNull();
    expect(rising.periods[0].phases.peak.start).not.toBeNull();
    expect(sadeSati(5, birth, '1800-06-01T00:00:00Z').status.phase).toBe('rising');

    const setting = sadeSati(3, birth); // Gemini: Cancer is its 2nd
    expect(setting.periods[0].phases.setting.start).toBeNull();
    expect(setting.periods[0].end).not.toBeNull();
    expect(sadeSati(3, birth, '1800-06-01T00:00:00Z').status.phase).toBe('setting');

    const none = sadeSati(9, birth); // Sagittarius: no period at birth
    expectWellFormed(none);
    expect(none.periods.every((p) => p.start != null && !p.startedBeforeBirth)).toBe(true);
  });

  it('a birth in 2100: the span runs to 2220 and the last period is complete', () => {
    const s = sadeSati(7, '2100-12-31T18:00:00Z', AS_OF);
    expectWellFormed(s);
    expect(s.span.end).toBe('2220-12-31T18:00:00Z');
    expect(s.periods.every((p) => p.start && p.end && !p.endOutsideData)).toBe(true);
    expect(ms(s.periods.at(-1)!.start!)).toBeGreaterThan(ms('2190-01-01T00:00:00Z'));
    expect(s.status.phase).toBe('none'); // asOf (2026) is before birth
    expect(s.status.next).toEqual(expect.objectContaining({ index: 0 }));
  });
});

describe('determinism and input checks (NFR-DET-01)', () => {
  it('same chart + asOf + engine version → byte-identical output, also with a fresh adapter', () => {
    const a = JSON.stringify(transitsForChart(R01, { asOf: AS_OF }));
    const b = JSON.stringify(transitsForChart(R01, { asOf: AS_OF }));
    const c = JSON.stringify(transitsForChart(R01, { asOf: AS_OF, ephemeris: createSwephAdapter() }));
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
  it('asOf must be an ISO UTC time', () => {
    expect(() => transitsForChart(R01, { asOf: '2026-11-22' })).toThrow(TransitInputError);
    expect(() => transitsForChart(R01, { asOf: 'now' })).toThrow(TransitInputError);
  });
});
