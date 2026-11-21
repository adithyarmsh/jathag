// The UTC offset shown under the place search (D-094 item 6): the default clock in a "Which clock?"
// window (never the database's Madras time, D-091), otherwise the IANA zone on the birth date.
import { describe, expect, it } from 'vitest';
import { formatUtcOffset } from './chart-format.ts';
import { offsetAtLocalTime, shownOffsetSeconds, type OffsetPlace } from './place-offset.ts';

const NEW_DELHI: OffsetPlace = { geonameId: 1261481, countryCode: 'IN', admin1Code: '07', admin2Code: '094', lng: 77.20897, timeZone: 'Asia/Kolkata' };
const CHENNAI: OffsetPlace = { geonameId: 1264527, countryCode: 'IN', admin1Code: '25', admin2Code: '603', lng: 80.27847, timeZone: 'Asia/Kolkata' };
const MUMBAI: OffsetPlace = { geonameId: 1275339, countryCode: 'IN', admin1Code: '16', admin2Code: '', lng: 72.88261, timeZone: 'Asia/Kolkata' };
const KOLKATA: OffsetPlace = { geonameId: 1275004, countryCode: 'IN', admin1Code: '28', admin2Code: '342', lng: 88.36304, timeZone: 'Asia/Kolkata' };
const NEW_YORK: OffsetPlace = { geonameId: 5128581, countryCode: 'US', admin1Code: 'NY', admin2Code: '', lng: -74.00597, timeZone: 'America/New_York' };
const LONDON: OffsetPlace = { geonameId: 2643743, countryCode: 'GB', admin1Code: 'ENG', admin2Code: 'GLA', lng: -0.12574, timeZone: 'Europe/London' };

const shown = (p: OffsetPlace, date: string | null, time: string | null = null, now?: number) =>
  formatUtcOffset(shownOffsetSeconds(p, date, time, now));

describe('offset shown in a "Which clock?" window = the default clock the chart uses', () => {
  it.each([
    ['New Delhi 1890 → IST, not Madras time', NEW_DELHI, '1890-04-02', 'UTC+5:30'],
    ['Chennai 1905-12-31 → IST', CHENNAI, '1905-12-31', 'UTC+5:30'],
    ['New Delhi 1943 → War Time', NEW_DELHI, '1943-07-15', 'UTC+6:30'],
    ['Chennai 1942-09-01 → War Time', CHENNAI, '1942-09-01', 'UTC+6:30'],
    ['New Delhi 1941-12-25 (early War Time window, default IST)', NEW_DELHI, '1941-12-25', 'UTC+5:30'],
    ['Mumbai 1943 → War Time (overlap default)', MUMBAI, '1943-03-01', 'UTC+6:30'],
    ['Mumbai 1950 → IST', MUMBAI, '1950-01-01', 'UTC+5:30'],
    ['Kolkata 1930 → IST', KOLKATA, '1930-03-10', 'UTC+5:30'],
  ] as const)('%s', (_n, p, date, out) => {
    expect(shown(p, date)).toBe(out);
  });

  it('the database itself says Madras time for 1890 (so it must not be shown)', () => {
    expect(formatUtcOffset(offsetAtLocalTime('Asia/Kolkata', '1890-04-02', '12:00'))).toBe('UTC+5:21:10');
  });
});

describe('outside the windows: the IANA zone on the birth date', () => {
  it.each([
    ['New York summer → UTC−4:00', NEW_YORK, '1990-07-04', null, 'UTC−4:00'],
    ['New York winter → UTC−5:00', NEW_YORK, '1990-01-15', null, 'UTC−5:00'],
    ['London 1943 summer (double summer time) → UTC+2:00', LONDON, '1943-07-01', null, 'UTC+2:00'],
    ['London winter → UTC+0:00', LONDON, '2000-01-01', null, 'UTC+0:00'],
    ['Chennai 1990 → UTC+5:30', CHENNAI, '1990-05-05', null, 'UTC+5:30'],
    ['New York, day the clocks went forward, before → UTC−5:00', NEW_YORK, '2024-03-10', '01:30', 'UTC−5:00'],
    ['New York, day the clocks went forward, after → UTC−4:00', NEW_YORK, '2024-03-10', '03:30', 'UTC−4:00'],
  ] as const)('%s', (_n, p, date, time, out) => {
    expect(shown(p, date, time)).toBe(out);
  });
});

describe('before a full date: today\'s offset', () => {
  const july2026 = Date.UTC(2026, 6, 1, 12);
  const jan2026 = Date.UTC(2026, 0, 15, 12);
  it('New York in July → UTC−4:00, in January → UTC−5:00', () => {
    expect(shown(NEW_YORK, null, null, july2026)).toBe('UTC−4:00');
    expect(shown(NEW_YORK, null, null, jan2026)).toBe('UTC−5:00');
  });
  it('an impossible date (31 April) counts as no date yet', () => {
    expect(shown(NEW_YORK, '1990-04-31', null, jan2026)).toBe('UTC−5:00');
  });
  it('Chennai → UTC+5:30', () => {
    expect(shown(CHENNAI, null, null, july2026)).toBe('UTC+5:30');
  });
});
