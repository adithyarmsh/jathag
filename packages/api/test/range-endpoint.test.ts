// Range endpoint (step 0.3.6, D-111): POST /api/chart/range. Range rules, the "Which clock?" rule at
// both ends, local times with first/second in a repeated hour (case A5), every error code, privacy.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleRangeRequest, MAX_RANGE_BODY_BYTES, type RangeResponse } from '../src/index.ts';

const ROOT = join(import.meta.dirname, '../../..');
const CASES = JSON.parse(readFileSync(join(ROOT, 'tests/reference/approx-time/cases.json'), 'utf8')).cases as {
  id: string; events: { utc: string; local: string; repeatedLocalTime?: string; changes: unknown[] }[];
  segments: Record<string, unknown>[]; certain: string[]; dasha: Record<string, unknown>[];
}[];
const CASE = Object.fromEntries(CASES.map((c) => [c.id, c]));

const CHENNAI = {
  geonameId: 1264527, lat: 13.083333, lng: 80.283333, timeZone: 'Asia/Kolkata',
  countryCode: 'IN', admin1Code: '25', admin2Code: '603',
};
const NEWARK = {
  geonameId: 5101798, lat: 40.733333, lng: -74.166667, timeZone: 'America/New_York',
  countryCode: 'US', admin1Code: 'NJ', admin2Code: '013',
};
const A1 = { date: '1992-08-14', fromTime: '06:00', toTime: '12:00', place: CHENNAI };

const post = (body: unknown, raw = false) => new Request('http://localhost/api/chart/range', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: raw ? (body as string) : JSON.stringify(body),
});
async function range(body: unknown, raw = false) {
  const res = await handleRangeRequest(post(body, raw));
  const text = await res.clone().text();
  return { res, text, json: (await res.json()) as RangeResponse & { error?: { code: string; setting?: string } } };
}
const codeOf = async (body: unknown, raw = false) => (await range(body, raw)).json.error?.code;

// Nothing may be written to the console for a normal or a rejected request.
let spies: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
});
afterEach(() => {
  for (const s of spies) {
    expect(s, 'console must stay silent').not.toHaveBeenCalled();
    s.mockRestore();
  }
});

describe('a normal range (case A1 through the endpoint)', () => {
  it('returns the scan with local times, the clock used and no-store', async () => {
    const { res, json } = await range(A1);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('server-timing')).toMatch(/scan;dur=[\d.]+, calc;dur=[\d.]+, cpu;dur=[\d.]+, total;dur=[\d.]+/);
    expect(json.apiVersion).toBe(1);
    expect(json.engineVersion).toBe('0.6.0');
    expect(json.place).toEqual({ kind: 'search', ...CHENNAI });
    expect(json.clock).toEqual({ source: 'timeZone', id: null, chosen: false, utcOffsetSeconds: 19800, timeZone: 'Asia/Kolkata', tzdataVersion: process.versions.tz });
    expect(json.clockQuestion.applies).toBe(false);
    expect(json.range).toEqual({
      from: { date: '1992-08-14', time: '06:00:00', utc: '1992-08-14T00:30:00Z', utcOffsetSeconds: 19800 },
      to: { date: '1992-08-14', time: '12:00:00', utc: '1992-08-14T06:30:00Z', utcOffsetSeconds: 19800 },
      seconds: 21_600,
      clockSeconds: 21_600,
    });
    expect(json.events).toEqual(CASE.A1!.events);
    expect(json.certain).toEqual(['ms']);
    expect(json.segments.map((s) => ({ from: s.from, to: s.to, ls: s.ls, ln: s.ln, ld9: s.ld9, ms: s.ms, mn: s.mn, mp: s.mp }))).toEqual(CASE.A1!.segments);
    expect(json.segments[0]).toMatchObject({ fromLocal: '1992-08-14 06:00:00', toLocal: '1992-08-14 06:09:29' });
    expect(json.dasha.map(({ fromLocal: _f, toLocal: _t, ...d }) => d)).toEqual(CASE.A1!.dasha);
    expect(json.dasha[1]).toMatchObject({ fromLocal: '1992-08-14 11:12:36', toLocal: '1992-08-14 12:00:00', lordAtBirth: 'Ra' });
    // IDs only, no English names (D-063)
    expect(JSON.stringify(json.events)).not.toMatch(/Aries|Leo|Ashwini|Moon|Lagna/);
  });

  it('the same request twice gives the same response body', async () => {
    expect((await range(A1)).text).toBe((await range(A1)).text);
  });
});

describe('range rules (D-111)', () => {
  it('the whole day is 00:00 to 24:00 (case A4): 24 hours, ending at 00:00 on the next date', async () => {
    const { json } = await range({ date: '1936-10-02', fromTime: '00:00', toTime: '24:00', place: CHENNAI });
    expect(json.range.to).toEqual({ date: '1936-10-03', time: '00:00:00', utc: '1936-10-02T18:30:00Z', utcOffsetSeconds: 19800 });
    expect(json.range.seconds).toBe(86_400);
    expect(json.events).toEqual(CASE.A4!.events);
    expect(json.certain).toEqual(CASE.A4!.certain);
    expect((await range({ date: '1936-10-02', fromTime: '00:00:00', toTime: '24:00:00', place: CHENNAI })).json.range.seconds).toBe(86_400);
  });

  it('an end earlier than the start ends on the next date: 20:00–06:00 is 10 hours', async () => {
    const { json } = await range({ date: '1992-08-14', fromTime: '20:00', toTime: '06:00', place: CHENNAI });
    expect(json.range.from.utc).toBe('1992-08-14T14:30:00Z');
    expect(json.range.to).toMatchObject({ date: '1992-08-15', time: '06:00:00', utc: '1992-08-15T00:30:00Z' });
    expect(json.range.clockSeconds).toBe(36_000);
  });

  it('the next date rolls over months and years (31 Dec → 1 Jan, 28 Feb → 29 Feb in a leap year)', async () => {
    expect((await range({ date: '1999-12-31', fromTime: '23:00', toTime: '01:00', place: CHENNAI })).json.range.to.date).toBe('2000-01-01');
    expect((await range({ date: '2000-02-28', fromTime: '23:00', toTime: '24:00', place: CHENNAI })).json.range.to.date).toBe('2000-02-29');
    expect((await range({ date: '2001-02-28', fromTime: '23:00', toTime: '01:00', place: CHENNAI })).json.range.to.date).toBe('2001-03-01');
  });

  it('an end equal to the start is RANGE_SAME_TIME ("use the exact time")', async () => {
    expect(await codeOf({ ...A1, toTime: '06:00' })).toBe('RANGE_SAME_TIME');
    expect(await codeOf({ ...A1, fromTime: '06:00:00', toTime: '06:00' })).toBe('RANGE_SAME_TIME');
    expect(await codeOf({ ...A1, fromTime: '00:00', toTime: '24:00' })).toBeUndefined(); // the whole day is not "the same time"
  });

  it('at least 1 minute: 59 seconds is RANGE_TOO_SHORT, 60 seconds works, also across midnight', async () => {
    expect(await codeOf({ ...A1, fromTime: '10:00:00', toTime: '10:00:59' })).toBe('RANGE_TOO_SHORT');
    expect(await codeOf({ ...A1, fromTime: '23:59:30', toTime: '00:00:20' })).toBe('RANGE_TOO_SHORT');
    const ok = await range({ ...A1, fromTime: '10:00', toTime: '10:01' });
    expect(ok.res.status).toBe(200);
    expect(ok.json.range.seconds).toBe(60);
    expect((await range({ ...A1, fromTime: '23:59:30', toTime: '00:00:30' })).json.range.seconds).toBe(60);
  });

  it('at most 24 hours: "24:00" only as the end, nothing later than 24:00', async () => {
    expect(await codeOf({ ...A1, fromTime: '24:00', toTime: '06:00' })).toBe('INVALID_TIME');
    for (const t of ['24:01', '24:00:01', '25:00', '6:00', '06:60', '']) expect(await codeOf({ ...A1, toTime: t })).toBe('INVALID_TIME');
  });
});

describe('clocks', () => {
  it('case A5: Newark 20:00 on 27 Oct 2001 to 06:00, across midnight and the clock going back', async () => {
    const { res, json } = await range({ date: '2001-10-27', fromTime: '20:00', toTime: '06:00', place: NEWARK });
    expect(res.status).toBe(200);
    expect(json.range).toEqual({
      from: { date: '2001-10-27', time: '20:00:00', utc: '2001-10-28T00:00:00Z', utcOffsetSeconds: -14_400 },
      to: { date: '2001-10-28', time: '06:00:00', utc: '2001-10-28T11:00:00Z', utcOffsetSeconds: -18_000 },
      seconds: 39_600, // 11 real hours
      clockSeconds: 36_000, // 10 hours on the clock
    });
    // Every moment, local time and first/second marker exactly as in the case file.
    expect(json.events).toEqual(CASE.A5!.events);
    expect(json.events.filter((e) => e.repeatedLocalTime === 'first').length).toBeGreaterThan(0);
    expect(json.events.filter((e) => e.repeatedLocalTime === 'second').length).toBeGreaterThan(0);
    expect(json.certain).toEqual(CASE.A5!.certain);
    // A segment that starts in the first 01:xx and one in the second 01:xx carry the markers too.
    const marked = json.segments.filter((s) => s.fromLocal.startsWith('2001-10-28 01:'));
    expect(new Set(marked.map((s) => s.fromRepeatedLocalTime))).toEqual(new Set(['first', 'second']));
    // Outside the repeated hour there is no marker at all.
    expect(json.segments[0]).not.toHaveProperty('fromRepeatedLocalTime');
  });

  it('a start or end in the skipped hour (clock going forward) is NONEXISTENT_LOCAL_TIME', async () => {
    expect(await codeOf({ date: '2001-04-01', fromTime: '02:30', toTime: '05:00', place: NEWARK })).toBe('NONEXISTENT_LOCAL_TIME');
    expect(await codeOf({ date: '2001-04-01', fromTime: '00:30', toTime: '02:15', place: NEWARK })).toBe('NONEXISTENT_LOCAL_TIME');
    // Around it is fine: 01:00–04:00 is 3 hours on the clock but 2 real hours.
    const { json } = await range({ date: '2001-04-01', fromTime: '01:00', toTime: '04:00', place: NEWARK });
    expect([json.range.clockSeconds, json.range.seconds]).toEqual([10_800, 7_200]);
  });

  it('an end in the repeated hour needs first/second (AMBIGUOUS_LOCAL_TIME), then works', async () => {
    const body = { date: '2001-10-28', fromTime: '00:30', toTime: '01:30', place: NEWARK };
    expect(await codeOf(body)).toBe('AMBIGUOUS_LOCAL_TIME');
    expect(await codeOf({ ...body, fromTime: '01:30', toTime: '03:00' })).toBe('AMBIGUOUS_LOCAL_TIME');
    expect((await range({ ...body, toRepeatedTime: 'earlier' })).json.range.seconds).toBe(3_600);
    expect((await range({ ...body, toRepeatedTime: 'later' })).json.range.seconds).toBe(7_200);
    expect(await codeOf({ ...body, toRepeatedTime: 'second' })).toBe('INVALID_REPEATED_TIME');
    expect(await codeOf({ ...body, fromRepeatedTime: 'x' })).toBe('INVALID_REPEATED_TIME');
    // The second 01:30 to the first 01:45 really ends before it starts.
    expect(await codeOf({ ...body, fromTime: '01:30', toTime: '01:45', fromRepeatedTime: 'later', toRepeatedTime: 'earlier' })).toBe('RANGE_END_BEFORE_START');
  });

  it('"Which clock?" (D-082/D-086/D-090): applied once for the range date, the same clock at both ends', async () => {
    const body = { date: '1943-07-15', fromTime: '06:00', toTime: '07:00', place: CHENNAI };
    const war = (await range(body)).json;
    expect(war.clock).toMatchObject({ source: 'clockRule', id: 'war', chosen: false, utcOffsetSeconds: 23_400 });
    expect([war.range.from.utc, war.range.to.utc]).toEqual(['1943-07-14T23:30:00Z', '1943-07-15T00:30:00Z']);
    expect(war.clockQuestion).toMatchObject({ applies: true, defaultClock: 'war' });
    const ist = (await range({ ...body, clock: 'ist' })).json;
    expect(ist.clock).toMatchObject({ source: 'clockRule', id: 'ist', chosen: true, utcOffsetSeconds: 19_800 });
    expect(ist.range.from.utc).toBe('1943-07-15T00:30:00Z');
    expect(ist.segments[0]!.fromLocal).toBe('1943-07-15 06:00:00');
    expect(await codeOf({ ...body, clock: 'bombay' })).toBe('INVALID_CLOCK_CHOICE');
    expect(await codeOf({ ...A1, clock: 'ist' })).toBe('INVALID_CLOCK_CHOICE'); // no question in 1992
  });

  it('manual entry: the typed offset at both ends, never a first/second marker', async () => {
    const { json } = await range({ date: '2001-10-27', fromTime: '20:00', toTime: '06:00', manual: { lat: 40.733333, lng: -74.166667, utcOffsetSeconds: -14_400 } });
    expect(json.clock).toMatchObject({ source: 'manual', utcOffsetSeconds: -14_400 });
    expect(json.range.seconds).toBe(36_000);
    expect(JSON.stringify(json)).not.toMatch(/RepeatedLocalTime|repeatedLocalTime/);
  });
});

describe('error codes', () => {
  it.each([
    ['not JSON', '{', true, 'INVALID_REQUEST'],
    ['not an object', '[1]', true, 'INVALID_REQUEST'],
    ['settings not an object', { ...A1, settings: 'x' }, false, 'INVALID_REQUEST'],
    ['bad date', { ...A1, date: '1992-02-30' }, false, 'INVALID_DATE'],
    ['date before 1800', { ...A1, date: '1799-12-31' }, false, 'DATE_OUT_OF_RANGE'],
    ['1800-01-01 early in India (before the ephemeris files start)', { ...A1, date: '1800-01-01', fromTime: '00:00', toTime: '01:00' }, false, 'DATE_OUT_OF_RANGE'],
    ['bad from time', { ...A1, fromTime: '6 am' }, false, 'INVALID_TIME'],
    ['missing to time', { date: A1.date, fromTime: '06:00', place: CHENNAI }, false, 'INVALID_TIME'],
    ['no place', { date: A1.date, fromTime: '06:00', toTime: '07:00' }, false, 'MISSING_PLACE'],
    ['place and manual', { ...A1, manual: { lat: 1, lng: 1, utcOffsetSeconds: 0 } }, false, 'INVALID_PLACE'],
    ['place latitude out of range', { ...A1, place: { ...CHENNAI, lat: 95 } }, false, 'INVALID_LOCATION'],
    ['unknown time zone', { ...A1, place: { ...CHENNAI, countryCode: 'LK', timeZone: 'Mars/Base' } }, false, 'INVALID_TIME_ZONE'],
    ['manual offset not whole seconds', { date: A1.date, fromTime: '06:00', toTime: '07:00', manual: { lat: 1, lng: 1, utcOffsetSeconds: 1.5 } }, false, 'INVALID_UTC_OFFSET'],
    ['unknown clock', { ...A1, clock: 'mars' }, false, 'INVALID_CLOCK_CHOICE'],
    ['polar latitude', { date: A1.date, fromTime: '06:00', toTime: '07:00', manual: { lat: 69.65, lng: 18.96, utcOffsetSeconds: 3600 } }, false, 'POLAR_LATITUDE'],
  ])('%s', async (_name, body, raw, code) => {
    const { res, json, text } = await range(body, raw);
    expect(res.status).toBe(400);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(json).toEqual({ error: { code } });
    // An error body never contains any part of the request.
    for (const leak of ['1992', '06:00', 'Kolkata', '13.08', '69.65', 'Mars']) expect(text).not.toContain(leak);
  });

  it('settings errors name only the setting', async () => {
    expect((await range({ ...A1, settings: { ayanamsa: 'raman' } })).json).toEqual({ error: { code: 'SETTING_NOT_SUPPORTED', setting: 'ayanamsa' } });
    expect((await range({ ...A1, settings: { colour: 'red' } })).json).toEqual({ error: { code: 'UNKNOWN_SETTING', setting: 'colour' } });
  });

  it('a body over the limit is REQUEST_TOO_LARGE (413)', async () => {
    const { res, json } = await range({ ...A1, padding: 'x'.repeat(MAX_RANGE_BODY_BYTES) });
    expect(res.status).toBe(413);
    expect(json).toEqual({ error: { code: 'REQUEST_TOO_LARGE' } });
  });

  it('an unexpected failure is INTERNAL_ERROR and logs only the error class and code, never the message', async () => {
    const res = await handleRangeRequest(post(A1), {
      ephemeris: () => { throw Object.assign(new Error('1992-08-14 06:00 Chennai secret'), { name: 'BoomError', code: 'BOOM' }); },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'INTERNAL_ERROR' } });
    const errorSpy = spies[3]!;
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]).toEqual(['[range] internal error: BoomError BOOM']);
    errorSpy.mockClear(); // the afterEach check is for unexpected logging only
  });
});
