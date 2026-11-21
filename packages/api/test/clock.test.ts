// "Which clock?" rule (FR-IN-09; D-082, D-086, D-087, D-090).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PlaceIndex } from '@jathag/places';
import {
  BOMBAY_TIME_SECONDS,
  CALCUTTA_TIME_SECONDS,
  clockQuestion,
  isMumbaiPlace,
  IST_SECONDS,
  localMeanTimeSeconds,
  MUMBAI_NO_DISTRICT_IDS,
  resolveClock,
  WAR_TIME_SECONDS,
  type ClockId,
  type ClockPlace,
} from '../src/clock.ts';

const ROOT = join(import.meta.dirname, '../../..');

// Real GeoNames values (data/places index).
const DELHI: ClockPlace = { geonameId: 1261481, countryCode: 'IN', admin1Code: '07', admin2Code: '094', lng: 77.216667 }; // New Delhi, R29 longitude
const CHENNAI: ClockPlace = { geonameId: 1264527, countryCode: 'IN', admin1Code: '25', admin2Code: '603', lng: 80.27847 };
const MUMBAI: ClockPlace = { geonameId: 1275339, countryCode: 'IN', admin1Code: '16', admin2Code: '', lng: 72.88261 }; // on the no-district list
const BANDRA: ClockPlace = { geonameId: 1277352, countryCode: 'IN', admin1Code: '16', admin2Code: '518', lng: 72.86036 }; // Mumbai Suburban
const COLABA: ClockPlace = { geonameId: 1273862, countryCode: 'IN', admin1Code: '16', admin2Code: '519', lng: 72.81056 }; // Mumbai City
const PUNE: ClockPlace = { geonameId: 1259229, countryCode: 'IN', admin1Code: '16', admin2Code: '521', lng: 73.85535 };
const KOLKATA: ClockPlace = { geonameId: 1275004, countryCode: 'IN', admin1Code: '28', admin2Code: '342', lng: 88.36304 };
const DARJEELING: ClockPlace = { geonameId: 1273467, countryCode: 'IN', admin1Code: '28', admin2Code: '327', lng: 88.26667 };
const LONDON: ClockPlace = { geonameId: 2643743, countryCode: 'GB', admin1Code: 'ENG', admin2Code: 'GLA', lng: -0.12574 };
const KARACHI: ClockPlace = { geonameId: 1174872, countryCode: 'PK', admin1Code: '05', admin2Code: '', lng: 67.0104 };
const DHAKA: ClockPlace = { geonameId: 1185241, countryCode: 'BD', admin1Code: '81', admin2Code: '', lng: 90.40744 };

const ids = (place: ClockPlace | null, date: string) => clockQuestion(place, date).options.map((o) => o.id);
const def = (place: ClockPlace | null, date: string) => clockQuestion(place, date).defaultClock;

describe('offsets', () => {
  it('IST, War Time, Bombay, Calcutta', () => {
    expect([IST_SECONDS, WAR_TIME_SECONDS, BOMBAY_TIME_SECONDS, CALCUTTA_TIME_SECONDS]).toEqual([19800, 23400, 17460, 21200]);
  });
  it('local mean time = longitude × 240 s, rounded to the nearest second', () => {
    expect(localMeanTimeSeconds(77.216667)).toBe(18532); // New Delhi, R29: +5:08:52
    expect(localMeanTimeSeconds(88.366667)).toBe(21208); // Kolkata
    expect(localMeanTimeSeconds(72.883333)).toBe(17492); // Mumbai
    expect(localMeanTimeSeconds(80.002083)).toBe(19200); // 19200.4999 → 19200
    expect(localMeanTimeSeconds(80.002084)).toBe(19201); // 19200.5002 → 19201
  });
});

describe('isMumbai (D-087) without the place index', () => {
  it('district Mumbai City or Mumbai Suburban, or on the list', () => {
    expect(isMumbaiPlace(MUMBAI)).toBe(true);
    expect(isMumbaiPlace(BANDRA)).toBe(true);
    expect(isMumbaiPlace(COLABA)).toBe(true);
    expect(isMumbaiPlace(PUNE)).toBe(false);
    expect(isMumbaiPlace({ ...BANDRA, countryCode: 'PK' })).toBe(false);
    expect(isMumbaiPlace({ ...BANDRA, admin1Code: '07' })).toBe(false); // district code only counts in Maharashtra
  });

  it('the copied list equals data/places/mumbai-no-district.json and the index header', () => {
    const json = JSON.parse(readFileSync(join(ROOT, 'data/places/mumbai-no-district.json'), 'utf8')) as { places: { id: number }[] };
    expect([...MUMBAI_NO_DISTRICT_IDS].sort()).toEqual(json.places.map((p) => p.id).sort());
    const index = new PlaceIndex(gunzipSync(readFileSync(join(ROOT, 'data/places/index/places.tsv.gz'))).toString('utf8'));
    expect([...MUMBAI_NO_DISTRICT_IDS].sort()).toEqual([...index.mumbaiExtraIds].sort());
    // Same answer as the index's own isMumbai for the test places, with the real GeoNames codes
    for (const p of [MUMBAI, BANDRA, COLABA, PUNE, KOLKATA, DARJEELING, DELHI, CHENNAI]) {
      const real = index.get(p.geonameId)!;
      expect({ cc: real.countryCode, a1: real.admin1Code, a2: real.admin2Code }, real.name)
        .toEqual({ cc: p.countryCode, a1: p.admin1Code, a2: p.admin2Code });
      expect(isMumbaiPlace(p), real.name).toBe(index.isMumbai(real));
    }
  });
});

// [place, date, expected options (default first) or [] for no question]
type Case = [string, ClockPlace, string, ClockId[]];

describe('window 1: anywhere in India before 1906-01-01 → IST (default) / town local mean time', () => {
  it.each<Case>([
    ['Delhi, first supported day', DELHI, '1800-01-01', ['ist', 'lmt']],
    ['Delhi, R29', DELHI, '1895-02-20', ['ist', 'lmt']],
    ['Delhi, last day', DELHI, '1905-12-31', ['ist', 'lmt']],
    ['Delhi, day after', DELHI, '1906-01-01', []],
    ['Chennai, last day', CHENNAI, '1905-12-31', ['ist', 'lmt']],
    ['Mumbai, last day (before its own window)', MUMBAI, '1905-12-31', ['ist', 'lmt']],
    ['Kolkata, last day (before its own window)', KOLKATA, '1905-12-31', ['ist', 'lmt']],
  ])('%s', (_name, place, date, options) => {
    expect(ids(place, date)).toEqual(options);
    if (options.length) expect(def(place, date)).toBe('ist');
  });

  it('LMT is the place\'s own longitude × 240 s', () => {
    const q = clockQuestion(DELHI, '1895-02-20');
    expect(q.options).toEqual([{ id: 'ist', utcOffsetSeconds: 19800 }, { id: 'lmt', utcOffsetSeconds: 18532 }]);
    expect(clockQuestion(CHENNAI, '1895-02-20').options[1]).toEqual({ id: 'lmt', utcOffsetSeconds: Math.round(80.27847 * 240) });
    expect(q.windows).toEqual(['india-before-1906']);
  });
});

describe('window 2: Mumbai 1906-01-01 – 1955-12-31 → IST (default) / Bombay time +4:51', () => {
  it.each<Case>([
    ['Mumbai, first day', MUMBAI, '1906-01-01', ['ist', 'bombay']],
    ['Mumbai, R27', MUMBAI, '1938-05-10', ['ist', 'bombay']],
    ['Bandra (Mumbai Suburban)', BANDRA, '1950-06-01', ['ist', 'bombay']],
    ['Colaba (Mumbai City)', COLABA, '1950-06-01', ['ist', 'bombay']],
    ['Mumbai, last day', MUMBAI, '1955-12-31', ['ist', 'bombay']],
    ['Mumbai, day after', MUMBAI, '1956-01-01', []],
    ['Pune (Maharashtra, not Mumbai)', PUNE, '1938-05-10', []],
    ['Mumbai, gap between the war windows', MUMBAI, '1942-07-01', ['ist', 'bombay']],
  ])('%s', (_name, place, date, options) => {
    expect(ids(place, date)).toEqual(options);
    if (options.length) expect(def(place, date)).toBe('ist');
  });
  it('Bombay option is +4:51', () => {
    expect(clockQuestion(MUMBAI, '1938-05-10').options[1]).toEqual({ id: 'bombay', utcOffsetSeconds: 17460 });
  });
});

describe('window 3: West Bengal 1906-01-01 – 1948-12-31 → IST (default) / Calcutta time +5:53:20', () => {
  it.each<Case>([
    ['Kolkata, first day', KOLKATA, '1906-01-01', ['ist', 'calcutta']],
    ['Kolkata, R28', KOLKATA, '1925-11-03', ['ist', 'calcutta']],
    ['Darjeeling (also West Bengal)', DARJEELING, '1930-01-01', ['ist', 'calcutta']],
    ['Kolkata, last day', KOLKATA, '1948-12-31', ['ist', 'calcutta']],
    ['Kolkata, day after', KOLKATA, '1949-01-01', []],
    ['Kolkata, gap between the war windows', KOLKATA, '1942-05-15', ['ist', 'calcutta']],
  ])('%s', (_name, place, date, options) => {
    expect(ids(place, date)).toEqual(options);
    if (options.length) expect(def(place, date)).toBe('ist');
  });
  it('Calcutta option is +5:53:20', () => {
    expect(clockQuestion(KOLKATA, '1925-11-03').options[1]).toEqual({ id: 'calcutta', utcOffsetSeconds: 21200 });
  });
});

describe('window 4: anywhere in India 1941-10-01 – 1942-05-14 → IST (default) / War Time +6:30', () => {
  it.each<Case>([
    ['Delhi, day before', DELHI, '1941-09-30', []],
    ['Delhi, first day', DELHI, '1941-10-01', ['ist', 'war']],
    ['Delhi, last day', DELHI, '1942-05-14', ['ist', 'war']],
    ['Delhi, day after', DELHI, '1942-05-15', []],
  ])('%s', (_name, place, date, options) => {
    expect(ids(place, date)).toEqual(options);
    if (options.length) expect(def(place, date)).toBe('ist');
  });
});

describe('window 5: anywhere in India 1942-09-01 – 1945-10-14 → War Time (default) / IST', () => {
  it.each<Case>([
    ['Delhi, day before', DELHI, '1942-08-31', []],
    ['Delhi, first day', DELHI, '1942-09-01', ['war', 'ist']],
    ['Delhi, 1943', DELHI, '1943-07-15', ['war', 'ist']],
    ['Delhi, last day', DELHI, '1945-10-14', ['war', 'ist']],
    ['Delhi, day after', DELHI, '1945-10-15', []],
  ])('%s', (_name, place, date, options) => {
    expect(ids(place, date)).toEqual(options);
    if (options.length) expect(def(place, date)).toBe('war');
  });
});

describe('overlaps (D-090): all options of every matching window; default War Time only in 1942-09-01 – 1945-10-14', () => {
  it.each<[string, ClockPlace, string, ClockId[], ClockId]>([
    ['Mumbai 1943 (D-090 example)', MUMBAI, '1943-07-15', ['war', 'ist', 'bombay'], 'war'],
    ['Mumbai, first day of window 5', MUMBAI, '1942-09-01', ['war', 'ist', 'bombay'], 'war'],
    ['Mumbai, last day of window 5', MUMBAI, '1945-10-14', ['war', 'ist', 'bombay'], 'war'],
    ['Mumbai, day after window 5', MUMBAI, '1945-10-15', ['ist', 'bombay'], 'ist'],
    ['Mumbai, first day of window 4', MUMBAI, '1941-10-01', ['ist', 'war', 'bombay'], 'ist'],
    ['Mumbai, last day of window 4', MUMBAI, '1942-05-14', ['ist', 'war', 'bombay'], 'ist'],
    ['Kolkata 1943', KOLKATA, '1943-07-15', ['war', 'ist', 'calcutta'], 'war'],
    ['Kolkata 1941-12', KOLKATA, '1941-12-25', ['ist', 'war', 'calcutta'], 'ist'],
    ['Kolkata, day after window 5', KOLKATA, '1945-10-15', ['ist', 'calcutta'], 'ist'],
  ])('%s', (_name, place, date, options, defaultClock) => {
    const q = clockQuestion(place, date);
    expect(q.options.map((o) => o.id)).toEqual(options);
    expect(q.defaultClock).toBe(defaultClock);
    // The "day after window 5" rows are back to one window (the city clock)
    expect(q.windows.length).toBe(date === '1945-10-15' ? 1 : 2);
  });

  it('Mumbai 1943 lists both windows and the right offsets', () => {
    const q = clockQuestion(MUMBAI, '1943-07-15');
    expect(q.windows).toEqual(['mumbai-1906-1955', 'war-1942-1945']);
    expect(q.options).toEqual([
      { id: 'war', utcOffsetSeconds: 23400 },
      { id: 'ist', utcOffsetSeconds: 19800 },
      { id: 'bombay', utcOffsetSeconds: 17460 },
    ]);
  });
});

describe('no question outside India, or for manual entry', () => {
  it.each<[string, ClockPlace]>([['London', LONDON], ['Karachi (Pakistan today, O-007)', KARACHI], ['Dhaka (Bangladesh today, O-007)', DHAKA]])(
    '%s in the same years',
    (_name, place) => {
      for (const date of ['1800-01-01', '1895-02-20', '1905-12-31', '1906-01-01', '1925-11-03', '1938-05-10', '1941-10-01', '1943-07-15', '1945-10-14', '1955-12-31']) {
        expect(clockQuestion(place, date), date).toEqual({ applies: false, windows: [], options: [], defaultClock: null });
      }
    },
  );
  it('manual entry (no place) never gets the question', () => {
    expect(clockQuestion(null, '1943-07-15').applies).toBe(false);
  });
  it('modern India: no question', () => {
    for (const p of [DELHI, MUMBAI, KOLKATA]) expect(clockQuestion(p, '1992-08-14').applies).toBe(false);
  });
});

describe('resolveClock', () => {
  it('no window → the place\'s IANA zone; a clock choice is refused', () => {
    expect(resolveClock(DELHI, '1992-08-14')).toMatchObject({ source: 'timeZone', id: null });
    expect(() => resolveClock(DELHI, '1992-08-14', 'ist')).toThrow(expect.objectContaining({ code: 'INVALID_CLOCK_CHOICE' }));
    expect(() => resolveClock(LONDON, '1943-07-15', 'war')).toThrow(expect.objectContaining({ code: 'INVALID_CLOCK_CHOICE' }));
  });
  it('window, no choice → the default', () => {
    expect(resolveClock(DELHI, '1943-07-15')).toMatchObject({ source: 'clockRule', id: 'war', utcOffsetSeconds: 23400, chosen: false });
    expect(resolveClock(MUMBAI, '1938-05-10')).toMatchObject({ source: 'clockRule', id: 'ist', utcOffsetSeconds: 19800, chosen: false });
  });
  it('window, offered choice → that clock', () => {
    expect(resolveClock(MUMBAI, '1938-05-10', 'bombay')).toMatchObject({ id: 'bombay', utcOffsetSeconds: 17460, chosen: true });
    expect(resolveClock(KOLKATA, '1925-11-03', 'calcutta')).toMatchObject({ id: 'calcutta', utcOffsetSeconds: 21200, chosen: true });
    expect(resolveClock(DELHI, '1895-02-20', 'lmt')).toMatchObject({ id: 'lmt', utcOffsetSeconds: 18532, chosen: true });
    expect(resolveClock(MUMBAI, '1943-07-15', 'bombay')).toMatchObject({ id: 'bombay', utcOffsetSeconds: 17460 });
    expect(resolveClock(DELHI, '1943-07-15', 'ist')).toMatchObject({ id: 'ist', utcOffsetSeconds: 19800 });
  });
  it('window, choice not offered for this birth → error', () => {
    for (const [p, d, c] of [
      [MUMBAI, '1938-05-10', 'calcutta'], [MUMBAI, '1938-05-10', 'war'], [MUMBAI, '1938-05-10', 'lmt'],
      [KOLKATA, '1925-11-03', 'bombay'], [DELHI, '1895-02-20', 'war'], [DELHI, '1943-07-15', 'lmt'],
      [PUNE, '1943-07-15', 'bombay'], [MUMBAI, '1956-01-01', 'bombay'],
    ] as [ClockPlace, string, ClockId][]) {
      expect(() => resolveClock(p, d, c), `${p.geonameId} ${d} ${c}`).toThrow(expect.objectContaining({ code: 'INVALID_CLOCK_CHOICE' }));
    }
  });
});
