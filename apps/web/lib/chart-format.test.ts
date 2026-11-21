import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import { clockUsed, degreeInSign, fill, formatCoordinate, formatUtcOffset, settingsLine, tableRows } from './chart-format.ts';

describe('degreeInSign (truncated to the second, like the digits JHora prints)', () => {
  it('cuts off, never rounds up', () => {
    // 27° 44′ 48.95″ in Cancer (JHora R01 Sun) → 27° 44′ 48″
    expect(degreeInSign(423888.95 / 3600, 4).text).toBe('27° 44′ 48″');
    expect(degreeInSign((3 * 108000 + 14 * 3600 + 7 * 60 + 32.999) / 3600, 4).text).toBe('14° 07′ 32″');
  });
  it('never shows 60″ or 60′ and never moves into the next sign', () => {
    const justBeforeLeo = (5 * 108000 - 0.0001) / 3600; // 29° 59′ 59.9999″ Cancer
    expect(degreeInSign(justBeforeLeo, 4).text).toBe('29° 59′ 59″');
    expect(degreeInSign(359.99999999, 12).text).toBe('29° 59′ 59″');
    expect(degreeInSign((60 * 59 + 59.99) / 3600, 1).text).toBe('0° 59′ 59″');
  });
  it('measures from the start of the engine’s sign, even if floating point lands a hair over the edge', () => {
    expect(degreeInSign(120, 5).text).toBe('0° 00′ 00″');
    expect(degreeInSign(120 - 1e-12, 5).text).toBe('0° 00′ 00″'); // engine says Leo: stay at 0°
    expect(degreeInSign(120 + 1e-12, 4).text).toBe('29° 59′ 59″'); // engine says Cancer: stay in Cancer
  });
  it('an exact second is not lost to floating-point noise', () => {
    expect(degreeInSign((1235) / 3600, 1).text).toBe('0° 20′ 35″');
    for (let s = 0; s < 108000; s += 997) expect(degreeInSign(s / 3600, 1).deg * 3600 + degreeInSign(s / 3600, 1).min * 60 + degreeInSign(s / 3600, 1).sec).toBe(s);
  });
  it('pads minutes and seconds', () => {
    expect(degreeInSign((2 * 3600 + 5 * 60 + 3) / 3600, 1).text).toBe('2° 05′ 03″');
  });
});

describe('formatUtcOffset', () => {
  it.each([
    [19800, 'UTC+5:30'],
    [21200, 'UTC+5:53:20'],
    [17460, 'UTC+4:51'],
    [23400, 'UTC+6:30'],
    [18532, 'UTC+5:08:52'],
    [0, 'UTC+0:00'],
    [-14400, 'UTC−4:00'],
    [-18000, 'UTC−5:00'],
    [20700, 'UTC+5:45'],
  ])('%i s → %s', (s, text) => expect(formatUtcOffset(s)).toBe(text));
});

describe('formatCoordinate', () => {
  it('degrees, minutes, seconds with hemisphere; rounding carries', () => {
    expect(formatCoordinate(13.083333, 'lat')).toBe('13° 05′ 00″ N');
    expect(formatCoordinate(80.283333, 'lng')).toBe('80° 17′ 00″ E');
    expect(formatCoordinate(-74.00597, 'lng')).toBe('74° 00′ 21″ W');
    expect(formatCoordinate(-33.86785, 'lat')).toBe('33° 52′ 04″ S');
    expect(formatCoordinate(19.99999, 'lat')).toBe('20° 00′ 00″ N');
  });
});

describe('fill', () => {
  it('replaces known placeholders and leaves unknown ones', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });
});

// A hand-made chart with only the fields the table reads.
const body = (lon: number, extra: Record<string, unknown> = {}) => ({
  lon, sign: Math.floor(lon / 30) + 1, degInSign: lon % 30, nakshatra: Math.floor(lon / (360 / 27)) + 1, pada: 1,
  nakshatraLord: 'Ke', navamsaSign: 1, speed: 1, retrograde: false, house: 1, dignity: 'NE', combust: false, ...extra,
});
const chart = {
  bodies: {
    La: body(100, { speed: null, retrograde: null, dignity: null, combust: null }),
    Su: body(10, { dignity: 'EX' }),
    Mo: body(35, { dignity: 'EX' }),
    Ma: body(275, { dignity: 'EX', retrograde: true }),
    Me: body(15, { combust: true, dignity: 'FR' }),
    Ju: body(95, { dignity: 'EX' }),
    Ve: body(355, { dignity: 'EX' }),
    Sa: body(185, { dignity: 'DB', retrograde: true }),
    Ra: body(200, { dignity: null, retrograde: true, combust: false }),
    Ke: body(20, { dignity: null, retrograde: true, combust: false }),
  },
} as never;

describe('tableRows: IDs → words from en.json', () => {
  const rows = tableRows(chart, en.chart);
  const row = (c: string) => rows.find((r) => r.code === c)!;
  it('10 rows in FR-PL-01 order with English names', () => {
    expect(rows.map((r) => r.name)).toEqual(['Lagna', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']);
  });
  it('signs, nakshatras and dignity words', () => {
    expect(row('Su')).toMatchObject({ sign: 'Aries', nakshatra: 'Ashwini', dignity: 'Exalted' });
    expect(row('Sa')).toMatchObject({ sign: 'Libra', dignity: 'Debilitated', retrograde: 'R' });
    expect(row('Ve')).toMatchObject({ sign: 'Pisces', nakshatra: 'Revati' });
    expect(row('Me')).toMatchObject({ dignity: 'Friendly sign', combust: 'Combust', retrograde: '' });
  });
  it('Lagna: "—" for dignity, retrograde and combust; house shown', () => {
    expect(row('La')).toMatchObject({ dignity: '—', retrograde: '—', combust: '—', house: '1' });
  });
  it('Rahu/Ketu: dignity "—" (D-076), never combust (D-077), retrograde "—" like JHora', () => {
    for (const c of ['Ra', 'Ke']) expect(row(c)).toMatchObject({ dignity: '—', combust: '—', retrograde: '—' });
  });
  it('Sun cannot be combust: "—"', () => {
    expect(row('Su').combust).toBe('—');
  });
  it('every dignity code, sign and nakshatra has a word', () => {
    expect(Object.keys(en.chart.dignity).sort()).toEqual(['DB', 'EN', 'EX', 'FR', 'MT', 'NE', 'OS']);
    expect(Object.values(en.chart.dignity)).toEqual(['Exalted', 'Moolatrikona', 'Own sign', 'Friendly sign', 'Neutral sign', 'Enemy sign', 'Debilitated']);
    expect(en.chart.signs).toHaveLength(12);
    expect(en.chart.nakshatras).toHaveLength(27);
    expect(en.chart.nakshatras[0]).toBe('Ashwini');
    expect(en.chart.nakshatras[26]).toBe('Revati');
  });
});

describe('settings and clock lines', () => {
  it('settings words (FR-SET-03)', () => {
    expect(settingsLine({ ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign' }, en.chart))
      .toBe('Settings: Lahiri ayanamsa · mean node · whole-sign houses');
  });
  it('clock used', () => {
    expect(clockUsed({ source: 'timeZone', id: null, chosen: false, utcOffsetSeconds: 19800, timeZone: 'Asia/Kolkata', tzdataVersion: '2025b' }, en.chart))
      .toBe('UTC+5:30 (Asia/Kolkata)');
    expect(clockUsed({ source: 'clockRule', id: 'war', chosen: false, utcOffsetSeconds: 23400, timeZone: null, tzdataVersion: null }, en.chart))
      .toBe('UTC+6:30 (War Time)');
  });
});
