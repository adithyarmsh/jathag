// Nearest place for typed coordinates (step 0.5.2, D-144) over the committed index: great-circle
// distance, any place counts, nothing beyond 50 km, no crash at the poles or the ±180° line.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { distanceKm, NEAREST_MAX_KM, PlaceIndex } from '../src/index.ts';

let idx: PlaceIndex;
beforeAll(() => {
  idx = new PlaceIndex(gunzipSync(readFileSync(join(import.meta.dirname, '../../../data/places/index/places.tsv.gz'))).toString('utf8'));
});

describe('distanceKm', () => {
  it('haversine: one degree of latitude ≈ 111.2 km; zero for the same point', () => {
    expect(distanceKm(0, 0, 1, 0)).toBeCloseTo(111.195, 2);
    expect(distanceKm(13, 80, 13, 80)).toBe(0);
    expect(distanceKm(0, 179.9, 0, -179.9)).toBeCloseTo(22.24, 1); // across the ±180° line
  });
});

describe('nearest place (D-144)', () => {
  it('builds its grid only when first asked (place search is unaffected)', () => {
    const fresh = new PlaceIndex(gunzipSync(readFileSync(join(import.meta.dirname, '../../../data/places/index/places.tsv.gz'))).toString('utf8'));
    expect(fresh.nearestReady).toBe(false);
    fresh.search('chennai');
    expect(fresh.nearestReady).toBe(false);
    fresh.nearest(13, 80);
    expect(fresh.nearestReady).toBe(true);
  });

  it("R01's Chennai coordinates → Chennai with its usual label", () => {
    const p = idx.nearest(13.08784, 80.27847)!;
    expect(p.label).toBe('Chennai, Tamil Nadu, India');
    expect(p.distanceKm).toBeLessThan(0.01);
  });

  it('a point typed in DMS (13°05′16″ N 80°16′42″ E) → a Chennai-area place', () => {
    const p = idx.nearest(13.087778, 80.278333)!;
    expect(p.label).toMatch(/Chennai|Tamil Nadu/);
    expect(p.distanceKm).toBeLessThan(2);
  });

  it('28.616667, 77.216667 → a New Delhi-area place', () => {
    expect(idx.nearest(28.616667, 77.216667)!.label).toMatch(/Delhi/);
  });

  it('the open sea (15° N, 65° E, Arabian Sea) → nothing', () => {
    expect(idx.nearest(15, 65)).toBeUndefined();
  });

  it('a New York birth left on E (40.7128 N, 74.0060 E) → Central Asia, never New York', () => {
    const p = idx.nearest(40.7128, 74.006);
    if (p) {
      expect(p.label).not.toMatch(/New York|United States/);
      expect(p.countryCode).toMatch(/^(KG|CN|TJ|UZ|KZ)$/);
    }
    expect(idx.nearest(40.7128, -74.006)!.label).toMatch(/New York/);
  });

  it('nothing farther than 50 km counts; the answer is the closest one', () => {
    expect(NEAREST_MAX_KM).toBe(50);
    for (const [lat, lng] of [[13.08784, 80.27847], [19.07, 72.88], [51.5, -0.12], [-33.87, 151.21], [35.68, 139.69]] as const) {
      const p = idx.nearest(lat, lng)!;
      expect(p.distanceKm).toBeLessThanOrEqual(50);
      expect(p.distanceKm).toBeCloseTo(distanceKm(lat, lng, p.lat, p.lng), 9);
    }
    expect(idx.nearest(13.08784, 80.27847, 0)?.label).toBe('Chennai, Tamil Nadu, India');
  });

  it('the poles, the ±180° line and bad input do not crash', () => {
    for (const [lat, lng] of [[90, 0], [-90, 0], [89.9, 180], [-89.99, -180], [0, 180], [0, -180], [64.5, 179.99], [64.5, -179.99], [-16.9, 179.9]] as const) {
      expect(() => idx.nearest(lat, lng)).not.toThrow();
    }
    // Across the ±180° line: Egvekinot (Chukotka, 179.12° W) is found from 179.9° E (≈ 44 km away)
    expect(idx.nearest(66.32321, 179.9)?.label).toMatch(/^Egvekinot/);
    expect(idx.nearest(66.32321, -179.2)?.label).toMatch(/^Egvekinot/);
    for (const [lat, lng] of [[91, 0], [0, 181], [NaN, 0], [0, Infinity]] as const) expect(idx.nearest(lat, lng)).toBeUndefined();
  });

  it('a warm lookup takes well under a few tens of milliseconds', () => {
    idx.nearest(10, 76);
    const t = performance.now();
    for (let i = 0; i < 100; i++) idx.nearest(8 + i * 0.2, 70 + i * 0.2);
    expect((performance.now() - t) / 100).toBeLessThan(20);
  });
});
