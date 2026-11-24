// Approximate-time scanner (step 0.3.6): hand-made checks. The five Project cases are in
// tests/reference/approx-time.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateChart,
  createSwephAdapter,
  MAX_SCAN_LATITUDE,
  placement,
  scanTimeRange,
  SettingsError,
  TIME_VALUES,
  TimeRangeError,
  VIMSHOTTARI_ORDER,
  type TimeRangeScan,
} from '../src/index.ts';
import { lagnaLongitude } from '../src/chart.ts';

const CHENNAI = { lat: 13.083333, lng: 80.283333 };
const scan = (fromUtc: string, toUtc: string, place: { lat: number; lng: number } = CHENNAI) => scanTimeRange({ fromUtc, toUtc, ...place });
const iso = (s: number) => new Date(s * 1000).toISOString().replace('.000Z', 'Z');
const sec = (i: string) => Date.parse(i) / 1000;

/** Every segment is contiguous, covers the range exactly, and each event separates two segments. */
function checkShape(r: TimeRangeScan) {
  const { fromUtc, toUtc } = r.meta.input;
  expect(r.segments[0]!.from).toBe(fromUtc);
  expect(r.segments.at(-1)!.to).toBe(toUtc);
  expect(r.segments).toHaveLength(r.events.length + 1);
  r.events.forEach((e, i) => {
    expect(r.segments[i]!.to).toBe(iso(sec(e.utc) - 1));
    expect(r.segments[i + 1]!.from).toBe(e.utc);
    expect(e.changes.length).toBeGreaterThan(0);
    for (const c of e.changes) {
      expect(r.segments[i]![c.value]).toBe(c.from);
      expect(r.segments[i + 1]![c.value]).toBe(c.to);
    }
  });
}

describe('simple ranges (Chennai, 1992-08-14, case A1)', () => {
  it('a range with no change: one segment, all six values certain, one dasha stretch', () => {
    const r = scan('1992-08-14T00:30:00Z', '1992-08-14T00:39:29Z');
    expect(r.events).toEqual([]);
    expect(r.segments).toEqual([{ from: '1992-08-14T00:30:00Z', to: '1992-08-14T00:39:29Z', ls: 4, ln: 9, ld9: 12, ms: 11, mn: 23, mp: 4 }]);
    expect(r.certain).toEqual([...TIME_VALUES]);
    expect(r.dasha).toHaveLength(1);
    expect(r.dasha[0]).toMatchObject({ from: '1992-08-14T00:30:00Z', to: '1992-08-14T00:39:29Z', moonNakshatra: 23, lordAtBirth: 'Ma' });
  });

  it('a single moment (start = end) is one segment of one second', () => {
    const r = scan('1992-08-14T00:39:30Z', '1992-08-14T00:39:30Z');
    expect(r.events).toEqual([]);
    expect(r.segments).toEqual([{ from: '1992-08-14T00:39:30Z', to: '1992-08-14T00:39:30Z', ls: 5, ln: 10, ld9: 1, ms: 11, mn: 23, mp: 4 }]);
    expect(r.meta.seconds).toBe(0);
  });

  it('a range that starts exactly on a change moment: no event at the start, the new values from the first second', () => {
    const r = scan('1992-08-14T00:39:30Z', '1992-08-14T00:45:00Z');
    expect(r.events.map((e) => e.utc)).not.toContain('1992-08-14T00:39:30Z');
    expect(r.segments[0]).toMatchObject({ from: '1992-08-14T00:39:30Z', ls: 5, ln: 10, ld9: 1 });
    checkShape(r);
  });

  it('a one-minute range across a change; several values changing in the same second form one event', () => {
    const r = scan('1992-08-14T00:39:00Z', '1992-08-14T00:40:00Z');
    expect(r.events).toEqual([
      { utc: '1992-08-14T00:39:30Z', changes: [{ value: 'ls', from: 4, to: 5 }, { value: 'ln', from: 9, to: 10 }, { value: 'ld9', from: 12, to: 1 }] },
    ]);
    expect(r.segments.map((s) => [s.from, s.to])).toEqual([
      ['1992-08-14T00:39:00Z', '1992-08-14T00:39:29Z'],
      ['1992-08-14T00:39:30Z', '1992-08-14T00:40:00Z'],
    ]);
    expect(r.certain).toEqual(['ms', 'mn', 'mp']);
  });

  it('a two-second range at both ends of a Moon nakshatra boundary: two stretches, two dasha lords', () => {
    // A1: Moon Dhanishta (23, Mars) → Shatabhisha (24, Rahu) at 05:42:36Z.
    const r = scan('1992-08-14T05:42:35Z', '1992-08-14T05:42:36Z');
    expect(r.events).toEqual([{ utc: '1992-08-14T05:42:36Z', changes: [{ value: 'mn', from: 23, to: 24 }, { value: 'mp', from: 4, to: 1 }] }]);
    expect(r.dasha.map((d) => [d.from, d.to, d.moonNakshatra, d.lordAtBirth])).toEqual([
      ['1992-08-14T05:42:35Z', '1992-08-14T05:42:35Z', 23, 'Ma'],
      ['1992-08-14T05:42:36Z', '1992-08-14T05:42:36Z', 24, 'Ra'],
    ]);
    // One second per stretch: both ends are the same moment, so the min and max dates are equal.
    for (const d of r.dasha) {
      expect(d.mahadashas).toHaveLength(9);
      expect(d.antardashas).toHaveLength(81);
      for (const p of [...d.mahadashas, ...d.antardashas]) {
        expect(p.startMin).toBe(p.startMax);
        expect(p.endMin).toBe(p.endMax);
      }
    }
    // Just before the boundary the Mars mahadasha ends within seconds of birth; just after it, Rahu has just begun.
    expect(r.dasha[0]!.mahadashas[0]!.lord).toBe('Ma');
    expect(r.dasha[1]!.mahadashas[0]!.lord).toBe('Ra');
  });

  it('dasha ranges: min ≤ max, nine mahadashas in order, antardashas grouped by their mahadasha', () => {
    const r = scan('1992-08-14T00:30:00Z', '1992-08-14T06:30:00Z');
    expect(r.dasha.map((d) => d.lordAtBirth)).toEqual(['Ma', 'Ra']);
    for (const d of r.dasha) {
      const first = VIMSHOTTARI_ORDER.indexOf(d.lordAtBirth);
      expect(d.mahadashas.map((m) => m.lord)).toEqual(d.mahadashas.map((_, i) => VIMSHOTTARI_ORDER[(first + i) % 9]));
      for (const p of [...d.mahadashas, ...d.antardashas]) {
        expect(sec(p.startMin)).toBeLessThanOrEqual(sec(p.startMax));
        expect(sec(p.endMin)).toBeLessThanOrEqual(sec(p.endMax));
      }
      d.mahadashas.forEach((m, i) => expect(d.antardashas.slice(i * 9, i * 9 + 9).every((a) => a.maha === m.lord)).toBe(true));
    }
  });
});

describe('the segments agree with the chart', () => {
  it('a chart calculated at the first and last second of every segment has that segment’s values', () => {
    const r = scan('1992-08-14T00:30:00Z', '1992-08-14T06:30:00Z');
    for (const s of r.segments) {
      for (const utc of [s.from, s.to]) {
        const { La, Mo } = calculateChart({ utc, ...CHENNAI }).bodies;
        expect({ ls: La.sign, ln: La.nakshatra, ld9: La.navamsaSign, ms: Mo.sign, mn: Mo.nakshatra, mp: Mo.pada }).toEqual({
          ls: s.ls, ln: s.ln, ld9: s.ld9, ms: s.ms, mn: s.mn, mp: s.mp,
        });
      }
    }
  });
});

describe('nothing is missed: same events as checking every single second', () => {
  const eph = createSwephAdapter();
  function bruteForce(fromUtc: string, toUtc: string, lat: number, lng: number) {
    const out: string[] = [];
    let prev: Record<string, number> | null = null;
    for (let s = sec(fromUtc); s <= sec(toUtc); s++) {
      const d = new Date(s * 1000);
      const jd = eph.julianDayUt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600);
      const L = placement(lagnaLongitude(eph, jd, lat, lng));
      const M = placement(eph.siderealBody(jd, 'Mo').lon);
      const v: Record<string, number> = { ls: L.sign, ln: L.nakshatra, ld9: L.navamsaSign, ms: M.sign, mn: M.nakshatra, mp: M.pada };
      if (prev) {
        const ch = TIME_VALUES.filter((k) => v[k] !== prev![k]).map((k) => `${k}:${prev![k]}>${v[k]}`);
        if (ch.length) out.push(`${iso(s)} ${ch.join(',')}`);
      }
      prev = v;
    }
    return out;
  }
  const asLines = (r: TimeRangeScan) => r.events.map((e) => `${e.utc} ${e.changes.map((c) => `${c.value}:${c.from}>${c.to}`).join(',')}`);

  it.each([
    ['Oslo (R19), 59.9°N, 6 hours', '1982-12-10T04:00:00Z', '1982-12-10T10:00:00Z', 59.916667, 10.75],
    ['66.5°N, the fastest Lagna allowed (two changes 1 s apart), 3 hours', '1850-03-20T03:00:00Z', '1850-03-20T06:00:00Z', 66.5, 25.7],
  ])('%s', (_name, from, to, lat, lng) => {
    const r = scan(from, to, { lat, lng });
    expect(asLines(r)).toEqual(bruteForce(from, to, lat, lng));
    checkShape(r);
  });
});

describe('invalid input', () => {
  const code = (f: () => unknown) => {
    try {
      f();
    } catch (e) {
      return [(e as Error).name, (e as { code?: string }).code];
    }
    return null;
  };

  it('the end before the start', () => {
    expect(code(() => scan('1992-08-14T06:00:00Z', '1992-08-14T05:59:59Z'))).toEqual(['TimeRangeError', 'RANGE_END_BEFORE_START']);
  });

  it.each([
    ['no seconds', '1992-08-14T06:00Z'],
    ['milliseconds', '1992-08-14T06:00:00.000Z'],
    ['no Z', '1992-08-14T06:00:00'],
    ['an offset instead of Z', '1992-08-14T06:00:00+05:30'],
    ['a date that does not exist', '1992-02-30T06:00:00Z'],
    ['hour 24', '1992-08-14T24:00:00Z'],
    ['not a string', 12345],
  ])('a time with %s', (_name, bad) => {
    expect(code(() => scan(bad as string, '1992-08-14T07:00:00Z'))).toEqual(['TimeRangeError', 'INVALID_RANGE_TIME']);
    expect(code(() => scan('1992-08-14T05:00:00Z', bad as string))).toEqual(['TimeRangeError', 'INVALID_RANGE_TIME']);
  });

  it('more than seven days', () => {
    expect(code(() => scan('1992-08-01T00:00:00Z', '1992-08-08T00:00:01Z'))).toEqual(['TimeRangeError', 'RANGE_TOO_LONG']);
  });

  it('latitude/longitude out of range, and unsupported settings, as for the chart', () => {
    expect(code(() => scan('1992-08-14T05:00:00Z', '1992-08-14T06:00:00Z', { lat: 91, lng: 0 }))).toEqual(['ChartInputError', 'INVALID_LOCATION']);
    expect(code(() => scan('1992-08-14T05:00:00Z', '1992-08-14T06:00:00Z', { lat: 0, lng: Number.NaN }))).toEqual(['ChartInputError', 'INVALID_LOCATION']);
    expect(() => scanTimeRange({ fromUtc: '1992-08-14T05:00:00Z', toUtc: '1992-08-14T06:00:00Z', ...CHENNAI }, { settings: { ayanamsa: 'raman' } })).toThrow(SettingsError);
  });

  it('inside the polar circles the Lagna is not well defined: a clear error, never an answer', () => {
    expect(MAX_SCAN_LATITUDE).toBe(66.5);
    expect(() => scan('2001-06-21T00:00:00Z', '2001-06-21T06:00:00Z', { lat: 66.5, lng: 25.7 })).not.toThrow();
    for (const lat of [66.51, 69.65, -77.85, 90]) {
      expect(code(() => scan('2001-06-21T00:00:00Z', '2001-06-21T06:00:00Z', { lat, lng: 18.96 }))).toEqual(['TimeRangeError', 'POLAR_LATITUDE']);
    }
    // Why: at 70°N the raw Lagna really does run backwards for part of the day.
    const eph = createSwephAdapter();
    const j0 = eph.julianDayUt(2001, 6, 21, 0);
    let backwards = 0;
    let prev = lagnaLongitude(eph, j0, 70, 18.9);
    for (let i = 60; i <= 86_400; i += 60) {
      const L = lagnaLongitude(eph, j0 + i / 86_400, 70, 18.9);
      if (((L - prev + 540) % 360) - 180 < 0) backwards++;
      prev = L;
    }
    expect(backwards).toBeGreaterThan(0);
  });
});

describe('determinism (NFR-DET-01)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('the same input twice gives byte-identical output, and the clock is never read', () => {
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('the scanner read the clock');
    });
    const a = JSON.stringify(scan('1936-10-01T18:30:00Z', '1936-10-02T18:30:00Z'));
    const b = JSON.stringify(scanTimeRange({ fromUtc: '1936-10-01T18:30:00Z', toUtc: '1936-10-02T18:30:00Z', ...CHENNAI }, { ephemeris: createSwephAdapter() }));
    expect(a).toBe(b);
    expect(now).not.toHaveBeenCalled();
  });

  it('a whole day is scanned well under a second', () => {
    const t = performance.now();
    scan('1936-10-01T18:30:00Z', '1936-10-02T18:30:00Z');
    expect(performance.now() - t).toBeLessThan(1000);
  });
});
