// Transits + Sade Sati for all 29 reference births at a fixed asOf (step 0.3.2, D-099).
// JHora's answer key has no transit data (the founder's JHora spot-check is step 0.3.3), so this checks
// that every birth runs without errors, every reported crossing is confirmed by Swiss Ephemeris one minute
// either side, the Sade Sati periods are well formed, and calculating transits leaves the natal chart untouched.

import { describe, expect, it } from 'vitest';
import { calculateChart, createSwephAdapter, placement, transitsForChart, type SignCrossing } from '@jathag/engine';
import { loadBirths } from './scripts/parse.mjs';

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const AS_OF = '2026-11-22T06:00:00Z';
const eph = createSwephAdapter();
const MIN = 60_000;
const jd = (t: number) => t / 86_400_000 + 2440587.5;

function utcOf(b: Birth) {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi, sec = 0] = b.time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, sec) - Math.round(b.utc_offset * 3600) * 1000).toISOString();
}

const signAt = (planet: SignCrossing['planet'], t: number) =>
  planet === 'Ke' ? placement(eph.siderealBody(jd(t), 'Ra').lon + 180).sign : placement(eph.siderealBody(jd(t), planet).lon).sign;

describe('transits for every reference birth (fixed asOf)', () => {
  it.each(births.map((b) => [b.id, b] as const))('%s', (_id, b) => {
    const input = { utc: utcOf(b), lat: b.lat, lng: b.lng };
    const before = JSON.stringify(calculateChart(input));
    const chart = calculateChart(input);
    const t = transitsForChart(chart, { asOf: AS_OF });
    expect(JSON.stringify(chart)).toBe(before); // natal chart untouched

    expect(t.asOf).toBe('2026-11-22T06:00:00.000Z');
    expect(t.natal).toEqual({ moonSign: chart.bodies.Mo.sign, lagnaSign: chart.bodies.La.sign });
    for (const p of Object.values(t.positions)) {
      expect(p.houseFromMoon).toBe(((p.sign - chart.bodies.Mo.sign + 12) % 12) + 1);
      expect(p.houseFromLagna).toBe(((p.sign - chart.bodies.La.sign + 12) % 12) + 1);
    }

    const all: SignCrossing[] = [...Object.values(t.signChanges).flat(), ...t.sadeSati.periods.flatMap((p) => p.crossings)];
    for (const c of all) {
      const at = Date.parse(c.utc);
      expect(signAt(c.planet, at - MIN)).toBe(c.fromSign);
      expect(signAt(c.planet, at + MIN)).toBe(c.toSign);
    }

    const s = t.sadeSati;
    expect(s.moonSign).toBe(chart.bodies.Mo.sign);
    expect(s.periods.length).toBeGreaterThanOrEqual(4);
    expect(s.periods.length).toBeLessThanOrEqual(5);
    for (const p of s.periods) {
      expect(p.phases.rising.end).toBe(p.phases.peak.start);
      expect(p.phases.peak.end).toBe(p.phases.setting.start);
      expect(p.phases.setting.end).toBe(p.end);
      expect(p.startOutsideData).toBe(false); // the earliest reference birth is 1853
    }
    expect(s.status.saturn.sign).toBe(t.positions.Sa.sign);
  });
});
