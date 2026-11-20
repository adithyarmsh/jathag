// Hand-made combustion tests (D-077): just inside / just outside each orb, retrograde Mercury and Venus.
import { describe, it, expect } from 'vitest';
import { isCombust, type GrahaCode } from '../src/index.ts';

const SUN = 100; // Sun at 10° Cancer
const ONE_ARCMIN = 1 / 60;

describe('combustion orbs (distance ≤ orb)', () => {
  it.each([
    ['Mo', 12], ['Ma', 17], ['Me', 14], ['Ju', 11], ['Ve', 10], ['Sa', 15],
  ] as [GrahaCode, number][])('%s: %i° (direct)', (body, orb) => {
    for (const side of [1, -1]) {
      expect(isCombust(body, SUN + side * (orb - ONE_ARCMIN), false, SUN), 'just inside').toBe(true);
      expect(isCombust(body, SUN + side * orb, false, SUN), 'exactly on the orb').toBe(true);
      expect(isCombust(body, SUN + side * (orb + ONE_ARCMIN), false, SUN), 'just outside').toBe(false);
    }
    expect(isCombust(body, SUN, false, SUN), 'conjunct').toBe(true);
  });

  it('retrograde Mercury uses 12°, retrograde Venus 8°', () => {
    expect(isCombust('Me', SUN + 12 - ONE_ARCMIN, true, SUN)).toBe(true);
    expect(isCombust('Me', SUN + 12 + ONE_ARCMIN, true, SUN)).toBe(false);
    expect(isCombust('Me', SUN + 13, false, SUN)).toBe(true); // 13° direct: inside 14°
    expect(isCombust('Me', SUN + 13, true, SUN)).toBe(false); // 13° retrograde: outside 12°
    expect(isCombust('Ve', SUN - 8 + ONE_ARCMIN, true, SUN)).toBe(true);
    expect(isCombust('Ve', SUN - 8 - ONE_ARCMIN, true, SUN)).toBe(false);
    expect(isCombust('Ve', SUN + 9, false, SUN)).toBe(true);
    expect(isCombust('Ve', SUN + 9, true, SUN)).toBe(false);
  });

  it('retrograde does not change the orb of Mars, Jupiter, Saturn', () => {
    expect(isCombust('Ma', SUN + 16, true, SUN)).toBe(true);
    expect(isCombust('Ju', SUN + 10, true, SUN)).toBe(true);
    expect(isCombust('Sa', SUN + 14, true, SUN)).toBe(true);
  });

  it('uses the shortest distance across 0° Aries', () => {
    expect(isCombust('Ma', 5, false, 355)).toBe(true); // 10° apart
    expect(isCombust('Ju', 350, false, 2)).toBe(false); // 12° apart
  });

  it('Sun, Rahu and Ketu are never combust', () => {
    for (const body of ['Su', 'Ra', 'Ke'] as GrahaCode[]) {
      expect(isCombust(body, SUN, false, SUN)).toBe(false);
      expect(isCombust(body, SUN + 1, true, SUN)).toBe(false);
    }
  });
});
