// Chart and place-search endpoint logic (step 0.2.12): validation codes, privacy, headers.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaceIndex } from '@jathag/places';
import { handleChartRequest, handleSearchRequest, MAX_CHART_BODY_BYTES, type ChartResponse, type SearchResponse } from '../src/index.ts';

const ROOT = join(import.meta.dirname, '../../..');

const CHENNAI = {
  geonameId: 1264527, lat: 13.083333, lng: 80.283333, timeZone: 'Asia/Kolkata',
  countryCode: 'IN', admin1Code: '25', admin2Code: '603',
};
const NEW_YORK = {
  geonameId: 5128581, lat: 40.71427, lng: -74.00597, timeZone: 'America/New_York',
  countryCode: 'US', admin1Code: 'NY', admin2Code: '',
};
const BASE = { date: '1992-08-14', time: '06:45', place: CHENNAI };

const post = (body: unknown, raw = false) => new Request('http://localhost/api/chart', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: raw ? (body as string) : JSON.stringify(body),
});
async function chart(body: unknown, raw = false) {
  const res = await handleChartRequest(post(body, raw));
  return { res, text: await res.clone().text(), json: await res.json() as ChartResponse & { error?: { code: string; setting?: string } } };
}

// Nothing may be written to the console by the endpoints for a normal or a rejected request.
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

describe('chart: a normal birth', () => {
  it('returns the chart with stable IDs and everything 0.2.13 needs', async () => {
    const { res, json } = await chart(BASE);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('server-timing')).toMatch(/transits;dur=[\d.]+, calc;dur=[\d.]+, cpu;dur=[\d.]+, total;dur=[\d.]+/);
    expect(json.apiVersion).toBe(1);
    expect(json.engineVersion).toBe('0.3.0');
    expect(json.settings).toEqual({ ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign', dashaYear: '365.25' });
    expect(json.place).toEqual({ kind: 'search', ...CHENNAI });
    expect(json.clock).toEqual({ source: 'timeZone', id: null, chosen: false, utcOffsetSeconds: 19800, timeZone: 'Asia/Kolkata', tzdataVersion: process.versions.tz });
    expect(json.utc).toBe('1992-08-14T01:15:00Z');
    expect(json.clockQuestion).toEqual({ applies: false, windows: [], options: [], defaultClock: null });
    expect(Object.keys(json.chart.bodies)).toEqual(['La', 'Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']);
    expect(json.chart.houses).toHaveLength(12);
    expect(json.chart.meta.input).toEqual({ utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 });
    // No English names anywhere in the chart (D-063): only numbers, codes and booleans
    expect(JSON.stringify(json.chart.bodies)).not.toMatch(/Aries|Ashwini|Sun|Moon/);
  });

  it('HH:MM:SS works; extra unknown fields are ignored; settings can be sent explicitly', async () => {
    const { json } = await chart({ ...BASE, time: '06:45:30', settings: { ayanamsa: 'lahiri', node: 'mean' }, extra: 1 });
    expect(json.utc).toBe('1992-08-14T01:15:30Z');
  });

  it('manual entry (FR-IN-07): lat, lng and an offset in seconds; never a clock question', async () => {
    const { res, json } = await chart({ date: '1943-07-15', time: '11:30', manual: { lat: 28.616667, lng: 77.216667, utcOffsetSeconds: 23400 } });
    expect(res.status).toBe(200);
    expect(json.place).toEqual({ kind: 'manual', lat: 28.616667, lng: 77.216667, utcOffsetSeconds: 23400 });
    expect(json.clock).toEqual({ source: 'manual', id: null, chosen: false, utcOffsetSeconds: 23400, timeZone: null, tzdataVersion: null });
    expect(json.utc).toBe('1943-07-15T05:00:00Z');
    expect(json.clockQuestion.applies).toBe(false);
  });

  it('a birth in a clock window: default clock, and the question for the form', async () => {
    const { json } = await chart({ date: '1943-07-15', time: '11:30', place: { ...CHENNAI } });
    expect(json.clock).toMatchObject({ source: 'clockRule', id: 'war', chosen: false, utcOffsetSeconds: 23400 });
    expect(json.utc).toBe('1943-07-15T05:00:00Z');
    expect(json.clockQuestion).toEqual({
      applies: true, windows: ['war-1942-1945'], defaultClock: 'war',
      options: [{ id: 'war', utcOffsetSeconds: 23400 }, { id: 'ist', utcOffsetSeconds: 19800 }],
    });
    const ist = await chart({ date: '1943-07-15', time: '11:30', place: CHENNAI, clock: 'ist' });
    expect(ist.json.clock).toMatchObject({ id: 'ist', chosen: true, utcOffsetSeconds: 19800 });
    expect(ist.json.utc).toBe('1943-07-15T06:00:00Z');
  });

  it('a clock time that happened twice: error without earlier/later, then each answer', async () => {
    const amb = await chart({ date: '2021-11-07', time: '01:30', place: NEW_YORK });
    expect(amb.res.status).toBe(400);
    expect(amb.json).toEqual({ error: { code: 'AMBIGUOUS_LOCAL_TIME' } });
    expect((await chart({ date: '2021-11-07', time: '01:30', place: NEW_YORK, repeatedTime: 'earlier' })).json.utc).toBe('2021-11-07T05:30:00Z');
    expect((await chart({ date: '2021-11-07', time: '01:30', place: NEW_YORK, repeatedTime: 'later' })).json.utc).toBe('2021-11-07T06:30:00Z');
  });

  it('range edges: 1800-01-01 west of Greenwich and 2100-12-31 work', async () => {
    expect((await chart({ date: '1800-01-01', time: '00:00', manual: { lat: 40.7, lng: -74, utcOffsetSeconds: -17760 } })).res.status).toBe(200);
    expect((await chart({ date: '2100-12-31', time: '23:59:59', place: CHENNAI })).res.status).toBe(200);
  });
});

describe('chart: errors are codes only and never echo the request', () => {
  const cases: [string, unknown, string, number?][] = [
    ['not JSON', '{"date": "1992-', 'INVALID_REQUEST'],
    ['JSON array', [], 'INVALID_REQUEST'],
    ['JSON null', null, 'INVALID_REQUEST'],
    ['date missing', { time: '06:45', place: CHENNAI }, 'INVALID_DATE'],
    ['date as a number', { ...BASE, date: 19920814 }, 'INVALID_DATE'],
    ['date in another format', { ...BASE, date: '14/08/1992' }, 'INVALID_DATE'],
    ['impossible date 30 Feb', { ...BASE, date: '1992-02-30' }, 'INVALID_DATE'],
    ['impossible date 29 Feb 1900 (not a leap year)', { ...BASE, date: '1900-02-29' }, 'INVALID_DATE'],
    ['month 13', { ...BASE, date: '1992-13-01' }, 'INVALID_DATE'],
    ['before 1800', { ...BASE, date: '1799-12-31' }, 'DATE_OUT_OF_RANGE'],
    ['after 2100', { ...BASE, date: '2101-01-01' }, 'DATE_OUT_OF_RANGE'],
    ['1800-01-01 early in India (just before the ephemeris files start)', { ...BASE, date: '1800-01-01', time: '05:00' }, 'DATE_OUT_OF_RANGE'],
    ['time missing', { date: '1992-08-14', place: CHENNAI }, 'INVALID_TIME'],
    ['time 24:00', { ...BASE, time: '24:00' }, 'INVALID_TIME'],
    ['time 06:60', { ...BASE, time: '06:60' }, 'INVALID_TIME'],
    ['time 6:45 (one digit)', { ...BASE, time: '6:45' }, 'INVALID_TIME'],
    ['time with seconds 61', { ...BASE, time: '06:45:61' }, 'INVALID_TIME'],
    ['time that did not exist (clocks jumped forward)', { date: '2021-03-14', time: '02:30', place: NEW_YORK }, 'NONEXISTENT_LOCAL_TIME'],
    ['no place and no manual entry', { date: '1992-08-14', time: '06:45' }, 'MISSING_PLACE'],
    ['place null', { ...BASE, place: null }, 'MISSING_PLACE'],
    ['both place and manual', { ...BASE, manual: { lat: 1, lng: 1, utcOffsetSeconds: 0 } }, 'INVALID_PLACE'],
    ['place is a string', { ...BASE, place: 'Chennai' }, 'INVALID_PLACE'],
    ['place without time zone', { ...BASE, place: { ...CHENNAI, timeZone: undefined } }, 'INVALID_PLACE'],
    ['place with empty time zone', { ...BASE, place: { ...CHENNAI, timeZone: '' } }, 'INVALID_TIME_ZONE'],
    ['place with unknown time zone', { ...BASE, place: { ...CHENNAI, timeZone: 'Asia/Chennai' } }, 'INVALID_TIME_ZONE'],
    ['place with lowercase country', { ...BASE, place: { ...CHENNAI, countryCode: 'in' } }, 'INVALID_PLACE'],
    ['place without admin codes', { ...BASE, place: { ...CHENNAI, admin1Code: undefined } }, 'INVALID_PLACE'],
    ['place with bad geonameId', { ...BASE, place: { ...CHENNAI, geonameId: -5 } }, 'INVALID_PLACE'],
    ['latitude 91', { ...BASE, place: { ...CHENNAI, lat: 91 } }, 'INVALID_LOCATION'],
    ['longitude -181 (manual)', { date: '1992-08-14', time: '06:45', manual: { lat: 0, lng: -181, utcOffsetSeconds: 0 } }, 'INVALID_LOCATION'],
    ['latitude as text', { ...BASE, place: { ...CHENNAI, lat: '13.08' } }, 'INVALID_PLACE'],
    ['manual offset not whole seconds', { date: '1992-08-14', time: '06:45', manual: { lat: 13, lng: 80, utcOffsetSeconds: 19800.5 } }, 'INVALID_UTC_OFFSET'],
    ['manual offset over 18 h', { date: '1992-08-14', time: '06:45', manual: { lat: 13, lng: 80, utcOffsetSeconds: 18 * 3600 + 1 } }, 'INVALID_UTC_OFFSET'],
    ['manual offset missing', { date: '1992-08-14', time: '06:45', manual: { lat: 13, lng: 80 } }, 'INVALID_UTC_OFFSET'],
    ['unknown clock id', { ...BASE, clock: 'madras' }, 'INVALID_CLOCK_CHOICE'],
    ['clock when no question applies', { ...BASE, clock: 'ist' }, 'INVALID_CLOCK_CHOICE'],
    ['clock not offered for this birth', { date: '1938-05-10', time: '09:15', place: CHENNAI, clock: 'bombay' }, 'INVALID_CLOCK_CHOICE'],
    ['clock with manual entry', { date: '1943-07-15', time: '11:30', manual: { lat: 13, lng: 80, utcOffsetSeconds: 19800 }, clock: 'war' }, 'INVALID_CLOCK_CHOICE'],
    ['repeatedTime not earlier/later', { ...BASE, repeatedTime: 'first' }, 'INVALID_REPEATED_TIME'],
    ['settings not an object', { ...BASE, settings: 'lahiri' }, 'INVALID_REQUEST'],
    ['body over 4 KB', { ...BASE, padding: 'x'.repeat(MAX_CHART_BODY_BYTES) }, 'REQUEST_TOO_LARGE', 413],
  ];

  it.each(cases)('%s → %s', async (_name, body, code, status = 400) => {
    const raw = typeof body === 'string';
    const { res, json, text } = await chart(body, raw);
    expect(res.status).toBe(status);
    expect(json).toEqual({ error: { code } });
    expect(res.headers.get('cache-control')).toBe('no-store');
    // Nothing from the request comes back: no date, time, coordinates or zone
    for (const bit of ['1992', '06:45', '13.08', '80.28', 'Asia/', 'Chennai', 'madras', 'first', '19800']) {
      expect(text, bit).not.toContain(bit);
    }
  });

  it('settings errors name the setting (a key, not birth data)', async () => {
    expect((await chart({ ...BASE, settings: { node: 'true' } })).json).toEqual({ error: { code: 'SETTING_NOT_SUPPORTED', setting: 'node' } });
    expect((await chart({ ...BASE, settings: { colour: 'red' } })).json).toEqual({ error: { code: 'UNKNOWN_SETTING', setting: 'colour' } });
  });
});

describe('chart: dashas (step 0.3.1)', () => {
  const AS_OF = '2026-11-22T10:00:00.000Z';
  const withAsOf = async (body: unknown, asOf = AS_OF) => {
    const res = await handleChartRequest(post(body), { asOf: () => asOf });
    return { res, text: await res.clone().text(), json: await res.json() as ChartResponse & { error?: { code: string; setting?: string } } };
  };

  it('full timeline, current period and coming up for the given moment', async () => {
    const { res, json } = await withAsOf(BASE);
    expect(res.status).toBe(200);
    const d = json.dashas;
    expect(Object.keys(d)).toEqual(['asOf', 'vimshottari', 'current', 'next']);
    expect(d.asOf).toBe(AS_OF);
    expect(d.vimshottari.mahadashas).toHaveLength(9);
    expect(d.vimshottari.mahadashas.flatMap((m) => m.antardashas)).toHaveLength(81);
    expect(d.vimshottari.mahadashas.flatMap((m) => m.antardashas.flatMap((a) => a.pratyantardashas))).toHaveLength(729);
    expect(d.vimshottari.birthUtc).toBe(json.utc);
    expect(d.vimshottari.dashaYear).toBe('365.25');
    // R01: Mars mahadasha from 1986 (JHora), Rahu from 1993, Jupiter from 2011 → Jupiter is running in 2026.
    expect(d.vimshottari.mahadashas[0]).toMatchObject({ lord: 'Ma', containsBirth: true, endedBeforeBirth: false });
    expect(d.current.mahadasha?.lord).toBe('Ju');
    expect(d.current.antardasha?.path.slice(0, 1)).toEqual(d.current.mahadasha?.path);
    for (const level of ['mahadasha', 'antardasha', 'pratyantardasha'] as const) {
      expect(Date.parse(d.current[level]!.start)).toBeLessThanOrEqual(Date.parse(AS_OF));
      expect(Date.parse(d.current[level]!.end)).toBeGreaterThan(Date.parse(AS_OF));
      expect(d.next[level]!.start).toBe(d.current[level]!.end);
    }
    // Positions are unchanged by the new section.
    expect(json.chart.bodies.Mo.nakshatra).toBe(d.vimshottari.moonNakshatra);
  });

  it('same request + same asOf → byte-identical response body (NFR-DET-01)', async () => {
    const a = await withAsOf(BASE);
    const b = await withAsOf(BASE);
    expect(b.text).toBe(a.text);
    const other = await withAsOf(BASE, '2040-01-01T00:00:00.000Z');
    expect(other.json.dashas.vimshottari).toEqual(a.json.dashas.vimshottari);
    expect(other.json.dashas.current).not.toEqual(a.json.dashas.current);
  });

  it('without an asOf option the endpoint uses the time the request arrived', async () => {
    const before = Date.now();
    const { json } = await chart(BASE);
    const t = Date.parse(json.dashas.asOf);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(Date.now());
  });

  it('dasha year setting: 360 and 365.2422 accepted and echoed; anything else refused with the setting name', async () => {
    for (const dashaYear of ['365.25', '360', '365.2422']) {
      const { res, json } = await withAsOf({ ...BASE, settings: { dashaYear } });
      expect(res.status).toBe(200);
      expect(json.settings.dashaYear).toBe(dashaYear);
      expect(json.chart.meta.settings.dashaYear).toBe(dashaYear);
      expect(json.dashas.vimshottari.dashaYear).toBe(dashaYear);
    }
    for (const bad of [360, '365', 'true-sidereal']) {
      expect((await withAsOf({ ...BASE, settings: { dashaYear: bad } })).json).toEqual({ error: { code: 'SETTING_NOT_SUPPORTED', setting: 'dashaYear' } });
    }
  });

  it('keeps the clock information 0.3.7 needs to show dates on the birth place\'s clock (D-097)', async () => {
    const { json } = await withAsOf({ date: '1943-07-15', time: '11:30', place: { ...CHENNAI } });
    expect(json.clock).toMatchObject({ source: 'clockRule', id: 'war', utcOffsetSeconds: 23400 });
    expect((await withAsOf(BASE)).json.clock).toMatchObject({ utcOffsetSeconds: 19800, timeZone: 'Asia/Kolkata' });
  });
});

describe('chart: an unexpected failure', () => {
  it('returns INTERNAL_ERROR and logs only the error class and code, never the message', async () => {
    const res = await handleChartRequest(post(BASE), {
      ephemeris: () => { throw Object.assign(new Error('1992-08-14 06:45 Chennai secret'), { name: 'BoomError', code: 'BOOM' }); },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'INTERNAL_ERROR' } });
    const errorSpy = spies[3]!;
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]).toEqual(['[chart] internal error: BoomError BOOM']);
    errorSpy.mockClear(); // the afterEach check is for unexpected logging only
  });
});

describe('place search endpoint', () => {
  let index: PlaceIndex;
  let loads = 0;
  beforeAll(() => {
    index = new PlaceIndex(gunzipSync(readFileSync(join(ROOT, 'data/places/index/places.tsv.gz'))).toString('utf8'));
  });
  const search = async (body: unknown, raw = false) => {
    const res = await handleSearchRequest(
      new Request('http://localhost/api/places/search', { method: 'POST', body: raw ? (body as string) : JSON.stringify(body) }),
      { index: () => { loads++; return { index, loadMs: loads === 1 ? 812 : null }; } },
    );
    return { res, text: await res.clone().text(), json: await res.json() as SearchResponse & { error?: { code: string } } };
  };

  it('returns up to 10 suggestions in exactly the order packages/places gives', async () => {
    const { res, json } = await search({ query: 'che' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(json.results).toHaveLength(10);
    expect(json.results.map((r) => r.geonameId)).toEqual(index.search('che').map((p) => p.id));
    expect(json.results[0]).toEqual({
      label: 'Chennai, Tamil Nadu, India', geonameId: 1264527, lat: 13.08784, lng: 80.27847, timeZone: 'Asia/Kolkata',
      countryCode: 'IN', admin1Code: '25', admin2Code: '603', featureCode: 'PPLA',
    });
  });

  it('old names, commas and the first-load timing', async () => {
    expect((await search({ query: 'Bombay' })).json.results[0]!.label).toBe('Mumbai, Maharashtra, India');
    expect((await search({ query: 'aurangabad, bihar' })).json.results[0]!.label).toMatch(/Bihar, India$/);
  });

  it('under 3 characters: empty list', async () => {
    for (const query of ['', 'c', 'ch', '  ch  ']) expect((await search({ query })).json).toEqual({ results: [] });
  });

  it('a search result can be sent straight to the chart endpoint', async () => {
    const place = (await search({ query: 'Kumbakonam' })).json.results[0]!;
    const { res, json } = await chart({ date: '1992-08-14', time: '06:45', place });
    expect(res.status).toBe(200);
    expect(json.place).toMatchObject({ kind: 'search', geonameId: place.geonameId, lat: place.lat });
  });

  it.each([
    ['not JSON', 'che', 'INVALID_REQUEST', 400],
    ['no query', {}, 'INVALID_REQUEST', 400],
    ['query not text', { query: 123 }, 'INVALID_REQUEST', 400],
    ['query over 100 characters', { query: 'mumbai'.repeat(20) }, 'INVALID_REQUEST', 400],
    ['body over 1 KB', { query: 'che', pad: 'kumbakonam'.repeat(200) }, 'REQUEST_TOO_LARGE', 413],
  ] as const)('%s → %s, without echoing the query', async (_name, body, code, status) => {
    const { res, json, text } = await search(body, typeof body === 'string');
    expect(res.status).toBe(status);
    expect(json).toEqual({ error: { code } });
    for (const bit of ['che', 'mumbai', 'kumbakonam', '123']) expect(text).not.toContain(bit);
  });
});

describe('chart: transits + Sade Sati (step 0.3.2)', () => {
  const AS_OF = '2026-11-22T10:00:00.000Z';
  const withAsOf = async (body: unknown, asOf = AS_OF) => {
    const res = await handleChartRequest(post(body), { asOf: () => asOf });
    return { res, text: await res.clone().text(), json: await res.json() as ChartResponse };
  };

  it('returns positions now, sign changes and Sade Sati for the same asOf as the dashas', async () => {
    const { res, json } = await withAsOf(BASE);
    expect(res.status).toBe(200);
    expect(Object.keys(json)).toEqual(['apiVersion', 'engineVersion', 'settings', 'place', 'clock', 'utc', 'clockQuestion', 'chart', 'dashas', 'transits']);
    const t = json.transits;
    expect(Object.keys(t)).toEqual(['asOf', 'natal', 'positions', 'signChanges', 'sadeSati']);
    expect(t.asOf).toBe(json.dashas.asOf);
    expect(Object.keys(t.positions)).toEqual(['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke']);
    expect(Object.keys(t.signChanges)).toEqual(['Sa', 'Ju', 'Ra', 'Ke']);
    expect(t.natal).toEqual({ moonSign: json.chart.bodies.Mo.sign, lagnaSign: json.chart.bodies.La.sign });
    // R01: Moon in Aquarius (11). A Sade Sati was already running at birth (from 1990); in 2026 Saturn
    // is in Pisces, the 2nd from the Moon: the setting phase of the 2020–2028 period.
    expect(t.sadeSati.moonSign).toBe(11);
    expect(t.sadeSati.periods[0]).toMatchObject({ startedBeforeBirth: true });
    expect(t.sadeSati.periods[0].start!.slice(0, 4)).toBe('1990');
    expect(t.sadeSati.status).toMatchObject({ phase: 'setting', saturn: { sign: 12, houseFromMoon: 2 } });
    expect(t.sadeSati.status.current!.start!.slice(0, 10)).toBe('2020-01-24');
    expect(t.sadeSati.status.next!.start!.slice(0, 4)).toBe('2049');
    expect(t.sadeSati.span).toEqual({ start: '1992-08-14T01:15:00Z', end: '2112-08-14T01:15:00Z' });
    // No English names (D-063) and nothing display-related
    expect(JSON.stringify(t)).not.toMatch(/Aries|Capricorn|Saturn|Ashwini|IST|\+05:30/);
  });

  it('same request + same asOf → byte-identical response body (NFR-DET-01); positions follow asOf', async () => {
    const a = await withAsOf(BASE);
    const b = await withAsOf(BASE);
    expect(b.text).toBe(a.text);
    const other = await withAsOf(BASE, '2030-01-01T00:00:00.000Z');
    expect(other.json.transits.sadeSati.periods).toEqual(a.json.transits.sadeSati.periods);
    expect(other.json.transits.positions.Mo.lon).not.toBe(a.json.transits.positions.Mo.lon);
  });

  it('the earliest and latest births work (1800 and 2100)', async () => {
    const early = await withAsOf({ date: '1800-01-02', time: '12:00', manual: { lat: 28.6, lng: 77.2, utcOffsetSeconds: 19800 } });
    expect(early.res.status).toBe(200);
    const late = await withAsOf({ date: '2100-12-31', time: '23:59', manual: { lat: 28.6, lng: 77.2, utcOffsetSeconds: 19800 } });
    expect(late.res.status).toBe(200);
    expect(late.json.transits.sadeSati.span.end.slice(0, 4)).toBe('2220');
  });
});
