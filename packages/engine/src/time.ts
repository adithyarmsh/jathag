// Local birth time → UTC (FR-CALC-01, D-019, FR-IN-07).
//
// Time zone rules are NOT hand-coded. We use the Temporal API (the TC39 reference polyfill
// `@js-temporal/polyfill`), which reads the IANA time zone database built into the JavaScript
// runtime (Node's ICU data; the version is in `process.versions.tz` and is echoed in the result).
//
// Daylight-saving changes are never guessed:
//   - a local time that does not exist (clocks jumped forward over it) → TimeError NONEXISTENT_LOCAL_TIME
//   - a local time that happened twice (clocks went back) → TimeError AMBIGUOUS_LOCAL_TIME, with
//     both possible UTC instants, unless the caller says which one with `repeatedTime`.

import { Temporal } from '@js-temporal/polyfill';

export type BirthZone =
  /** IANA time zone name, e.g. "Asia/Kolkata". Historical offsets come from the tz database. */
  | { iana: string }
  /** Manual entry (FR-IN-07): a fixed UTC offset in seconds east of Greenwich, e.g. 19 800 for +5:30. */
  | { utcOffsetSeconds: number };

export interface LocalBirthTime {
  /** "YYYY-MM-DD" (Gregorian calendar). */
  date: string;
  /** "HH:MM" or "HH:MM:SS" (24-hour clock). */
  time: string;
  zone: BirthZone;
  /**
   * Only for a local time that happened twice (clocks went back): which one is meant.
   * Without it, such a time is an AMBIGUOUS_LOCAL_TIME error.
   */
  repeatedTime?: 'earlier' | 'later';
}

export interface UtcResult {
  /** Birth instant in UTC, ISO 8601, e.g. "1992-08-14T01:15:00Z". */
  utc: string;
  /** The UTC offset that applied, in seconds east of Greenwich. */
  utcOffsetSeconds: number;
  /** IANA time zone database version used (null for a manual offset). */
  tzdataVersion: string | null;
}

export type TimeErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_TIME_ZONE'
  | 'INVALID_UTC_OFFSET'
  | 'NONEXISTENT_LOCAL_TIME'
  | 'AMBIGUOUS_LOCAL_TIME';

export class TimeError extends Error {
  readonly code: TimeErrorCode;
  /** For AMBIGUOUS_LOCAL_TIME: the two possible UTC instants (earlier first). */
  readonly candidates?: { earlier: UtcResult; later: UtcResult };
  constructor(code: TimeErrorCode, message: string, candidates?: TimeError['candidates']) {
    super(message);
    this.name = 'TimeError';
    this.code = code;
    if (candidates) this.candidates = candidates;
  }
}

const MAX_OFFSET_SECONDS = 18 * 3600;

function parseLocal(date: string, time: string): Temporal.PlainDateTime {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!d) throw new TimeError('INVALID_DATE', `Date must look like YYYY-MM-DD, got "${date}".`);
  const t = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!t) throw new TimeError('INVALID_TIME', `Time must look like HH:MM or HH:MM:SS, got "${time}".`);
  const [hour, minute, second] = [Number(t[1]), Number(t[2]), Number(t[3] ?? 0)];
  if (hour > 23 || minute > 59 || second > 59) {
    throw new TimeError('INVALID_TIME', `Time "${time}" is not a valid clock time.`);
  }
  try {
    return Temporal.PlainDateTime.from(
      { year: Number(d[1]), month: Number(d[2]), day: Number(d[3]), hour, minute, second },
      { overflow: 'reject' },
    );
  } catch {
    throw new TimeError('INVALID_DATE', `Date "${date}" does not exist.`);
  }
}

function toResult(zdt: Temporal.ZonedDateTime, tzdataVersion: string | null): UtcResult {
  return {
    utc: zdt.toInstant().toString(),
    utcOffsetSeconds: Math.round(zdt.offsetNanoseconds / 1e9),
    tzdataVersion,
  };
}

export function tzdataVersion(): string | null {
  return (globalThis as { process?: { versions?: { tz?: string } } }).process?.versions?.tz ?? null;
}

/** Convert a local birth date and time to a UTC instant. */
export function localToUtc(input: LocalBirthTime): UtcResult {
  const local = parseLocal(input.date, input.time);

  if ('utcOffsetSeconds' in input.zone) {
    const off = input.zone.utcOffsetSeconds;
    if (!Number.isInteger(off) || Math.abs(off) > MAX_OFFSET_SECONDS) {
      throw new TimeError('INVALID_UTC_OFFSET', `UTC offset must be a whole number of seconds within ±18 h, got ${off}.`);
    }
    const instant = local.toZonedDateTime('UTC').subtract({ seconds: off }).toInstant();
    return { utc: instant.toString(), utcOffsetSeconds: off, tzdataVersion: null };
  }

  const zone = input.zone.iana;
  const version = tzdataVersion();
  let earlier: Temporal.ZonedDateTime;
  let later: Temporal.ZonedDateTime;
  try {
    earlier = local.toZonedDateTime(zone, { disambiguation: 'earlier' });
    later = local.toZonedDateTime(zone, { disambiguation: 'later' });
  } catch {
    throw new TimeError('INVALID_TIME_ZONE', `Unknown time zone "${zone}".`);
  }

  if (earlier.epochNanoseconds === later.epochNanoseconds) return toResult(earlier, version);

  // The two differ: either the time was skipped (gap) or it happened twice (overlap).
  // In a gap, Temporal moves the time, so the wall-clock time no longer equals the input.
  if (!earlier.toPlainDateTime().equals(local)) {
    throw new TimeError(
      'NONEXISTENT_LOCAL_TIME',
      `${input.date} ${input.time} did not exist in ${zone} (the clocks were moved forward over it).`,
    );
  }
  if (input.repeatedTime === 'earlier') return toResult(earlier, version);
  if (input.repeatedTime === 'later') return toResult(later, version);
  throw new TimeError(
    'AMBIGUOUS_LOCAL_TIME',
    `${input.date} ${input.time} happened twice in ${zone} (the clocks were moved back). Say which one is meant.`,
    { earlier: toResult(earlier, version), later: toResult(later, version) },
  );
}

/** Split a UTC ISO instant into calendar parts (hours as a decimal) for the Julian day. */
export function utcParts(utc: string): { year: number; month: number; day: number; hours: number } {
  let z: Temporal.ZonedDateTime;
  try {
    z = Temporal.Instant.from(utc).toZonedDateTimeISO('UTC');
  } catch {
    throw new TimeError('INVALID_TIME', `"${utc}" is not a valid UTC instant (ISO 8601, e.g. 1992-08-14T01:15:00Z).`);
  }
  const seconds = z.second + z.millisecond / 1e3 + z.microsecond / 1e6 + z.nanosecond / 1e9;
  return { year: z.year, month: z.month, day: z.day, hours: z.hour + z.minute / 60 + seconds / 3600 };
}

export interface LocalClockTime {
  /** "YYYY-MM-DD HH:MM:SS" on the birth place's clock (whole seconds). */
  local: string;
  /** The UTC offset in force, seconds east of Greenwich. */
  utcOffsetSeconds: number;
  /**
   * Only for a clock time that happened twice (clocks went back): 'first' for the earlier pass,
   * 'second' for the later one. Null otherwise (always null for a fixed offset).
   */
  repeated: 'first' | 'second' | null;
}

/**
 * The reverse of localToUtc (step 0.3.6): a UTC instant (whole seconds) on a zone's clock. With an
 * IANA zone, a time inside an hour that happened twice is marked 'first' or 'second'.
 */
export function utcToLocal(utc: string, zone: BirthZone): LocalClockTime {
  let instant: Temporal.Instant;
  try {
    instant = Temporal.Instant.from(utc);
  } catch {
    throw new TimeError('INVALID_TIME', `"${utc}" is not a valid UTC instant (ISO 8601, e.g. 1992-08-14T01:15:00Z).`);
  }
  const fmt = (p: Temporal.PlainDateTime) => p.toString({ smallestUnit: 'second' }).replace('T', ' ');
  if ('utcOffsetSeconds' in zone) {
    const off = zone.utcOffsetSeconds;
    if (!Number.isInteger(off) || Math.abs(off) > MAX_OFFSET_SECONDS) {
      throw new TimeError('INVALID_UTC_OFFSET', `UTC offset must be a whole number of seconds within ±18 h, got ${off}.`);
    }
    return { local: fmt(instant.add({ seconds: off }).toZonedDateTimeISO('UTC').toPlainDateTime()), utcOffsetSeconds: off, repeated: null };
  }
  let zdt: Temporal.ZonedDateTime;
  try {
    zdt = instant.toZonedDateTimeISO(zone.iana);
  } catch {
    throw new TimeError('INVALID_TIME_ZONE', `Unknown time zone "${zone.iana}".`);
  }
  const wall = zdt.toPlainDateTime();
  const earlier = wall.toZonedDateTime(zone.iana, { disambiguation: 'earlier' });
  const later = wall.toZonedDateTime(zone.iana, { disambiguation: 'later' });
  const repeated = earlier.epochNanoseconds === later.epochNanoseconds
    ? null
    : zdt.epochNanoseconds === earlier.epochNanoseconds ? 'first' : 'second';
  return { local: fmt(wall), utcOffsetSeconds: Math.round(zdt.offsetNanoseconds / 1e9), repeated };
}
