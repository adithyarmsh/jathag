// Hand-checked aspects (D-012), house lords and occupants (D-010).
import { describe, it, expect } from 'vitest';
import { aspects, calculateChart, type GrahaCode, type Sign } from '../src/index.ts';

describe('aspects: synthetic chart worked out by hand', () => {
  // Lagna Aries. Su Ar, Mo Li, Ma Cp, Me Ta, Ju Le, Ve Pi, Sa Ge, Ra Sc, Ke Ta.
  const signs: Record<GrahaCode, Sign> = { Su: 1, Mo: 7, Ma: 10, Me: 2, Ju: 5, Ve: 12, Sa: 3, Ra: 8, Ke: 2 };

  it('Lagna Aries', () => {
    expect(aspects(signs, 1)).toEqual({
      Su: { houses: [7], bodies: ['Mo'] },
      Mo: { houses: [1], bodies: ['Su'] },
      Ma: { houses: [1, 4, 5], bodies: ['Su', 'Ju'] }, // 4th Ar, 7th Cn, 8th Le
      Me: { houses: [8], bodies: ['Ra'] },
      Ju: { houses: [1, 9, 11], bodies: ['Su'] }, // 5th Sg, 7th Aq, 9th Ar
      Ve: { houses: [6], bodies: [] },
      Sa: { houses: [5, 9, 12], bodies: ['Ju', 'Ve'] }, // 3rd Le, 7th Sg, 10th Pi
      Ra: { houses: [], bodies: [] },
      Ke: { houses: [], bodies: [] },
    });
  });

  it('same planets, Lagna Cancer: only the house numbers move', () => {
    const r = aspects(signs, 4);
    expect(r.Ma).toEqual({ houses: [1, 2, 10], bodies: ['Su', 'Ju'] }); // Ar = 10th, Cn = 1st, Le = 2nd
    expect(r.Sa).toEqual({ houses: [2, 6, 9], bodies: ['Ju', 'Ve'] }); // Le = 2nd, Sg = 6th, Pi = 9th
  });
});

describe('R01 (1992-08-14 06:45 Chennai): houses and aspects checked by hand', () => {
  // From the JHora answer key: La Le, Su Cn, Mo Aq, Ma Ta, Me Cn, Ju Le, Ve Le, Sa Cp (R), Ra Sg, Ke Ge.
  const chart = calculateChart({ utc: '1992-08-14T01:15:00.000Z', lat: 13.083333, lng: 80.283333 });

  it('house signs, lords and occupants', () => {
    expect(chart.houses).toEqual([
      { house: 1, sign: 5, lord: 'Su', occupants: ['Ju', 'Ve'] },
      { house: 2, sign: 6, lord: 'Me', occupants: [] },
      { house: 3, sign: 7, lord: 'Ve', occupants: [] },
      { house: 4, sign: 8, lord: 'Ma', occupants: [] },
      { house: 5, sign: 9, lord: 'Ju', occupants: ['Ra'] },
      { house: 6, sign: 10, lord: 'Sa', occupants: ['Sa'] },
      { house: 7, sign: 11, lord: 'Sa', occupants: ['Mo'] },
      { house: 8, sign: 12, lord: 'Ju', occupants: [] },
      { house: 9, sign: 1, lord: 'Ma', occupants: [] },
      { house: 10, sign: 2, lord: 'Ve', occupants: ['Ma'] },
      { house: 11, sign: 3, lord: 'Me', occupants: ['Ke'] },
      { house: 12, sign: 4, lord: 'Mo', occupants: ['Su', 'Me'] },
    ]);
    expect(chart.bodies.Su.house).toBe(12);
    expect(chart.bodies.Mo.house).toBe(7);
    expect(chart.bodies.La.house).toBe(1);
  });

  it('aspects', () => {
    expect(chart.aspects).toEqual({
      Su: { houses: [6], bodies: ['Sa'] },
      Mo: { houses: [1], bodies: ['Ju', 'Ve'] },
      Ma: { houses: [1, 4, 5], bodies: ['Ju', 'Ve', 'Ra'] },
      Me: { houses: [6], bodies: ['Sa'] },
      Ju: { houses: [5, 7, 9], bodies: ['Mo', 'Ra'] },
      Ve: { houses: [7], bodies: ['Mo'] },
      Sa: { houses: [3, 8, 12], bodies: ['Su', 'Me'] },
      Ra: { houses: [], bodies: [] },
      Ke: { houses: [], bodies: [] },
    });
  });

  it('dignity and combustion', () => {
    const d = Object.fromEntries(Object.entries(chart.bodies).map(([k, b]) => [k, b.dignity]));
    expect(d).toEqual({ La: null, Su: 'FR', Mo: 'NE', Ma: 'NE', Me: 'EN', Ju: 'FR', Ve: 'EN', Sa: 'OS', Ra: null, Ke: null });
    // Sun 27°45′ Cn; Mercury 12°16′ Cn is 15.5° away (> 14°); nothing is combust.
    const c = Object.fromEntries(Object.entries(chart.bodies).map(([k, b]) => [k, b.combust]));
    expect(c).toEqual({ La: null, Su: false, Mo: false, Ma: false, Me: false, Ju: false, Ve: false, Sa: false, Ra: false, Ke: false });
  });

  it('nakshatra lords follow the Vimshottari cycle; Ketu is opposite Rahu with the same speed', () => {
    // Moon in Dhanishta (23) → Mars; Lagna in Magha (10) → Ketu.
    expect(chart.bodies.Mo.nakshatra).toBe(23);
    expect(chart.bodies.Mo.nakshatraLord).toBe('Ma');
    expect(chart.bodies.La.nakshatraLord).toBe('Ke');
    expect((chart.bodies.Ke.lon - chart.bodies.Ra.lon + 360) % 360).toBeCloseTo(180, 10);
    expect(chart.bodies.Ke.speed).toBe(chart.bodies.Ra.speed);
    expect(chart.bodies.Ra.retrograde).toBe(true); // mean node: plain fact (D-071 note)
  });
});
