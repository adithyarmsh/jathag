// Vimshottari dashas (step 0.3.1): hand-made checks of the formula, the dasha year setting,
// "current period" / "coming up", and determinism. The JHora checks are in tests/reference/engine.test.ts.
import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  calculateChart,
  DashaInputError,
  SettingsError,
  vimshottariForChart,
  vimshottariNow,
  vimshottariTimeline,
  VIMSHOTTARI_YEARS,
  type DashaPeriod,
  type DashaYearSetting,
  type VimshottariTimeline,
} from '../src/index.ts';

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(iso);
const BIRTH = '2000-01-01T00:00:00Z';
const all = (t: VimshottariTimeline) => {
  const md = t.mahadashas;
  const ad = md.flatMap((m) => m.antardashas);
  const pd = ad.flatMap((a) => a.pratyantardashas);
  return { md, ad, pd, every: [...md, ...ad, ...pd] as DashaPeriod[] };
};
const dur = (p: DashaPeriod) => ms(p.end) - ms(p.start);

describe('the formula (BPHS)', () => {
  it('years add up to 120, in the order Ke Ve Su Mo Ma Ra Ju Sa Me', () => {
    expect(Object.keys(VIMSHOTTARI_YEARS)).toEqual(['Ke', 'Ve', 'Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me']);
    expect(Object.values(VIMSHOTTARI_YEARS).reduce((a, b) => a + b)).toBe(120);
  });

  it('Moon at 0° (start of Ashwini): Ketu with its full 7 years, starting at birth', () => {
    const t = vimshottariTimeline({ moonLon: 0, birthUtc: BIRTH, dashaYear: '365.25' });
    expect(t.moonNakshatra).toBe(1);
    expect(t.fractionTravelled).toBe(0);
    expect(t.balanceYears).toBe(7);
    expect(t.start).toBe(BIRTH);
    expect(t.mahadashas.map((m) => m.lord)).toEqual(['Ke', 'Ve', 'Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me']);
    expect(dur(t.mahadashas[0])).toBe(7 * 365.25 * DAY);
  });

  it('Moon half-way through Krittika (26°40′ + 6°40′): Sun dasha, 3 of its 6 years left, began 3 years before birth', () => {
    const t = vimshottariTimeline({ moonLon: 26 + 40 / 60 + 6 + 40 / 60, birthUtc: BIRTH, dashaYear: '360' });
    expect(t.moonNakshatra).toBe(3);
    expect(t.fractionTravelled).toBeCloseTo(0.5, 12);
    expect(t.balanceYears).toBeCloseTo(3, 12);
    expect(t.mahadashas[0].lord).toBe('Su');
    expect(ms(BIRTH) - ms(t.start)).toBe(3 * 360 * DAY);
    expect(t.mahadashas.map((m) => m.lord)).toEqual(['Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me', 'Ke', 'Ve']);
  });

  it('nakshatra 27 (Revati) is ruled by Mercury; a longitude of 360° wraps to Ashwini', () => {
    expect(vimshottariTimeline({ moonLon: 359.99, birthUtc: BIRTH, dashaYear: '365.25' }).mahadashas[0].lord).toBe('Me');
    expect(vimshottariTimeline({ moonLon: 360, birthUtc: BIRTH, dashaYear: '365.25' }).moonNakshatra).toBe(1);
  });

  it('antardasha = maha × antar / 120 years, pratyantar = antar × pratyantar / 120, each level starting from its parent lord', () => {
    // 360-day year: one unit (1/14 400 year) = 2 160 s, so every duration is an exact whole second.
    const t = vimshottariTimeline({ moonLon: 0, birthUtc: BIRTH, dashaYear: '360' });
    const Y = 360 * DAY;
    for (const m of t.mahadashas) {
      expect(dur(m)).toBe(VIMSHOTTARI_YEARS[m.lord] * Y);
      expect(m.antardashas[0].lord).toBe(m.lord);
      for (const a of m.antardashas) {
        expect(dur(a)).toBe((VIMSHOTTARI_YEARS[m.lord] * VIMSHOTTARI_YEARS[a.lord] * Y) / 120);
        expect(a.pratyantardashas[0].lord).toBe(a.lord);
        for (const p of a.pratyantardashas) {
          expect(dur(p)).toBe((VIMSHOTTARI_YEARS[m.lord] * VIMSHOTTARI_YEARS[a.lord] * VIMSHOTTARI_YEARS[p.lord] * Y) / 14_400);
        }
      }
    }
  });

  it('timestamps are whole seconds, contiguous, and children exactly fill their parents', () => {
    const t = vimshottariTimeline({ moonLon: 123.456789, birthUtc: '1985-01-26T13:50:00Z', dashaYear: '365.2422' });
    const { md, ad, pd, every } = all(t);
    for (const p of every) {
      expect(p.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(p.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    }
    for (const level of [md, ad, pd]) {
      for (let i = 1; i < level.length; i++) expect(level[i].start).toBe(level[i - 1].end);
    }
    for (const m of md) {
      expect([m.antardashas[0].start, m.antardashas[8].end]).toEqual([m.start, m.end]);
      for (const a of m.antardashas) expect([a.pratyantardashas[0].start, a.pratyantardashas[8].end]).toEqual([a.start, a.end]);
    }
  });

  it('marks periods that ended before birth, and the one at each level that contains birth', () => {
    const birthUtc = '1985-01-26T13:50:00Z';
    const t = vimshottariTimeline({ moonLon: 123.456789, birthUtc, dashaYear: '365.25' });
    const b = ms(birthUtc);
    for (const level of Object.values(all(t)).slice(0, 3) as DashaPeriod[][]) {
      expect(level.filter((p) => p.containsBirth)).toHaveLength(1);
      const i = level.findIndex((p) => p.containsBirth);
      expect(level.slice(0, i).every((p) => p.endedBeforeBirth)).toBe(true);
      expect(level.slice(i).some((p) => p.endedBeforeBirth)).toBe(false);
      expect(ms(level[i].start) <= b && b < ms(level[i].end)).toBe(true);
    }
  });

  it('refuses bad input', () => {
    expect(() => vimshottariTimeline({ moonLon: NaN, birthUtc: BIRTH, dashaYear: '365.25' })).toThrow(DashaInputError);
    expect(() => vimshottariTimeline({ moonLon: 10, birthUtc: '2000-01-01 00:00', dashaYear: '365.25' })).toThrow(DashaInputError);
    expect(() => vimshottariTimeline({ moonLon: 10, birthUtc: BIRTH, dashaYear: '365' as DashaYearSetting })).toThrow(DashaInputError);
  });
});

describe('dasha year setting (D-096 item 6)', () => {
  const R01 = { utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 };
  const at = (dashaYear: DashaYearSetting) => vimshottariForChart(calculateChart(R01, { settings: { dashaYear } }));

  it('default is 365.25 days and is echoed in the chart settings and the timeline', () => {
    const chart = calculateChart(R01);
    expect(chart.meta.settings.dashaYear).toBe('365.25');
    expect(vimshottariForChart(chart).dashaYear).toBe('365.25');
    expect(at('360').dashaYear).toBe('360');
  });

  it.each([['360', 360], ['365.2422', 365.2422]] as const)('%s days scales every duration (and the time before birth) by days / 365.25', (id, days) => {
    const base = at('365.25');
    const other = at(id);
    const k = days / 365.25;
    // Same Moon, so the same lords and the same fraction travelled.
    expect(other.fractionTravelled).toBe(base.fractionTravelled);
    expect(all(other).every.map((p) => p.lord)).toEqual(all(base).every.map((p) => p.lord));
    // Every duration = (exact length in dasha years) × days, up to the one rounding to the whole
    // second at each end (≤ 1 s). So the 365.25 and other durations differ by exactly the factor k.
    const Y = (d: number) => d * DAY;
    for (const [tl, d] of [[base, 365.25], [other, days]] as const) {
      for (const m of tl.mahadashas) {
        const my = VIMSHOTTARI_YEARS[m.lord];
        expect(Math.abs(dur(m) - my * Y(d))).toBeLessThanOrEqual(1000);
        for (const a of m.antardashas) {
          const ay = VIMSHOTTARI_YEARS[a.lord];
          expect(Math.abs(dur(a) - (my * ay * Y(d)) / 120)).toBeLessThanOrEqual(1000);
          for (const p of a.pratyantardashas) {
            expect(Math.abs(dur(p) - (my * ay * VIMSHOTTARI_YEARS[p.lord] * Y(d)) / 14_400)).toBeLessThanOrEqual(1000);
          }
        }
      }
    }
    expect(Math.abs((ms(R01.utc) - ms(other.start)) - (ms(R01.utc) - ms(base.start)) * k)).toBeLessThanOrEqual(1000);
    expect(Math.abs(ms(other.end) - ms(other.start) - 120 * days * DAY)).toBeLessThanOrEqual(1000);
  });

  it('only the three listed IDs are accepted (a number is not)', () => {
    for (const bad of [360, '365', 'sidereal']) {
      expect(() => calculateChart(R01, { settings: { dashaYear: bad } })).toThrow(SettingsError);
    }
  });

  it('positions do not depend on the dasha year', () => {
    const a = calculateChart(R01);
    const b = calculateChart(R01, { settings: { dashaYear: '360' } });
    expect(b.bodies).toEqual(a.bodies);
  });
});

describe('current period and coming up (D-096 items 2–3)', () => {
  const birthUtc = '1985-01-26T13:50:00Z';
  const t = vimshottariTimeline({ moonLon: 123.456789, birthUtc, dashaYear: '365.25' });
  const { md, ad, pd } = all(t);

  it('at birth: the periods containing birth, and the next start at each level', () => {
    const now = vimshottariNow(t, birthUtc);
    expect(now.asOf).toBe('1985-01-26T13:50:00.000Z');
    expect(now.current.mahadasha?.path).toEqual([0]);
    const ci = ad.findIndex((p) => p.containsBirth);
    const ck = pd.findIndex((p) => p.containsBirth);
    expect(now.current.antardasha?.start).toBe(ad[ci].start);
    expect(now.current.pratyantardasha?.start).toBe(pd[ck].start);
    expect(now.next.mahadasha?.start).toBe(md[1].start);
    expect(now.next.antardasha?.start).toBe(ad[ci + 1].start);
    expect(now.next.pratyantardasha?.start).toBe(pd[ck + 1].start);
  });

  it('paths point into the timeline', () => {
    const now = vimshottariNow(t, '2030-06-01T00:00:00Z');
    const [i, j, k] = now.current.pratyantardasha!.path;
    expect(now.current.mahadasha!.path).toEqual([i]);
    expect(now.current.antardasha!.path).toEqual([i, j]);
    expect(t.mahadashas[i].antardashas[j].pratyantardashas[k].start).toBe(now.current.pratyantardasha!.start);
  });

  it('exactly on a mahadasha boundary: the new period is current; every level reports its own next start', () => {
    const boundary = md[3].start; // also the start of an antardasha and a pratyantardasha
    const now = vimshottariNow(t, boundary);
    expect(now.current.mahadasha?.path).toEqual([3]);
    expect(now.current.antardasha?.path).toEqual([3, 0]);
    expect(now.current.pratyantardasha?.path).toEqual([3, 0, 0]);
    expect(now.next.mahadasha?.path).toEqual([4]);
    expect(now.next.antardasha?.path).toEqual([3, 1]);
    expect(now.next.pratyantardasha?.path).toEqual([3, 0, 1]);
    // One millisecond earlier, the three "next" starts coincide (all = the boundary).
    const before = vimshottariNow(t, new Date(ms(boundary) - 1).toISOString());
    expect(before.next.mahadasha?.start).toBe(boundary);
    expect(before.next.antardasha?.start).toBe(boundary);
    expect(before.next.pratyantardasha?.start).toBe(boundary);
    expect(before.current.mahadasha?.path).toEqual([2]);
  });

  it('before birth: no current period', () => {
    const now = vimshottariNow(t, '1980-01-01T00:00:00Z');
    expect(now.current).toEqual({ mahadasha: null, antardasha: null, pratyantardasha: null });
  });

  it('in the last pratyantardasha: no next at any level; at or after the end: nothing current', () => {
    const last = pd.at(-1)!;
    const inLast = vimshottariNow(t, last.start);
    expect(inLast.current.pratyantardasha?.path).toEqual([8, 8, 8]);
    expect(inLast.next).toEqual({ mahadasha: null, antardasha: null, pratyantardasha: null });
    const after = vimshottariNow(t, t.end);
    expect(after.current).toEqual({ mahadasha: null, antardasha: null, pratyantardasha: null });
    expect(after.next).toEqual({ mahadasha: null, antardasha: null, pratyantardasha: null });
  });

  it('asOf must be an ISO UTC time', () => {
    expect(() => vimshottariNow(t, 'yesterday')).toThrow(DashaInputError);
    expect(() => vimshottariNow(t, '2026-11-22T10:00:00+05:30')).toThrow(DashaInputError);
  });
});

describe('determinism (NFR-DET-01)', () => {
  afterEach(() => vi.useRealTimers());
  const R19 = { utc: '1982-12-10T07:30:00Z', lat: 59.916667, lng: 10.75 };
  const asOf = '2026-11-22T10:00:00.000Z';
  const run = () => {
    const tl = vimshottariForChart(calculateChart(R19));
    return JSON.stringify({ tl, now: vimshottariNow(tl, asOf) });
  };

  it('same input + settings + asOf → byte-identical output, whatever the system clock says', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2001-01-01T00:00:00Z'));
    const a = run();
    vi.setSystemTime(new Date('2077-07-07T07:07:07Z'));
    const b = run();
    vi.useRealTimers();
    const c = run();
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('stable IDs only: lords are planet codes', () => {
    const tl = vimshottariForChart(calculateChart(R19));
    const lords = new Set(all(tl).every.map((p) => p.lord));
    expect([...lords].sort()).toEqual(['Ju', 'Ke', 'Ma', 'Me', 'Mo', 'Ra', 'Sa', 'Su', 'Ve']);
  });
});
