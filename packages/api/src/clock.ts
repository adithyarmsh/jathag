// "Which clock?" rule for old Indian births (FR-IN-09; D-082, D-086, D-087, D-090).
//
// Pure TypeScript: no file access, no logging. The engine is not involved: this module only
// decides which UTC offset the engine's existing fixed-offset input gets (zone: { utcOffsetSeconds }).
//
// The rule applies only to places with country code IN, using the birth's LOCAL date, every
// window inclusive at both ends:
//
//   window                     where                 from        to          options          default
//   india-before-1906          anywhere in India     (any)       1905-12-31  IST, LMT         IST
//   mumbai-1906-1955           Mumbai (isMumbai)     1906-01-01  1955-12-31  IST, Bombay      IST
//   west-bengal-1906-1948      West Bengal (IN.28)   1906-01-01  1948-12-31  IST, Calcutta    IST
//   war-1941-1942              anywhere in India     1941-10-01  1942-05-14  IST, War Time    IST
//   war-1942-1945              anywhere in India     1942-09-01  1945-10-14  War Time, IST    War Time
//
// Overlaps (D-090): all options of every matching window are offered; the default is War Time if
// the date is in 1942-09-01 – 1945-10-14, otherwise IST. Outside every window there is no question
// and the place's IANA time zone is used as before.

import { isWestBengal, MAHARASHTRA_ADMIN1, MUMBAI_CITY_ADMIN2, MUMBAI_SUBURBAN_ADMIN2 } from '@jathag/places';

/** Stable clock IDs (D-063); the words shown to users live in the web app's message files. */
export type ClockId = 'ist' | 'war' | 'bombay' | 'calcutta' | 'lmt';

export const CLOCK_IDS: readonly ClockId[] = ['ist', 'war', 'bombay', 'calcutta', 'lmt'];

/** Fixed offsets in seconds east of Greenwich. LMT depends on the place (longitude × 240 s). */
export const IST_SECONDS = 19_800; // +5:30
export const WAR_TIME_SECONDS = 23_400; // +6:30
export const BOMBAY_TIME_SECONDS = 17_460; // +4:51
export const CALCUTTA_TIME_SECONDS = 21_200; // +5:53:20

export type ClockWindowId =
  | 'india-before-1906'
  | 'mumbai-1906-1955'
  | 'west-bengal-1906-1948'
  | 'war-1941-1942'
  | 'war-1942-1945';

/** The place fields the rule needs (all of them come with a place search result). */
export interface ClockPlace {
  geonameId: number;
  countryCode: string;
  admin1Code: string;
  admin2Code: string;
  /** Decimal degrees, east positive (for local mean time). */
  lng: number;
}

export interface ClockOption {
  id: ClockId;
  utcOffsetSeconds: number;
}

export interface ClockQuestion {
  /** True when the birth falls in at least one window. */
  applies: boolean;
  /** The windows the birth falls in (empty when the question does not apply). */
  windows: ClockWindowId[];
  /** Default first, then the others in the order ist, war, bombay, calcutta, lmt. */
  options: ClockOption[];
  /** The pre-selected option; null when the question does not apply. */
  defaultClock: ClockId | null;
}

interface ClockWindow {
  id: ClockWindowId;
  /** First local date, inclusive ('' = no lower bound). */
  from: string;
  /** Last local date, inclusive. */
  to: string;
  where: (p: ClockPlace) => boolean;
  clocks: readonly ClockId[];
  defaultClock: ClockId;
}

/**
 * Mumbai places that GeoNames gives no district (data/places/mumbai-no-district.json, D-087).
 * Copied here so the chart endpoint does not need the place index; a test checks that this list
 * equals the JSON file and the index header.
 */
export const MUMBAI_NO_DISTRICT_IDS: ReadonlySet<number> = new Set([1264186, 1268447, 1273797, 1275339]);

/** Same rule as PlaceIndex.isMumbai (D-087), without needing the index. */
export function isMumbaiPlace(p: Pick<ClockPlace, 'geonameId' | 'countryCode' | 'admin1Code' | 'admin2Code'>): boolean {
  if (p.countryCode !== 'IN') return false;
  if (p.admin1Code === MAHARASHTRA_ADMIN1
    && (p.admin2Code === MUMBAI_CITY_ADMIN2 || p.admin2Code === MUMBAI_SUBURBAN_ADMIN2)) return true;
  return MUMBAI_NO_DISTRICT_IDS.has(p.geonameId);
}

const india = (p: ClockPlace) => p.countryCode === 'IN';

export const CLOCK_WINDOWS: readonly ClockWindow[] = [
  { id: 'india-before-1906', from: '', to: '1905-12-31', where: india, clocks: ['ist', 'lmt'], defaultClock: 'ist' },
  { id: 'mumbai-1906-1955', from: '1906-01-01', to: '1955-12-31', where: isMumbaiPlace, clocks: ['ist', 'bombay'], defaultClock: 'ist' },
  {
    id: 'west-bengal-1906-1948', from: '1906-01-01', to: '1948-12-31',
    where: (p) => isWestBengal(p), clocks: ['ist', 'calcutta'], defaultClock: 'ist',
  },
  { id: 'war-1941-1942', from: '1941-10-01', to: '1942-05-14', where: india, clocks: ['ist', 'war'], defaultClock: 'ist' },
  { id: 'war-1942-1945', from: '1942-09-01', to: '1945-10-14', where: india, clocks: ['war', 'ist'], defaultClock: 'war' },
];

/** Local mean time of a longitude: longitude × 240 s, rounded to the nearest second (D-090). */
export function localMeanTimeSeconds(lng: number): number {
  return Math.round(lng * 240);
}

function offsetOf(id: ClockId, place: ClockPlace): number {
  switch (id) {
    case 'ist': return IST_SECONDS;
    case 'war': return WAR_TIME_SECONDS;
    case 'bombay': return BOMBAY_TIME_SECONDS;
    case 'calcutta': return CALCUTTA_TIME_SECONDS;
    case 'lmt': return localMeanTimeSeconds(place.lng);
  }
}

const noQuestion = (): ClockQuestion => ({ applies: false, windows: [], options: [], defaultClock: null });

/**
 * Does the "Which clock?" question apply to this birth, and with which options?
 * `localDate` is the birth's local date, "YYYY-MM-DD" (already validated).
 * A null place (manual entry, FR-IN-07) never gets the question: its offset is already explicit.
 */
export function clockQuestion(place: ClockPlace | null, localDate: string): ClockQuestion {
  if (!place) return noQuestion();
  const hits = CLOCK_WINDOWS.filter((w) => (w.from === '' || localDate >= w.from) && localDate <= w.to && w.where(place));
  if (hits.length === 0) return noQuestion();
  const defaultClock: ClockId = hits.some((w) => w.defaultClock === 'war') ? 'war' : 'ist';
  const offered = new Set<ClockId>(hits.flatMap((w) => w.clocks));
  const ordered = [defaultClock, ...CLOCK_IDS.filter((id) => id !== defaultClock && offered.has(id))];
  return {
    applies: true,
    windows: hits.map((w) => w.id),
    options: ordered.map((id) => ({ id, utcOffsetSeconds: offsetOf(id, place) })),
    defaultClock,
  };
}

export class ClockChoiceError extends Error {
  readonly code = 'INVALID_CLOCK_CHOICE';
  constructor() {
    super('This clock is not offered for this birth.');
    this.name = 'ClockChoiceError';
  }
}

export type ResolvedClock =
  /** Outside every window: the place's IANA time zone, as before. */
  | { source: 'timeZone'; question: ClockQuestion; id: null }
  /** Inside a window: the chosen (or default) clock as an explicit offset. */
  | { source: 'clockRule'; question: ClockQuestion; id: ClockId; utcOffsetSeconds: number; chosen: boolean };

/**
 * Applies the rule. With no `choice`, a birth in a window gets the default clock. A `choice` that
 * is not offered for this birth (including any choice when no question applies) throws
 * ClockChoiceError.
 */
export function resolveClock(place: ClockPlace, localDate: string, choice?: ClockId): ResolvedClock {
  const question = clockQuestion(place, localDate);
  if (!question.applies) {
    if (choice !== undefined) throw new ClockChoiceError();
    return { source: 'timeZone', question, id: null };
  }
  const id = choice ?? question.defaultClock!;
  const option = question.options.find((o) => o.id === id);
  if (!option) throw new ClockChoiceError();
  return { source: 'clockRule', question, id, utcOffsetSeconds: option.utcOffsetSeconds, chosen: choice !== undefined };
}
