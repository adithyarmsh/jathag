// Local time → UTC (FR-CALC-01, D-019, FR-IN-07).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { localToUtc, TimeError, tzdataVersion } from '../src/index.ts';

type Birth = { id: string; date: string; time: string; utc_offset: number; iana: string };
const births: Birth[] = JSON.parse(
  readFileSync(new URL('../../../tests/reference/births.json', import.meta.url), 'utf8'),
).births;

/** Expected instant: local time minus the TRUE offset in births.json. */
function byOffset(b: Birth): string {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi] = b.time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - Math.round(b.utc_offset * 3600) * 1000)
    .toISOString().replace('.000Z', 'Z');
}

describe('IANA time zone gives the same instant as the true offset, all 25 reference births', () => {
  it.each(births.map((b) => [b.id, b] as const))('%s', (_id, b) => {
    const r = localToUtc({ date: b.date, time: b.time, zone: { iana: b.iana } });
    expect(r.utc).toBe(byOffset(b));
    expect(r.utcOffsetSeconds).toBe(Math.round(b.utc_offset * 3600));
    expect(r.tzdataVersion).toBe(tzdataVersion());
  });
});

describe('manual UTC offset (FR-IN-07)', () => {
  it('all 25 births by offset in seconds', () => {
    for (const b of births) {
      const off = Math.round(b.utc_offset * 3600);
      expect(localToUtc({ date: b.date, time: b.time, zone: { utcOffsetSeconds: off } }).utc, b.id).toBe(byOffset(b));
    }
  });
  it('R22 Madras Mean Time +5:21:10 with seconds', () => {
    const r = localToUtc({ date: '1901-04-12', time: '07:30:00', zone: { utcOffsetSeconds: 5 * 3600 + 21 * 60 + 10 } });
    expect(r.utc).toBe('1901-04-12T02:08:50Z');
    expect(r.tzdataVersion).toBeNull();
  });
  it('rejects a non-integer or out-of-range offset', () => {
    expect(() => localToUtc({ date: '2000-01-01', time: '12:00', zone: { utcOffsetSeconds: 1.5 } })).toThrow(TimeError);
    expect(() => localToUtc({ date: '2000-01-01', time: '12:00', zone: { utcOffsetSeconds: 19 * 3600 } })).toThrow(TimeError);
  });
});

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as TimeError).code;
  }
  return 'no error';
};

describe('daylight-saving changes are never guessed', () => {
  it('a skipped local time is NONEXISTENT_LOCAL_TIME (New York, 14 Mar 2021, 02:30)', () => {
    expect(code(() => localToUtc({ date: '2021-03-14', time: '02:30', zone: { iana: 'America/New_York' } })))
      .toBe('NONEXISTENT_LOCAL_TIME');
  });

  it('a repeated local time is AMBIGUOUS_LOCAL_TIME with both instants (New York, 7 Nov 2021, 01:30)', () => {
    const input = { date: '2021-11-07', time: '01:30', zone: { iana: 'America/New_York' } };
    let err: TimeError | undefined;
    try {
      localToUtc(input);
    } catch (e) {
      err = e as TimeError;
    }
    expect(err?.code).toBe('AMBIGUOUS_LOCAL_TIME');
    expect(err?.candidates?.earlier.utc).toBe('2021-11-07T05:30:00Z'); // EDT, −4 h
    expect(err?.candidates?.later.utc).toBe('2021-11-07T06:30:00Z'); // EST, −5 h
    expect(localToUtc({ ...input, repeatedTime: 'earlier' }).utc).toBe('2021-11-07T05:30:00Z');
    expect(localToUtc({ ...input, repeatedTime: 'later' }).utc).toBe('2021-11-07T06:30:00Z');
  });

  it('times next to a change are fine', () => {
    expect(localToUtc({ date: '2021-03-14', time: '01:59:59', zone: { iana: 'America/New_York' } }).utc).toBe('2021-03-14T06:59:59Z');
    expect(localToUtc({ date: '2021-03-14', time: '03:00', zone: { iana: 'America/New_York' } }).utc).toBe('2021-03-14T07:00:00Z');
  });
});

describe('bad input', () => {
  it.each([
    [{ date: '2021-02-30', time: '10:00', zone: { iana: 'Asia/Kolkata' } }, 'INVALID_DATE'],
    [{ date: '14/08/1992', time: '10:00', zone: { iana: 'Asia/Kolkata' } }, 'INVALID_DATE'],
    [{ date: '1992-08-14', time: '24:00', zone: { iana: 'Asia/Kolkata' } }, 'INVALID_TIME'],
    [{ date: '1992-08-14', time: '6:45', zone: { iana: 'Asia/Kolkata' } }, 'INVALID_TIME'],
    [{ date: '1992-08-14', time: '06:45', zone: { iana: 'Asia/Chennai' } }, 'INVALID_TIME_ZONE'],
  ] as const)('%j → %s', (input, expected) => {
    expect(code(() => localToUtc(input))).toBe(expected);
  });
});
