// Output contract: determinism (NFR-DET-01), settings echo (FR-SET-03), stable IDs (D-063).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calculateChart, createSwephAdapter, DEFAULT_SETTINGS, ENGINE_VERSION, placement, SettingsError } from '../src/index.ts';

const R01 = { utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 };
const R19 = { utc: '1982-12-10T07:30:00Z', lat: 59.916667, lng: 10.75 }; // high latitude

describe('determinism', () => {
  it('same input twice gives byte-identical JSON (also with a fresh adapter)', () => {
    for (const input of [R01, R19]) {
      const a = JSON.stringify(calculateChart(input));
      const b = JSON.stringify(calculateChart(input));
      const c = JSON.stringify(calculateChart(input, { ephemeris: createSwephAdapter() }));
      expect(b).toBe(a);
      expect(c).toBe(a);
    }
  });
});

describe('metadata', () => {
  const chart = calculateChart(R01);
  it('includes the engine version, the settings used and the ephemeris', () => {
    expect(chart.meta.engineVersion).toBe(ENGINE_VERSION);
    expect(chart.meta.settings).toEqual({ ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign' });
    expect(chart.meta.ephemeris.swissEphemerisVersion).toBe('2.10.03');
    expect(chart.meta.ephemeris.dataFiles).toEqual(['sepl_18.se1', 'semo_18.se1']);
    expect(chart.meta.input).toEqual(R01);
  });
  it('ENGINE_VERSION equals package.json version', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(ENGINE_VERSION).toBe(pkg.version);
  });
});

describe('settings', () => {
  it('defaults are Lahiri, mean node, whole sign; passing them explicitly is fine', () => {
    expect(DEFAULT_SETTINGS).toEqual({ ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign' });
    expect(() => calculateChart(R01, { settings: { ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign' } })).not.toThrow();
  });
  it.each([
    [{ node: 'true' }, 'SETTING_NOT_SUPPORTED'],
    [{ ayanamsa: 'raman' }, 'SETTING_NOT_SUPPORTED'],
    [{ houseSystem: 'placidus' }, 'SETTING_NOT_SUPPORTED'],
    [{ yearLength: 365.2422 }, 'UNKNOWN_SETTING'],
  ])('%j → %s', (settings, expected) => {
    let err: SettingsError | undefined;
    try {
      calculateChart(R01, { settings: settings as never });
    } catch (e) {
      err = e as SettingsError;
    }
    expect(err).toBeInstanceOf(SettingsError);
    expect(err?.code).toBe(expected);
  });
});

describe('stable IDs only (D-063)', () => {
  const ENGLISH = [
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Lagna', 'Ascendant',
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    'Ashwini', 'Bharani', 'Rohini', 'Revati', 'exalted', 'debilitated', 'friend', 'enemy', 'combust', 'retrograde',
  ];
  it('no English names among the output values', () => {
    const values: string[] = [];
    JSON.stringify(calculateChart(R01), (_k, v) => {
      if (typeof v === 'string') values.push(v);
      return v;
    });
    for (const word of ENGLISH) {
      expect(values.filter((v) => v.toLowerCase().includes(word.toLowerCase())), word).toEqual([]);
    }
  });
});

describe('placement arithmetic', () => {
  it('boundaries: 0° Aries, end of Revati, 13°20′ (Bharani starts), 3°20′ (pada 2, D-9 Taurus)', () => {
    expect(placement(0)).toMatchObject({ sign: 1, nakshatra: 1, pada: 1, navamsaSign: 1, nakshatraLord: 'Ke' });
    expect(placement(359.9999)).toMatchObject({ sign: 12, nakshatra: 27, pada: 4, navamsaSign: 12, nakshatraLord: 'Me' });
    expect(placement(13 + 20 / 60)).toMatchObject({ sign: 1, nakshatra: 2, pada: 1, navamsaSign: 5, nakshatraLord: 'Ve' });
    expect(placement(3 + 20 / 60)).toMatchObject({ sign: 1, nakshatra: 1, pada: 2, navamsaSign: 2 });
    expect(placement(360)).toMatchObject({ lon: 0, sign: 1 });
    expect(placement(-30)).toMatchObject({ sign: 12, degInSign: 0 });
  });
  it('D-9 from a fire, earth, air and water sign starts at Aries, Capricorn, Libra, Cancer', () => {
    expect(placement(0).navamsaSign).toBe(1); // Aries → Aries
    expect(placement(30).navamsaSign).toBe(10); // Taurus → Capricorn
    expect(placement(60).navamsaSign).toBe(7); // Gemini → Libra
    expect(placement(90).navamsaSign).toBe(4); // Cancer → Cancer
  });
});

describe('location checks', () => {
  it('rejects impossible coordinates', () => {
    expect(() => calculateChart({ ...R01, lat: 91 })).toThrow(/Latitude/);
    expect(() => calculateChart({ ...R01, lng: 181 })).toThrow(/Longitude/);
  });
});
