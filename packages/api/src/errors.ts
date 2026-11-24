// Error codes returned by the endpoints. Codes only, never English sentences (the words live in
// the web app's message files, D-063) and never any part of the request (FR-API-02, D-014).

export type ApiErrorCode =
  // Request shape
  | 'INVALID_REQUEST' // body is not a JSON object, or a field has the wrong type
  | 'REQUEST_TOO_LARGE'
  // Birth date and time (FR-IN-02, FR-IN-08)
  | 'INVALID_DATE' // not YYYY-MM-DD, or a date that does not exist (e.g. 1990-02-30)
  | 'DATE_OUT_OF_RANGE' // outside 1800-01-01 – 2100-12-31
  | 'INVALID_TIME' // not HH:MM or HH:MM:SS, or not a real clock time
  | 'NONEXISTENT_LOCAL_TIME' // clocks jumped forward over this time (daylight saving)
  | 'AMBIGUOUS_LOCAL_TIME' // clocks went back: the time happened twice; send repeatedTime
  | 'INVALID_REPEATED_TIME' // repeatedTime is not "earlier" or "later"
  // Place (FR-IN-04, FR-IN-07)
  | 'MISSING_PLACE' // neither a place nor manual entry
  | 'INVALID_PLACE' // both given, or a place field is missing or malformed
  | 'INVALID_LOCATION' // latitude/longitude out of range
  | 'INVALID_TIME_ZONE' // unknown IANA time zone
  | 'INVALID_UTC_OFFSET' // manual offset not a whole number of seconds within ±18 h
  // "Which clock?" (FR-IN-09)
  | 'INVALID_CLOCK_CHOICE' // a clock that is not offered for this birth
  // Settings (FR-SET-01)
  | 'UNKNOWN_SETTING'
  | 'SETTING_NOT_SUPPORTED'
  // Anything else
  | 'INTERNAL_ERROR';

/**
 * Codes only the range endpoint (POST /api/chart/range, step 0.3.6) returns. Kept apart from
 * ApiErrorCode so the birth form's code → field table (apps/web/lib/api-errors.ts) stays complete;
 * their words are added with the approximate-time screen (0.8.1).
 */
export type RangeErrorCode =
  | 'RANGE_SAME_TIME' // the end equals the start: use the exact time instead (D-111)
  | 'RANGE_TOO_SHORT' // under 1 minute of local clock time (D-111)
  | 'RANGE_END_BEFORE_START' // only possible with first/second choices in a repeated hour: the real end is before the real start
  | 'POLAR_LATITUDE'; // beyond 66.5° north or south the Lagna is not well defined, so no scan

export class ApiError extends Error {
  readonly code: ApiErrorCode | RangeErrorCode;
  readonly status: number;
  /** Only for settings errors: which setting (a key name, never a birth detail). */
  readonly setting?: string;
  constructor(code: ApiErrorCode | RangeErrorCode, status = 400, setting?: string) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (setting !== undefined) this.setting = setting;
  }
}

export interface ErrorBody {
  error: { code: ApiErrorCode | RangeErrorCode; setting?: string };
}

export function errorBody(e: ApiError): ErrorBody {
  return { error: e.setting !== undefined ? { code: e.code, setting: e.setting } : { code: e.code } };
}
