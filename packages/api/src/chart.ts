// Chart endpoint logic (FR-API-01, FR-IN-02, FR-IN-07, FR-IN-08, FR-IN-09, FR-CALC-01…09).
//
// Input → validation → "Which clock?" rule → local time to UTC → engine chart.
// The place index is NOT loaded here: a place is described by the fields a search result returns,
// trusted the same way as manual entry, so this function stays small and fast.
// Nothing here logs, stores or echoes back any part of the request in an error (FR-API-02, D-014).

import {
  calculateChart,
  ChartInputError,
  EphemerisError,
  ENGINE_VERSION,
  localToUtc,
  resolveSettings,
  SettingsError,
  TimeError,
  type BirthZone,
  type Chart,
  type EphemerisAdapter,
  type Settings,
} from '@jathag/engine';
import { CLOCK_IDS, ClockChoiceError, resolveClock, type ClockId, type ClockQuestion, clockQuestion } from './clock.ts';
import { ApiError, type ApiErrorCode } from './errors.ts';

/** Bumped when the request or response shape changes in a way the form must know about. */
export const API_VERSION = 1;

/** FR-IN-02 (local birth date). */
export const MIN_DATE = '1800-01-01';
export const MAX_DATE = '2100-12-31';

/** A place as returned by the place search endpoint (only the fields the chart needs). */
export interface PlaceInput {
  geonameId: number;
  lat: number;
  lng: number;
  /** IANA time zone, e.g. "Asia/Kolkata". */
  timeZone: string;
  countryCode: string;
  admin1Code: string;
  admin2Code: string;
}

/** Manual entry (FR-IN-07). */
export interface ManualInput {
  lat: number;
  lng: number;
  utcOffsetSeconds: number;
}

export interface ChartRequest {
  /** "YYYY-MM-DD" (local date at the birth place). */
  date: string;
  /** "HH:MM" or "HH:MM:SS" (local clock time). */
  time: string;
  place?: PlaceInput;
  manual?: ManualInput;
  /** "Which clock?" answer; only for births where the question applies. */
  clock?: ClockId;
  /** Only for a clock time that happened twice (daylight saving ended). */
  repeatedTime?: 'earlier' | 'later';
  settings?: Partial<Settings>;
}

export interface ChartResponse {
  apiVersion: number;
  engineVersion: string;
  settings: Settings;
  /** The place used: a searched place's fields, or the manual coordinates and offset. */
  place:
    | ({ kind: 'search' } & PlaceInput)
    | ({ kind: 'manual' } & ManualInput);
  /** The clock used to turn the local time into UTC. */
  clock: {
    /** timeZone = the place's IANA zone; clockRule = "Which clock?" option; manual = typed offset. */
    source: 'timeZone' | 'clockRule' | 'manual';
    /** The clock option used (clockRule only). */
    id: ClockId | null;
    /** True when the option was sent by the client; false when it is the default. */
    chosen: boolean;
    utcOffsetSeconds: number;
    /** IANA zone (timeZone only). */
    timeZone: string | null;
    /** IANA database version (timeZone only). */
    tzdataVersion: string | null;
  };
  /** Birth instant, ISO 8601 UTC. */
  utc: string;
  /** The "Which clock?" question for this birth, so the form can show its note (0.2.13) or question (0.4.6). */
  clockQuestion: ClockQuestion;
  chart: Chart;
}

// ---------------------------------------------------------------- validation helpers

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (code: ApiErrorCode): never => { throw new ApiError(code); };

function str(v: unknown, code: ApiErrorCode, max = 64): string {
  if (typeof v !== 'string' || v.length > max) fail(code);
  return v as string;
}

function num(v: unknown, code: ApiErrorCode): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(code);
  return v as number;
}

/** Same as the engine's own check, done first so that the range check below sees a real date. */
function checkDate(date: unknown): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(date, 'INVALID_DATE', 10));
  if (!d) return fail('INVALID_DATE');
  const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const probe = new Date(Date.UTC(2000, m - 1, day));
  probe.setUTCFullYear(y);
  if (m < 1 || m > 12 || day < 1 || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== day) fail('INVALID_DATE');
  const s = date as string;
  if (s < MIN_DATE || s > MAX_DATE) fail('DATE_OUT_OF_RANGE');
  return s;
}

function checkTime(time: unknown): string {
  const t = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(str(time, 'INVALID_TIME', 8));
  if (!t || Number(t[1]) > 23 || Number(t[2]) > 59 || Number(t[3] ?? 0) > 59) fail('INVALID_TIME');
  return time as string;
}

function checkLatLng(o: Record<string, unknown>, code: ApiErrorCode): { lat: number; lng: number } {
  const lat = num(o.lat, code);
  const lng = num(o.lng, code);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) fail('INVALID_LOCATION');
  return { lat, lng };
}

function checkPlace(v: unknown): PlaceInput {
  if (!isObject(v)) return fail('INVALID_PLACE');
  const geonameId = num(v.geonameId, 'INVALID_PLACE');
  if (!Number.isSafeInteger(geonameId) || geonameId <= 0) fail('INVALID_PLACE');
  const { lat, lng } = checkLatLng(v, 'INVALID_PLACE');
  const timeZone = str(v.timeZone, 'INVALID_PLACE');
  if (timeZone === '') fail('INVALID_TIME_ZONE');
  const countryCode = str(v.countryCode, 'INVALID_PLACE', 2);
  if (!/^[A-Z]{2}$/.test(countryCode)) fail('INVALID_PLACE');
  const admin1Code = str(v.admin1Code, 'INVALID_PLACE', 20);
  const admin2Code = str(v.admin2Code, 'INVALID_PLACE', 80);
  return { geonameId, lat, lng, timeZone, countryCode, admin1Code, admin2Code };
}

function checkManual(v: unknown): ManualInput {
  if (!isObject(v)) return fail('INVALID_PLACE');
  const { lat, lng } = checkLatLng(v, 'INVALID_PLACE');
  const off = num(v.utcOffsetSeconds, 'INVALID_UTC_OFFSET');
  if (!Number.isInteger(off) || Math.abs(off) > 18 * 3600) fail('INVALID_UTC_OFFSET');
  return { lat, lng, utcOffsetSeconds: off };
}

/** Validates the request body. Throws ApiError with a code; never includes any input. */
export function parseChartRequest(body: unknown): ChartRequest {
  if (!isObject(body)) return fail('INVALID_REQUEST');
  const date = checkDate(body.date);
  const time = checkTime(body.time);

  const hasPlace = body.place !== undefined && body.place !== null;
  const hasManual = body.manual !== undefined && body.manual !== null;
  if (!hasPlace && !hasManual) fail('MISSING_PLACE');
  if (hasPlace && hasManual) fail('INVALID_PLACE');

  const req: ChartRequest = { date, time };
  if (hasPlace) req.place = checkPlace(body.place);
  else req.manual = checkManual(body.manual);

  if (body.clock !== undefined && body.clock !== null) {
    if (typeof body.clock !== 'string' || !(CLOCK_IDS as readonly string[]).includes(body.clock)) fail('INVALID_CLOCK_CHOICE');
    req.clock = body.clock as ClockId;
  }
  if (body.repeatedTime !== undefined && body.repeatedTime !== null) {
    if (body.repeatedTime !== 'earlier' && body.repeatedTime !== 'later') fail('INVALID_REPEATED_TIME');
    req.repeatedTime = body.repeatedTime as 'earlier' | 'later';
  }
  if (body.settings !== undefined && body.settings !== null) {
    if (!isObject(body.settings)) fail('INVALID_REQUEST');
    req.settings = body.settings as Partial<Settings>;
  }
  return req;
}

// ---------------------------------------------------------------- the calculation

const TIME_ERRORS: Record<TimeError['code'], ApiErrorCode> = {
  INVALID_DATE: 'INVALID_DATE',
  INVALID_TIME: 'INVALID_TIME',
  INVALID_TIME_ZONE: 'INVALID_TIME_ZONE',
  INVALID_UTC_OFFSET: 'INVALID_UTC_OFFSET',
  NONEXISTENT_LOCAL_TIME: 'NONEXISTENT_LOCAL_TIME',
  AMBIGUOUS_LOCAL_TIME: 'AMBIGUOUS_LOCAL_TIME',
};

/**
 * The Swiss Ephemeris data files in the engine start at about 1800-01-01 01:08 UTC (measured), so a
 * birth on 1 January 1800 east of Greenwich, early in the day, falls just before them. Those few
 * hours get DATE_OUT_OF_RANGE instead of an internal error. Any other ephemeris failure stays an
 * internal error (it would mean the data files are missing).
 */
const EPHEMERIS_EDGE_BEFORE = '1800-01-02T00:00:00Z';

export interface ChartOptions {
  /** Ephemeris adapter (the web app passes one with the deployed data-file path). */
  ephemeris?: EphemerisAdapter;
}

/** Validated request → full response. Throws ApiError (expected problems) or anything else (bugs). */
export function calculateChartResponse(req: ChartRequest, options: ChartOptions = {}): ChartResponse {
  let settings: Settings;
  try {
    settings = resolveSettings(req.settings as Partial<Record<keyof Settings, unknown>> | undefined);
  } catch (e) {
    if (e instanceof SettingsError) throw new ApiError(e.code, 400, e.setting);
    throw e;
  }

  let zone: BirthZone;
  let clock: ChartResponse['clock'];
  let question: ClockQuestion;
  let place: ChartResponse['place'];

  if (req.place) {
    place = { kind: 'search', ...req.place };
    let resolved;
    try {
      resolved = resolveClock(req.place, req.date, req.clock);
    } catch (e) {
      if (e instanceof ClockChoiceError) throw new ApiError('INVALID_CLOCK_CHOICE');
      throw e;
    }
    question = resolved.question;
    if (resolved.source === 'clockRule') {
      zone = { utcOffsetSeconds: resolved.utcOffsetSeconds };
      clock = {
        source: 'clockRule', id: resolved.id, chosen: resolved.chosen,
        utcOffsetSeconds: resolved.utcOffsetSeconds, timeZone: null, tzdataVersion: null,
      };
    } else {
      zone = { iana: req.place.timeZone };
      clock = { source: 'timeZone', id: null, chosen: false, utcOffsetSeconds: 0, timeZone: req.place.timeZone, tzdataVersion: null };
    }
  } else {
    const manual = req.manual!;
    if (req.clock !== undefined) throw new ApiError('INVALID_CLOCK_CHOICE');
    place = { kind: 'manual', ...manual };
    question = clockQuestion(null, req.date);
    zone = { utcOffsetSeconds: manual.utcOffsetSeconds };
    clock = { source: 'manual', id: null, chosen: false, utcOffsetSeconds: manual.utcOffsetSeconds, timeZone: null, tzdataVersion: null };
  }

  let utc: string;
  try {
    const r = localToUtc({ date: req.date, time: req.time, zone, ...(req.repeatedTime ? { repeatedTime: req.repeatedTime } : {}) });
    utc = r.utc;
    clock.utcOffsetSeconds = r.utcOffsetSeconds;
    if (clock.source === 'timeZone') clock.tzdataVersion = r.tzdataVersion;
  } catch (e) {
    if (e instanceof TimeError) throw new ApiError(TIME_ERRORS[e.code]);
    throw e;
  }

  let chart: Chart;
  try {
    chart = calculateChart({ utc, lat: place.lat, lng: place.lng }, { settings, ...(options.ephemeris ? { ephemeris: options.ephemeris } : {}) });
  } catch (e) {
    if (e instanceof ChartInputError) throw new ApiError('INVALID_LOCATION');
    if (e instanceof EphemerisError && e.code === 'EPHEMERIS_FALLBACK' && utc < EPHEMERIS_EDGE_BEFORE) throw new ApiError('DATE_OUT_OF_RANGE');
    throw e;
  }

  return {
    apiVersion: API_VERSION,
    engineVersion: ENGINE_VERSION,
    settings,
    place,
    clock,
    utc,
    clockQuestion: question,
    chart,
  };
}
