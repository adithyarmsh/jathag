// Approximate-time scanner (step 0.3.6) against the Project's five cases (step 0.3.5, D-107, D-109,
// D-111): `approx-time/cases.json`, never edited here. Change moments must be within the case file's
// toleranceSeconds (2 s); everything else exactly equal. Case A5 (clock going back) is checked again
// through the endpoint, with local times, in packages/api/test/range-endpoint.test.ts.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanTimeRange, TIME_VALUES } from '@jathag/engine';

const data = JSON.parse(readFileSync(join(import.meta.dirname, 'approx-time', 'cases.json'), 'utf8'));
const tolerance: number = data.toleranceSeconds;
type Case = (typeof data.cases)[number];

const sec = (iso: string) => Date.parse(iso) / 1000;
const results = new Map<string, ReturnType<typeof scanTimeRange>>();
const scanOf = (c: Case) => {
  if (!results.has(c.id)) results.set(c.id, scanTimeRange({ fromUtc: c.fromUtc, toUtc: c.toUtc, lat: c.lat, lng: c.lng }));
  return results.get(c.id)!;
};

describe('the case file itself', () => {
  it('has the five cases A1–A5 and the six values', () => {
    expect(data.cases.map((c: Case) => c.id)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    expect(Object.keys(data.values)).toEqual([...TIME_VALUES]);
    expect(tolerance).toBe(2);
  });
});

describe.each(data.cases.map((c: Case) => [c.id, c] as const))('case %s', (_id, c: Case) => {
  it('every change moment within 2 s, with exactly the same values changing from and to', () => {
    const r = scanOf(c);
    expect(r.events).toHaveLength(c.events.length);
    r.events.forEach((e, i) => {
      const want = c.events[i];
      expect(Math.abs(sec(e.utc) - sec(want.utc)), `event ${i} (${want.utc})`).toBeLessThanOrEqual(tolerance);
      expect(e.changes).toEqual(want.changes);
    });
  });

  it('segments: the same values in the same order, ends within 2 s, the range ends exact', () => {
    const r = scanOf(c);
    expect(r.segments).toHaveLength(c.segments.length);
    r.segments.forEach((s, i) => {
      const want = c.segments[i];
      for (const v of TIME_VALUES) expect(s[v], `segment ${i} ${v}`).toBe(want[v]);
      expect(Math.abs(sec(s.from) - sec(want.from))).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(sec(s.to) - sec(want.to))).toBeLessThanOrEqual(tolerance);
    });
    expect(r.segments[0]!.from).toBe(c.fromUtc);
    expect(r.segments.at(-1)!.to).toBe(c.toUtc);
    const pick = (s: Record<string, unknown>) => Object.fromEntries(TIME_VALUES.map((v) => [v, s[v]]));
    expect(pick(r.segments[0]!)).toEqual(c.atStart);
    expect(pick(r.segments.at(-1)!)).toEqual(c.atEnd);
  });

  it('certain values exactly', () => {
    expect(scanOf(c).certain).toEqual(c.certain);
  });

  it('dasha ranges: one entry per Moon nakshatra, every mahadasha and antardasha date range', () => {
    const r = scanOf(c);
    expect(r.dasha).toHaveLength(c.dasha.length);
    r.dasha.forEach((d, i) => {
      const want = c.dasha[i];
      expect([d.moonNakshatra, d.lordAtBirth]).toEqual([want.moonNakshatra, want.lordAtBirth]);
      expect(Math.abs(sec(d.from) - sec(want.from))).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(sec(d.to) - sec(want.to))).toBeLessThanOrEqual(tolerance);
      // The dates follow from the stretch ends; with ends equal to the case's they must be identical.
      if (d.from === want.from && d.to === want.to) {
        expect(d.mahadashas).toEqual(want.mahadashas);
        expect(d.antardashas).toEqual(want.antardashas);
      }
    });
  });

  it('stretch ends match the case to the second (so the dasha dates above are compared exactly)', () => {
    const r = scanOf(c);
    expect(r.dasha.map((d) => [d.from, d.to])).toEqual(c.dasha.map((d: { from: string; to: string }) => [d.from, d.to]));
  });
});
