// Range endpoint logic (step 0.3.6; FR-APX-01…03, FR-API-03; D-107, D-111).
//
// Input: a place (or manual entry) and settings exactly as for the chart, the local date, and a local
// "from" and "to" clock time. Output: the engine's approximate-time scan (events, segments, certain
// values, dasha ranges) with the local clock time added to every event, segment and dasha stretch.
//
// RANGE RULES (D-111), all on the birth date's local clock:
//   - "to" earlier than "from" ends on the next date (20:00–06:00 is 10 hours);
//   - "to" equal to "from" is RANGE_SAME_TIME (use the exact time instead);
//   - at least 1 minute (RANGE_TOO_SHORT); at most 24 hours, which the input itself guarantees;
//   - the whole day is 00:00 to 24:00 ("24:00" is accepted only as "to").
// The scan then covers the REAL elapsed time between the two ends (D-107 item 3): a range across a
// clock change may be an hour shorter or longer than its clock length, and every moment of it is scanned.
//
// THE CLOCK: the "Which clock?" rule is applied once, for the range's date, and the same clock is used
// for both ends (it is one family's record of one birth, kept on one clock). With a place outside every
// rule window, both ends go through the place's IANA zone, so a daylight-saving change at either end or
// in between is handled; an end in a skipped hour is NONEXISTENT_LOCAL_TIME, an end in a repeated hour
// is AMBIGUOUS_LOCAL_TIME unless fromRepeatedTime / toRepeatedTime says which.
//
// Nothing here logs, stores or echoes back any part of the request in an error (FR-API-02, D-014).

import {
  ChartInputError,
  EphemerisError,
  ENGINE_VERSION,
  localToUtc,
  scanTimeRange,
  TimeError,
  TimeRangeError,
  utcToLocal,
  type BirthZone,
  type DashaStretch,
  type EphemerisAdapter,
  type EphemerisInfo,
  type Settings,
  type TimeRangeEvent,
  type TimeRangeSegment,
  type TimeValueId,
} from '@jathag/engine';
import {
  API_VERSION,
  checkDate,
  checkRepeatedTime,
  checkSettingsField,
  checkTime,
  EPHEMERIS_EDGE_BEFORE,
  isJsonObject,
  parsePlaceFields,
  resolveApiSettings,
  resolvePlaceClock,
  TIME_ERRORS,
  type ChartResponse,
  type PlaceRequest,
} from './chart.ts';
import type { ClockQuestion } from './clock.ts';
import { ApiError } from './errors.ts';

/** Shortest allowed range in local clock seconds (D-111). */
export const MIN_RANGE_SECONDS = 60;

export interface RangeRequest extends PlaceRequest {
  /** "YYYY-MM-DD": the local date of the range's start. */
  date: string;
  /** "HH:MM" or "HH:MM:SS", local clock. */
  fromTime: string;
  /** "HH:MM" or "HH:MM:SS", or "24:00" / "24:00:00" for the end of the day. Earlier than fromTime = next date. */
  toTime: string;
  /** Only when fromTime is a clock time that happened twice. */
  fromRepeatedTime?: 'earlier' | 'later';
  /** Only when toTime is a clock time that happened twice. */
  toRepeatedTime?: 'earlier' | 'later';
  settings?: Partial<Settings>;
}

/** A local clock time "YYYY-MM-DD HH:MM:SS"; `repeated` only inside an hour that happened twice. */
export interface LocalStamp {
  local: string;
  repeatedLocalTime?: 'first' | 'second';
}

export interface RangeEnd {
  /** The local date and clock time, as sent (normalised to HH:MM:SS; "24:00" becomes 00:00:00 of the next date). */
  date: string;
  time: string;
  utc: string;
  utcOffsetSeconds: number;
}

export interface RangeResponse {
  apiVersion: number;
  engineVersion: string;
  settings: Settings;
  place: ChartResponse['place'];
  /** As in the chart response; utcOffsetSeconds is the one at the start (see range.to for the end). */
  clock: ChartResponse['clock'];
  clockQuestion: ClockQuestion;
  ephemeris: EphemerisInfo;
  range: {
    from: RangeEnd;
    to: RangeEnd;
    /** Real elapsed seconds between the two ends (both included in the scan). */
    seconds: number;
    /** Length on the local clock, in seconds (what the D-111 rules apply to). */
    clockSeconds: number;
  };
  events: (TimeRangeEvent & LocalStamp)[];
  segments: (TimeRangeSegment & { fromLocal: string; toLocal: string; fromRepeatedLocalTime?: 'first' | 'second'; toRepeatedLocalTime?: 'first' | 'second' })[];
  certain: TimeValueId[];
  dasha: (DashaStretch & { fromLocal: string; toLocal: string; fromRepeatedLocalTime?: 'first' | 'second'; toRepeatedLocalTime?: 'first' | 'second' })[];
}

const fail = (code: ApiError['code']): never => {
  throw new ApiError(code);
};

/** checkTime, plus "24:00" / "24:00:00" when allowed (the end of the range only). */
function checkRangeTime(v: unknown, allowEndOfDay: boolean): string {
  if (allowEndOfDay && (v === '24:00' || v === '24:00:00')) return '24:00:00';
  const t = checkTime(v);
  return t.length === 5 ? `${t}:00` : t;
}

const secondsOfDay = (t: string) => {
  const [h, m, s] = t.split(':').map(Number);
  return h! * 3600 + m! * 60 + s!;
};

/** The next calendar date, "YYYY-MM-DD" (dates are already validated). */
function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(0);
  t.setUTCFullYear(y!, m! - 1, d! + 1); // day 32 etc. rolls over into the next month/year

  return `${String(t.getUTCFullYear()).padStart(4, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** Validates the request body. Throws ApiError with a code; never includes any input. */
export function parseRangeRequest(body: unknown): RangeRequest {
  if (!isJsonObject(body)) return fail('INVALID_REQUEST');
  const date = checkDate(body.date);
  const fromTime = checkRangeTime(body.fromTime, false);
  const toTime = checkRangeTime(body.toTime, true);
  const req: RangeRequest = { date, fromTime, toTime, ...parsePlaceFields(body) };
  const fr = checkRepeatedTime(body.fromRepeatedTime);
  const tr = checkRepeatedTime(body.toRepeatedTime);
  if (fr) req.fromRepeatedTime = fr;
  if (tr) req.toRepeatedTime = tr;
  const settings = checkSettingsField(body.settings);
  if (settings) req.settings = settings;
  return req;
}

export interface RangeOptions {
  ephemeris?: EphemerisAdapter;
  /** If given, the milliseconds spent scanning are written to `timing.scan` (Server-Timing). */
  timing?: Record<string, number>;
}

/** Validated request → full response. Throws ApiError (expected problems) or anything else (bugs). */
export function calculateRangeResponse(req: RangeRequest, options: RangeOptions = {}): RangeResponse {
  const settings = resolveApiSettings(req.settings);

  // D-111 range rules, on the local clock.
  const a = secondsOfDay(req.fromTime);
  const b = secondsOfDay(req.toTime);
  if (a === b) fail('RANGE_SAME_TIME');
  const clockSeconds = b > a ? b - a : b + 86_400 - a;
  if (clockSeconds < MIN_RANGE_SECONDS) fail('RANGE_TOO_SHORT');
  const endOnNextDate = b < a || b === 86_400;
  const toDate = endOnNextDate ? nextDate(req.date) : req.date;
  const toTime = b === 86_400 ? '00:00:00' : req.toTime;

  // One clock for both ends, from the range's date (see the top of the file).
  const { place, zone, clock, question } = resolvePlaceClock(req);

  const toUtc = (date: string, time: string, repeatedTime?: 'earlier' | 'later') => {
    try {
      return localToUtc({ date, time, zone, ...(repeatedTime ? { repeatedTime } : {}) });
    } catch (e) {
      if (e instanceof TimeError) throw new ApiError(TIME_ERRORS[e.code]);
      throw e;
    }
  };
  const start = toUtc(req.date, req.fromTime, req.fromRepeatedTime);
  const end = toUtc(toDate, toTime, req.toRepeatedTime);
  clock.utcOffsetSeconds = start.utcOffsetSeconds;
  if (clock.source === 'timeZone') clock.tzdataVersion = start.tzdataVersion;
  const startMs = Date.parse(start.utc);
  const endMs = Date.parse(end.utc);
  if (endMs === startMs) fail('RANGE_SAME_TIME');
  if (endMs < startMs) fail('RANGE_END_BEFORE_START');

  let scan;
  const t0 = performance.now();
  try {
    scan = scanTimeRange(
      { fromUtc: start.utc, toUtc: end.utc, lat: place.lat, lng: place.lng },
      { settings, ...(options.ephemeris ? { ephemeris: options.ephemeris } : {}) },
    );
  } catch (e) {
    if (e instanceof ChartInputError) throw new ApiError('INVALID_LOCATION');
    if (e instanceof TimeRangeError && e.code === 'POLAR_LATITUDE') throw new ApiError('POLAR_LATITUDE');
    if (e instanceof EphemerisError && e.code === 'EPHEMERIS_FALLBACK' && start.utc < EPHEMERIS_EDGE_BEFORE) throw new ApiError('DATE_OUT_OF_RANGE');
    throw e;
  }
  if (options.timing) options.timing.scan = performance.now() - t0;

  const stamp = localStamper(zone);
  const span = (from: string, to: string) => {
    const f = stamp(from);
    const t = stamp(to);
    return {
      fromLocal: f.local,
      ...(f.repeatedLocalTime ? { fromRepeatedLocalTime: f.repeatedLocalTime } : {}),
      toLocal: t.local,
      ...(t.repeatedLocalTime ? { toRepeatedLocalTime: t.repeatedLocalTime } : {}),
    };
  };

  return {
    apiVersion: API_VERSION,
    engineVersion: ENGINE_VERSION,
    settings,
    place,
    clock,
    clockQuestion: question,
    ephemeris: scan.meta.ephemeris,
    range: {
      from: { date: req.date, time: req.fromTime, utc: start.utc, utcOffsetSeconds: start.utcOffsetSeconds },
      to: { date: toDate, time: toTime, utc: end.utc, utcOffsetSeconds: end.utcOffsetSeconds },
      seconds: scan.meta.seconds,
      clockSeconds,
    },
    events: scan.events.map((e) => ({ utc: e.utc, ...stamp(e.utc), changes: e.changes })),
    segments: scan.segments.map((s) => ({ from: s.from, to: s.to, ...span(s.from, s.to), ls: s.ls, ln: s.ln, ld9: s.ld9, ms: s.ms, mn: s.mn, mp: s.mp })),
    certain: scan.certain,
    dasha: scan.dasha.map((d) => ({ from: d.from, to: d.to, ...span(d.from, d.to), moonNakshatra: d.moonNakshatra, lordAtBirth: d.lordAtBirth, mahadashas: d.mahadashas, antardashas: d.antardashas })),
  };
}

/** UTC → local clock stamp for the zone used, with first/second only inside a repeated hour. Cached per instant. */
function localStamper(zone: BirthZone): (utc: string) => LocalStamp {
  const cache = new Map<string, LocalStamp>();
  return (utc) => {
    let s = cache.get(utc);
    if (!s) {
      const l = utcToLocal(utc, zone);
      s = l.repeated ? { local: l.local, repeatedLocalTime: l.repeated } : { local: l.local };
      cache.set(utc, s);
    }
    return s;
  };
}
