// 12-hour time with AM/PM → the API's 24-hour "HH:MM" (D-094 item 2).
import { describe, expect, it } from 'vitest';
import { HOURS, MINUTES, to12hText, to24h } from './time-12h.ts';

describe('to24h', () => {
  it.each([
    ['12', '0', 'am', '00:00'],
    ['12', '30', 'am', '00:30'],
    ['12', '0', 'pm', '12:00'],
    ['12', '30', 'pm', '12:30'],
    ['1', '5', 'pm', '13:05'],
    ['11', '59', 'pm', '23:59'],
    ['1', '0', 'am', '01:00'],
    ['11', '59', 'am', '11:59'],
    ['9', '7', 'am', '09:07'],
  ] as const)('%s:%s %s → %s', (h, m, p, out) => {
    expect(to24h(h, m, p)).toBe(out);
  });

  it('every one of the 1440 minutes of a day comes out exactly once', () => {
    const seen = new Set<string>();
    for (const p of ['am', 'pm'] as const) for (const h of HOURS) for (const m of MINUTES) seen.add(to24h(String(h), String(m), p)!);
    expect(seen.size).toBe(1440);
  });

  it('no AM/PM chosen → no time (never a silent default)', () => {
    expect(to24h('7', '30', null)).toBeNull();
  });

  it('missing or out-of-range parts → null', () => {
    expect(to24h('', '30', 'am')).toBeNull();
    expect(to24h('7', '', 'pm')).toBeNull();
    expect(to24h('0', '30', 'am')).toBeNull();
    expect(to24h('13', '0', 'pm')).toBeNull();
    expect(to24h('5', '60', 'pm')).toBeNull();
  });

  it('pick-lists are bounded: hours 1–12, minutes 00–59', () => {
    expect(HOURS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(MINUTES.length).toBe(60);
    expect(MINUTES[0]).toBe(0);
    expect(MINUTES[59]).toBe(59);
  });
});

describe('to12hText (showing the time back)', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['00:30', '12:30 AM'],
    ['12:00', '12:00 PM'],
    ['13:05', '1:05 PM'],
    ['23:59', '11:59 PM'],
  ])('%s → %s', (t24, out) => {
    expect(to12hText(t24, 'AM', 'PM')).toBe(out);
  });
});
