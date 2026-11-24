// Approximate-time scanner (step 0.3.6; FR-APX-01…03; D-107, D-111).
//
// Given a place and a range of possible birth moments (UTC, whole seconds, both ends included), find
// every whole second inside it where one of six time-sensitive values changes, and return:
//   - events:   every change moment (the first whole second of the new value), grouped by instant;
//   - segments: the maximal stretches in which all six values stay the same, with their values;
//   - certain:  the values that never change in the range;
//   - dasha:    per stretch of one Moon nakshatra (= one dasha lord), the earliest and latest start and
//               end of every mahadasha and antardasha, from the timeline at both ends of the stretch.
//
// The six values (D-107 item 2), as IDs: ls Lagna sign, ln Lagna nakshatra, ld9 Lagna sign in the
// navamsa, ms Moon sign, mn Moon nakshatra, mp Moon pada.
//
// NO NEW ASTRONOMY (CLAUDE.md rule 4): the Lagna and the Moon come from exactly the same code as the
// chart (lagnaLongitude, siderealGrahas' Moon call, placement), at the same Julian day for every whole
// second, so a chart calculated at any second of a segment has that segment's values.
//
// THE METHOD. All six values are read off two "pada indexes" (0–107: which 3°20′ piece of the zodiac):
// the Lagna's and the Moon's. Sign = 9 padas, nakshatra = 4 padas, navamsa sign = pada mod 12, so a
// value can only change when one of the two indexes changes. Both longitudes only ever move forward:
//   - the Moon is never retrograde;
//   - the Lagna moves forward at every latitude outside the polar circles (|latitude| < 90° − obliquity
//     ≈ 66.5°). Inside them the ecliptic can lie along the horizon, the Lagna jumps and runs backwards,
//     and "the sign rising" stops being well defined, so the scanner refuses those latitudes with
//     POLAR_LATITUDE instead of giving an answer that could be wrong.
// Because both move forward, the number of pada boundaries crossed between two seconds a < b is exactly
// (index(b) − index(a)) mod 108, as long as less than a full circle is travelled in between (true for any
// gap under one sidereal day). So nothing can be missed, however close two changes are: the range is
// sampled every SAMPLE_SECONDS, and every sample gap with a non-zero count is split in half again and
// again down to single seconds. A change moment is then the second b where index(b − 1) ≠ index(b).
// Several boundaries crossed inside one second (possible near the polar circles) give one event.
//
// The engine never reads the clock, and the same input always gives the same output (NFR-DET-01).

import { checkLocation, getDefaultAdapter, lagnaLongitude } from './chart.ts';
import { vimshottariTimeline, type VimshottariTimeline } from './dasha.ts';
import type { EphemerisAdapter, EphemerisInfo } from './ephemeris/types.ts';
import { NAKSHATRA_LORD_CYCLE, type GrahaCode } from './ids.ts';
import { resolveSettings, type Settings } from './settings.ts';
import { ENGINE_VERSION } from './version.ts';
import { placement } from './zodiac.ts';

/** The six time-sensitive values, in the order they are always listed. */
export const TIME_VALUES = ['ls', 'ln', 'ld9', 'ms', 'mn', 'mp'] as const;
export type TimeValueId = (typeof TIME_VALUES)[number];
export type TimeValues = Record<TimeValueId, number>;

/** Sample spacing before halving. Any value under one sidereal day is exact (see THE METHOD); 30 minutes keeps it fast. */
export const SAMPLE_SECONDS = 1800;
/**
 * Latitudes beyond this (north or south) are refused (POLAR_LATITUDE). The polar circles lie at
 * 90° − obliquity = 66.53°–66.57° between 1800 and 2100, so 66.5° keeps a small margin.
 */
export const MAX_SCAN_LATITUDE = 66.5;
/** A safety cap for the engine (the API allows at most one day of local clock time, D-111). */
export const MAX_SCAN_SECONDS = 7 * 86_400;

export interface TimeRangeInput {
  /** First possible birth moment, ISO 8601 UTC, whole seconds, e.g. "1992-08-14T00:30:00Z" (included). */
  fromUtc: string;
  /** Last possible birth moment, same format (included). May equal fromUtc. */
  toUtc: string;
  /** Latitude in degrees, north positive. */
  lat: number;
  /** Longitude in degrees, east positive. */
  lng: number;
}

export interface ValueChange {
  value: TimeValueId;
  from: number;
  to: number;
}

export interface TimeRangeEvent {
  /** First whole second of the new value(s), ISO 8601 UTC. */
  utc: string;
  /** Every value that changes at this second, in TIME_VALUES order. */
  changes: ValueChange[];
}

export interface TimeRangeSegment extends TimeValues {
  /** First second of the stretch, ISO 8601 UTC. */
  from: string;
  /** Last second of the stretch (the second before the next change, or the range end). */
  to: string;
}

export interface DashaDateRange {
  lord: GrahaCode;
  startMin: string;
  startMax: string;
  endMin: string;
  endMax: string;
}

export interface AntardashaDateRange extends DashaDateRange {
  /** The mahadasha this antardasha belongs to. */
  maha: GrahaCode;
}

export interface DashaStretch {
  /** First and last second with this Moon nakshatra, ISO 8601 UTC. */
  from: string;
  to: string;
  moonNakshatra: number;
  /** The dasha lord at birth for this stretch (= the Moon nakshatra's lord). */
  lordAtBirth: GrahaCode;
  /** 9 mahadashas in timeline order. */
  mahadashas: DashaDateRange[];
  /** 81 antardashas in timeline order (9 per mahadasha). */
  antardashas: AntardashaDateRange[];
}

export interface TimeRangeScan {
  meta: {
    engineVersion: string;
    settings: Settings;
    ephemeris: EphemerisInfo;
    input: TimeRangeInput;
    /** Length of the range in seconds (toUtc − fromUtc). */
    seconds: number;
  };
  events: TimeRangeEvent[];
  segments: TimeRangeSegment[];
  /** Values that never change in the range, in TIME_VALUES order; the others are uncertain. */
  certain: TimeValueId[];
  dasha: DashaStretch[];
}

export type TimeRangeErrorCode = 'INVALID_RANGE_TIME' | 'RANGE_END_BEFORE_START' | 'RANGE_TOO_LONG' | 'POLAR_LATITUDE';

export class TimeRangeError extends Error {
  readonly code: TimeRangeErrorCode;
  constructor(code: TimeRangeErrorCode, message: string) {
    super(message);
    this.name = 'TimeRangeError';
    this.code = code;
  }
}

const ISO_WHOLE_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const PADAS = 108;

/** ISO UTC (whole seconds) → seconds since 1970. Rejects anything else, including impossible dates. */
function parseSeconds(what: string, iso: unknown): number {
  if (typeof iso !== 'string' || !ISO_WHOLE_SECONDS.test(iso)) {
    throw new TimeRangeError('INVALID_RANGE_TIME', `${what} must be ISO 8601 UTC with whole seconds, e.g. 1992-08-14T00:30:00Z.`);
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== iso.replace('Z', '.000Z')) {
    throw new TimeRangeError('INVALID_RANGE_TIME', `${what} is not a real moment.`);
  }
  return ms / 1000;
}

const isoOf = (s: number) => new Date(s * 1000).toISOString().replace('.000Z', 'Z');

/** Pada index 0–107 of a longitude, from the same placement() the chart uses. */
function padaIndex(lonDeg: number): number {
  const p = placement(lonDeg);
  return (p.nakshatra - 1) * 4 + (p.pada - 1);
}

function valuesOf(lagnaPada: number, moonPada: number): TimeValues {
  return {
    ls: Math.floor(lagnaPada / 9) + 1,
    ln: Math.floor(lagnaPada / 4) + 1,
    ld9: (lagnaPada % 12) + 1,
    ms: Math.floor(moonPada / 9) + 1,
    mn: Math.floor(moonPada / 4) + 1,
    mp: (moonPada % 4) + 1,
  };
}

/**
 * Scan a range of possible birth moments at one place. Throws TimeRangeError (range problems,
 * polar latitude), ChartInputError (latitude/longitude out of range), SettingsError, or
 * EphemerisError (outside the ephemeris data).
 */
export function scanTimeRange(
  input: TimeRangeInput,
  options: { settings?: Partial<Record<keyof Settings, unknown>>; ephemeris?: EphemerisAdapter } = {},
): TimeRangeScan {
  const settings = resolveSettings(options.settings);
  const eph = options.ephemeris ?? getDefaultAdapter();
  const from = parseSeconds('Range start', input.fromUtc);
  const to = parseSeconds('Range end', input.toUtc);
  const { lat, lng } = input;
  checkLocation(lat, lng);
  if (to < from) throw new TimeRangeError('RANGE_END_BEFORE_START', 'The range must not end before it starts.');
  if (to - from > MAX_SCAN_SECONDS) throw new TimeRangeError('RANGE_TOO_LONG', `The range may be at most ${MAX_SCAN_SECONDS} seconds.`);
  if (Math.abs(lat) > MAX_SCAN_LATITUDE) {
    throw new TimeRangeError('POLAR_LATITUDE', `The Lagna is not well defined beyond ${MAX_SCAN_LATITUDE}° latitude.`);
  }

  // Julian day of a whole second, through the adapter exactly as calculateChart does (utcParts).
  const jdOf = (s: number) => {
    const d = new Date(s * 1000);
    const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    return eph.julianDayUt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hours);
  };
  const lagnaCache = new Map<number, number>();
  const moonCache = new Map<number, number>();
  const moonLon = (s: number) => eph.siderealBody(jdOf(s), 'Mo').lon;
  const lagnaPadaAt = (s: number) => {
    let v = lagnaCache.get(s);
    if (v === undefined) lagnaCache.set(s, (v = padaIndex(lagnaLongitude(eph, jdOf(s), lat, lng))));
    return v;
  };
  const moonPadaAt = (s: number) => {
    let v = moonCache.get(s);
    if (v === undefined) moonCache.set(s, (v = padaIndex(moonLon(s))));
    return v;
  };

  // Change seconds of one pada index: sample, then halve every gap that crossed a boundary.
  const changeSeconds = (at: (s: number) => number): number[] => {
    const out: number[] = [];
    const split = (a: number, ia: number, b: number, ib: number) => {
      if ((ib - ia + PADAS) % PADAS === 0) return;
      if (b - a === 1) return void out.push(b);
      const m = Math.floor((a + b) / 2);
      const im = at(m);
      split(a, ia, m, im);
      split(m, im, b, ib);
    };
    let a = from;
    let ia = at(a);
    while (a < to) {
      const b = Math.min(a + SAMPLE_SECONDS, to);
      const ib = at(b);
      split(a, ia, b, ib);
      a = b;
      ia = ib;
    }
    return out;
  };

  const moments = [...new Set([...changeSeconds(lagnaPadaAt), ...changeSeconds(moonPadaAt)])].sort((x, y) => x - y);
  const valuesAt = (s: number) => valuesOf(lagnaPadaAt(s), moonPadaAt(s));

  const events: TimeRangeEvent[] = [];
  const segments: TimeRangeSegment[] = [];
  const changed = new Set<TimeValueId>();
  let segStart = from;
  let current = valuesAt(from);
  for (const s of moments) {
    const next = valuesAt(s);
    const changes: ValueChange[] = [];
    for (const v of TIME_VALUES) {
      if (next[v] !== current[v]) {
        changes.push({ value: v, from: current[v], to: next[v] });
        changed.add(v);
      }
    }
    events.push({ utc: isoOf(s), changes });
    segments.push({ from: isoOf(segStart), to: isoOf(s - 1), ...current });
    segStart = s;
    current = next;
  }
  segments.push({ from: isoOf(segStart), to: isoOf(to), ...current });

  // Dasha ranges: one entry per run of segments with the same Moon nakshatra.
  const dasha: DashaStretch[] = [];
  for (let i = 0; i < segments.length; ) {
    let j = i;
    while (j + 1 < segments.length && segments[j + 1]!.mn === segments[i]!.mn) j++;
    dasha.push(dashaStretch(segments[i]!.from, segments[j]!.to, segments[i]!.mn, moonLon, settings));
    i = j + 1;
  }

  return {
    meta: {
      engineVersion: ENGINE_VERSION,
      settings,
      ephemeris: eph.info,
      input: { fromUtc: input.fromUtc, toUtc: input.toUtc, lat, lng },
      seconds: to - from,
    },
    events,
    segments,
    certain: TIME_VALUES.filter((v) => !changed.has(v)),
    dasha,
  };
}

const earlier = (a: string, b: string) => (Date.parse(a) <= Date.parse(b) ? a : b);
const later = (a: string, b: string) => (Date.parse(a) >= Date.parse(b) ? a : b);
const range = (a: { start: string; end: string }, b: { start: string; end: string }) => ({
  startMin: earlier(a.start, b.start),
  startMax: later(a.start, b.start),
  endMin: earlier(a.end, b.end),
  endMax: later(a.end, b.end),
});

/** Earliest/latest dates of every mahadasha and antardasha, from the timelines at both ends of the stretch (D-107 item 4). */
function dashaStretch(
  from: string,
  to: string,
  moonNakshatra: number,
  moonLon: (s: number) => number,
  settings: Settings,
): DashaStretch {
  const timeline = (iso: string): VimshottariTimeline =>
    vimshottariTimeline({ moonLon: moonLon(Date.parse(iso) / 1000), birthUtc: iso, dashaYear: settings.dashaYear });
  const a = timeline(from);
  const b = timeline(to);
  return {
    from,
    to,
    moonNakshatra,
    lordAtBirth: NAKSHATRA_LORD_CYCLE[(moonNakshatra - 1) % 9]!,
    mahadashas: a.mahadashas.map((m, i) => ({ lord: m.lord, ...range(m, b.mahadashas[i]!) })),
    antardashas: a.mahadashas.flatMap((m, i) =>
      m.antardashas.map((ad, j) => ({ maha: m.lord, lord: ad.lord, ...range(ad, b.mahadashas[i]!.antardashas[j]!) })),
    ),
  };
}
