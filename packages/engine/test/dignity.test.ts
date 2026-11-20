// Hand-made dignity tests (D-076). Longitudes are built from sign + degrees + minutes so every
// case reads like the table in the decision.
import { describe, it, expect } from 'vitest';
import { dignity, type GrahaCode } from '../src/index.ts';

/** Sidereal longitude from sign (1–12), degrees and minutes within the sign. */
const at = (sign: number, deg: number, min = 0, sec = 0) => (sign - 1) * 30 + deg + min / 60 + sec / 3600;

const [Ar, Ta, Ge, Cn, Le, Vi, Li, Sc, Sg, Cp, Aq, Pi] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('dignity: exaltation and debilitation (whole sign unless split)', () => {
  const cases: [GrahaCode, number, number][] = [
    // body, exaltation sign, debilitation sign
    ['Su', Ar, Li], ['Mo', Ta, Sc], ['Ma', Cp, Cn], ['Me', Vi, Pi], ['Ju', Cn, Cp], ['Ve', Pi, Vi], ['Sa', Li, Ar],
  ];
  it.each(cases)('%s exalted in sign %i, debilitated in sign %i', (body, ex, db) => {
    // Moon and Mercury are exalted only in the first part of the sign, so test at 1°.
    expect(dignity(body, at(ex, 1))).toBe('EX');
    expect(dignity(body, at(db, 0))).toBe('DB');
    expect(dignity(body, at(db, 15))).toBe('DB');
    expect(dignity(body, at(db, 29, 59, 59))).toBe('DB');
    if (body !== 'Mo' && body !== 'Me') {
      expect(dignity(body, at(ex, 0))).toBe('EX');
      expect(dignity(body, at(ex, 29, 59, 59))).toBe('EX');
    }
  });
});

describe('dignity: moolatrikona edges (start included, end excluded)', () => {
  it('Sun: Leo 0°–20° MT, 20° own', () => {
    expect(dignity('Su', at(Le, 0))).toBe('MT');
    expect(dignity('Su', at(Le, 19, 59))).toBe('MT');
    expect(dignity('Su', at(Le, 20))).toBe('OS');
    expect(dignity('Su', at(Le, 29, 59))).toBe('OS');
  });
  it('Moon: Taurus 0°–3° exalted, 3°–30° MT (2°59′ vs 3°00′)', () => {
    expect(dignity('Mo', at(Ta, 0))).toBe('EX');
    expect(dignity('Mo', at(Ta, 2, 59))).toBe('EX');
    expect(dignity('Mo', at(Ta, 2, 59, 59))).toBe('EX');
    expect(dignity('Mo', at(Ta, 3, 0))).toBe('MT');
    expect(dignity('Mo', at(Ta, 29, 59))).toBe('MT');
  });
  it('Mars: Aries 0°–12° MT, 12° own', () => {
    expect(dignity('Ma', at(Ar, 0))).toBe('MT');
    expect(dignity('Ma', at(Ar, 11, 59))).toBe('MT');
    expect(dignity('Ma', at(Ar, 12))).toBe('OS');
  });
  it('Mercury: Virgo 0°–15° exalted, 15°–20° MT, 20°–30° own (14°59′ / 15°00′ / 20°00′)', () => {
    expect(dignity('Me', at(Vi, 0))).toBe('EX');
    expect(dignity('Me', at(Vi, 14, 59))).toBe('EX');
    expect(dignity('Me', at(Vi, 15, 0))).toBe('MT');
    expect(dignity('Me', at(Vi, 19, 59))).toBe('MT');
    expect(dignity('Me', at(Vi, 20, 0))).toBe('OS');
    expect(dignity('Me', at(Vi, 29, 59))).toBe('OS');
  });
  it('Jupiter: Sagittarius 0°–10° MT, 10° own', () => {
    expect(dignity('Ju', at(Sg, 0))).toBe('MT');
    expect(dignity('Ju', at(Sg, 9, 59))).toBe('MT');
    expect(dignity('Ju', at(Sg, 10))).toBe('OS');
  });
  it('Venus: Libra 0°–15° MT, 15° own', () => {
    expect(dignity('Ve', at(Li, 0))).toBe('MT');
    expect(dignity('Ve', at(Li, 14, 59))).toBe('MT');
    expect(dignity('Ve', at(Li, 15))).toBe('OS');
  });
  it('Saturn: Aquarius 0°–20° MT, 20° own', () => {
    expect(dignity('Sa', at(Aq, 0))).toBe('MT');
    expect(dignity('Sa', at(Aq, 19, 59))).toBe('MT');
    expect(dignity('Sa', at(Aq, 20))).toBe('OS');
  });
});

describe('dignity: own sign', () => {
  it.each([
    ['Mo', Cn], ['Ma', Sc], ['Me', Ge], ['Ju', Pi], ['Ve', Ta], ['Sa', Cp],
  ] as [GrahaCode, number][])('%s in its own sign %i', (body, sign) => {
    expect(dignity(body, at(sign, 10))).toBe('OS');
  });
});

describe('dignity: friend / neutral / enemy (lord of the occupied sign, BPHS natural relationships)', () => {
  it.each([
    ['Su', Cn, 'FR'], ['Su', Ge, 'NE'], ['Su', Ta, 'EN'], ['Su', Cp, 'EN'],
    ['Mo', Ge, 'FR'], ['Mo', Le, 'FR'], ['Mo', Ar, 'NE'], ['Mo', Cp, 'NE'], ['Mo', Li, 'NE'],
    ['Ma', Le, 'FR'], ['Ma', Sg, 'FR'], ['Ma', Ta, 'NE'], ['Ma', Aq, 'NE'], ['Ma', Ge, 'EN'], ['Ma', Vi, 'EN'],
    ['Me', Ta, 'FR'], ['Me', Le, 'FR'], ['Me', Sc, 'NE'], ['Me', Sg, 'NE'], ['Me', Cn, 'EN'],
    ['Ju', Ar, 'FR'], ['Ju', Le, 'FR'], ['Ju', Aq, 'NE'], ['Ju', Ge, 'EN'], ['Ju', Ta, 'EN'], ['Ju', Li, 'EN'],
    ['Ve', Ge, 'FR'], ['Ve', Cp, 'FR'], ['Ve', Ar, 'NE'], ['Ve', Sg, 'NE'], ['Ve', Le, 'EN'], ['Ve', Cn, 'EN'],
    ['Sa', Ta, 'FR'], ['Sa', Ge, 'FR'], ['Sa', Sg, 'NE'], ['Sa', Le, 'EN'], ['Sa', Cn, 'EN'], ['Sa', Sc, 'EN'],
  ] as [GrahaCode, number, string][])('%s in sign %i → %s', (body, sign, code) => {
    expect(dignity(body, at(sign, 10))).toBe(code);
  });
});

describe('dignity: Rahu and Ketu have none (D-076)', () => {
  it.each([1, 2, 6, 8, 12])('sign %i → null', (sign) => {
    expect(dignity('Ra', at(sign, 10))).toBeNull();
    expect(dignity('Ke', at(sign, 10))).toBeNull();
  });
});
