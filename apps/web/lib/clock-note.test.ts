// The text behind the circled "i" (FR-IN-09, D-092): chosen in the browser from the API's own rule.
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import { clockNote, earlyClockNote } from './clock-note.ts';
import { BOMBAY_TIME_SECONDS, CALCUTTA_TIME_SECONDS, clockQuestion, IST_SECONDS, WAR_TIME_SECONDS, type ClockPlace } from './clock-rule.ts';

// Real GeoNames ids and admin codes (same as tests/reference/api.test.ts and packages/api tests).
const NEW_DELHI: ClockPlace = { geonameId: 1261481, countryCode: 'IN', admin1Code: '07', admin2Code: '094', lng: 77.20897 };
const MUMBAI: ClockPlace = { geonameId: 1275339, countryCode: 'IN', admin1Code: '16', admin2Code: '', lng: 72.88261 };
const KOLKATA: ClockPlace = { geonameId: 1275004, countryCode: 'IN', admin1Code: '28', admin2Code: '342', lng: 88.36304 };
const CHENNAI: ClockPlace = { geonameId: 1264527, countryCode: 'IN', admin1Code: '25', admin2Code: '603', lng: 80.27847 };
const NEW_YORK: ClockPlace = { geonameId: 5128581, countryCode: 'US', admin1Code: 'NY', admin2Code: '', lng: -74.00597 };
const LONDON: ClockPlace = { geonameId: 2643743, countryCode: 'GB', admin1Code: 'ENG', admin2Code: 'GLA', lng: -0.12574 };

const note = (p: ClockPlace, date: string) => clockNote(clockQuestion(p, date), en.clockNote);

describe('which note text for which window', () => {
  it.each([
    ['Mumbai 1940 → Bombay time', MUMBAI, '1940-06-01', 'mumbai'],
    ['Mumbai first day 1906', MUMBAI, '1906-01-01', 'mumbai'],
    ['Mumbai last day 1955', MUMBAI, '1955-12-31', 'mumbai'],
    ['Kolkata 1930 → Calcutta time', KOLKATA, '1930-03-10', 'westBengal'],
    ['Kolkata last day 1948', KOLKATA, '1948-12-31', 'westBengal'],
    ['New Delhi 1943 → War Time (default War Time)', NEW_DELHI, '1943-07-15', 'warTime'],
    ['Chennai first day of War Time', CHENNAI, '1942-09-01', 'warTime'],
    ['Chennai last day of War Time', CHENNAI, '1945-10-14', 'warTime'],
    ['New Delhi 1941-12 → early War Time (default IST)', NEW_DELHI, '1941-12-25', 'warTimeEarly'],
    ['New Delhi 1942-05-14 (last day of the early window)', NEW_DELHI, '1942-05-14', 'warTimeEarly'],
    ['New Delhi 1890 → before 1906', NEW_DELHI, '1890-04-02', 'before1906'],
    ['New Delhi 1905-12-31', NEW_DELHI, '1905-12-31', 'before1906'],
    ['Mumbai 1943 → combined Bombay + War Time', MUMBAI, '1943-03-01', 'mumbaiWarTime'],
    ['Mumbai 1942-01 → combined Bombay + early War Time', MUMBAI, '1942-01-15', 'mumbaiWarTimeEarly'],
    ['Kolkata 1944 → combined Calcutta + War Time', KOLKATA, '1944-08-08', 'westBengalWarTime'],
    ['Kolkata 1941-11 → combined Calcutta + early War Time', KOLKATA, '1941-11-11', 'westBengalWarTimeEarly'],
  ] as const)('%s', (_name, place, date, key) => {
    expect(note(place, date)?.key).toBe(key);
  });

  it('the combined notes name the default the API reports', () => {
    expect(clockQuestion(MUMBAI, '1943-03-01').defaultClock).toBe('war');
    expect(note(MUMBAI, '1943-03-01')!.text).toContain("War Time, one hour ahead of IST, and we've used it");
    expect(clockQuestion(MUMBAI, '1942-01-15').defaultClock).toBe('ist');
    expect(note(MUMBAI, '1942-01-15')!.text).toContain("We've calculated your chart with IST");
    expect(note(KOLKATA, '1944-08-08')!.text).toContain('Calcutta time');
    expect(note(KOLKATA, '1941-11-11')!.text).toContain("We've calculated your chart with IST");
  });
});

describe('no "i" outside the windows or outside India', () => {
  it.each([
    ['Chennai today', CHENNAI, '2026-11-21'],
    ['New Delhi 1906-01-01', NEW_DELHI, '1906-01-01'],
    ['New Delhi 1941-09-30', NEW_DELHI, '1941-09-30'],
    ['New Delhi between the war windows (1942-06-15)', NEW_DELHI, '1942-06-15'],
    ['New Delhi 1945-10-15', NEW_DELHI, '1945-10-15'],
    ['Mumbai 1956-01-01', MUMBAI, '1956-01-01'],
    ['Kolkata 1949-01-01', KOLKATA, '1949-01-01'],
    ['New York 1890', NEW_YORK, '1890-04-02'],
    ['London 1943', LONDON, '1943-07-15'],
    ['New York 2024 fall-back night', NEW_YORK, '2024-11-03'],
  ] as const)('%s', (_name, place, date) => {
    expect(note(place, date)).toBeNull();
  });
});

describe('before 1906: minutes from the town’s own local time (D-092), never Madras time (D-091)', () => {
  it('New Delhi ≈ 21 minutes behind IST', () => {
    expect(note(NEW_DELHI, '1890-04-02')!.text).toContain('about 21 minutes behind IST');
  });
  it('Kolkata ≈ 23 minutes ahead of IST; Mumbai ≈ 38 minutes behind (its own longitude, not Bombay time)', () => {
    expect(note(KOLKATA, '1890-01-01')!.text).toContain('about 23 minutes ahead of IST');
    expect(note(MUMBAI, '1890-01-01')!.text).toContain('about 38 minutes behind IST');
  });
  it('Chennai ≈ 9 minutes behind IST (not the database’s Madras time)', () => {
    const text = note(CHENNAI, '1890-01-01')!.text;
    expect(text).toContain('about 9 minutes behind IST');
    expect(text).not.toMatch(/madras/i);
  });
  it('1 minute and "within a minute" wording', () => {
    const at = (lng: number) => note({ ...NEW_DELHI, lng }, '1890-01-01')!;
    expect(at(82.25).key).toBe('before1906OneMinute'); // 82.25° × 4 = 329 min → 1 min behind
    expect(at(82.25).text).toContain('about 1 minute behind IST');
    expect(at(82.5).key).toBe('before1906Same');
  });
  it('no note text mentions Madras', () => {
    for (const text of Object.values(en.clockNote)) expect(text).not.toMatch(/madras/i);
  });
});

describe('the fixed numbers in the notes agree with the API’s clock offsets', () => {
  it('Bombay 39 min behind, Calcutta 23 min 20 s ahead, War Time one hour ahead', () => {
    expect(IST_SECONDS - BOMBAY_TIME_SECONDS).toBe(39 * 60);
    expect(CALCUTTA_TIME_SECONDS - IST_SECONDS).toBe(23 * 60 + 20);
    expect(WAR_TIME_SECONDS - IST_SECONDS).toBe(3600);
    for (const [key, text] of Object.entries(en.clockNote)) {
      if (/Bombay time/.test(text)) expect(text, key).toContain('Bombay time, 39 minutes behind IST');
      if (/Calcutta time,/.test(text)) expect(text, key).toContain('Calcutta time, 23 minutes 20 seconds ahead of IST');
      if (/War Time,/.test(text)) expect(text, key).toContain('War Time, one hour ahead of IST');
    }
  });
});

describe('the "i" earlier (D-094 item 5): before a place is chosen, and with only a year', () => {
  const early = (place: ClockPlace | null, date: string | null, year: number | null) => earlyClockNote(place, date, year, en.clockNote);

  it.each([
    ['1890', 1890, 'before1906NoPlace'],
    ['1905', 1905, 'before1906NoPlace'],
    ['1943', 1943, 'warTime'],
    ['1944', 1944, 'warTime'],
  ] as const)('year %s only, no place → "If born in India: …"', (_y, year, key) => {
    const n = early(null, null, year)!;
    expect(n.key).toBe(key);
    expect(n.text.startsWith('If born in India: ')).toBe(true);
  });

  it.each([1906, 1941, 1942, 1945, 1950, 1990])('year %i only (not wholly inside a window) → no "i"', (year) => {
    expect(early(null, null, year)).toBeNull();
  });

  it('before 1906 without a place: "up to about half an hour", no number of minutes', () => {
    const text = early(null, null, 1890)!.text;
    expect(text).toContain('up to about half an hour different from IST');
    expect(text).not.toMatch(/\d+ minutes?/);
    expect(text).not.toMatch(/madras/i);
  });

  it('full date, no place: the exact all-India rule', () => {
    expect(early(null, '1941-10-01', 1941)!.key).toBe('warTimeEarly');
    expect(early(null, '1941-09-30', 1941)).toBeNull();
    expect(early(null, '1942-05-14', 1942)!.key).toBe('warTimeEarly');
    expect(early(null, '1942-05-15', 1942)).toBeNull();
    expect(early(null, '1942-08-31', 1942)).toBeNull();
    expect(early(null, '1942-09-01', 1942)!.key).toBe('warTime');
    expect(early(null, '1945-10-14', 1945)!.key).toBe('warTime');
    expect(early(null, '1945-10-15', 1945)).toBeNull();
    expect(early(null, '1905-12-31', 1905)!.key).toBe('before1906NoPlace');
    expect(early(null, '1906-01-01', 1906)).toBeNull();
    for (const d of ['1941-10-01', '1942-09-01', '1890-01-01']) expect(early(null, d, Number(d.slice(0, 4)))!.text).toMatch(/^If born in India: /);
  });

  it('no place: Mumbai and West Bengal windows never show (they need the place)', () => {
    expect(early(null, '1950-06-01', 1950)).toBeNull();
    expect(early(null, '1930-06-01', 1930)).toBeNull();
  });

  it('1943, then Mumbai chosen → the combined Mumbai + War Time note (no "If born in India")', () => {
    expect(early(null, null, 1943)!.key).toBe('warTime');
    const n = early(MUMBAI, null, 1943)!;
    expect(n.key).toBe('mumbaiWarTime');
    expect(n.text).toBe(en.clockNote.mumbaiWarTime);
  });

  it('1943, then London chosen → no "i"', () => {
    expect(early(LONDON, null, 1943)).toBeNull();
    expect(early(LONDON, '1943-07-15', 1943)).toBeNull();
  });

  it('with a place and a full date it is exactly the 0.2.13 note', () => {
    for (const [p, d] of [[NEW_DELHI, '1890-04-02'], [MUMBAI, '1940-06-01'], [KOLKATA, '1944-08-08'], [CHENNAI, '1942-09-01'], [NEW_YORK, '1890-04-02']] as const) {
      expect(early(p, d, Number(d.slice(0, 4)))).toEqual(note(p, d));
    }
  });

  it('with a place and only a year: Mumbai 1950 (whole year in the Bombay window) yes, Kolkata 1949 no', () => {
    expect(early(MUMBAI, null, 1950)!.key).toBe('mumbai');
    expect(early(KOLKATA, null, 1948)!.key).toBe('westBengal');
    expect(early(KOLKATA, null, 1949)).toBeNull();
    expect(early(NEW_DELHI, null, 1890)!.text).toContain('about 21 minutes behind IST');
  });

  it('no year and no date → no "i"', () => {
    expect(early(null, null, null)).toBeNull();
    expect(early(MUMBAI, null, null)).toBeNull();
  });
});
