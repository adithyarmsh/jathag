# @jathag/api

Server-side logic of the calculation API (step 0.2.12): the two endpoints the form calls, and the "Which clock?" rule for old Indian births. No UI and no page text: errors are **codes**, results are **stable IDs** (D-063). The Next.js route files in `apps/web/app/api/` only call `handleChartRequest` / `handleSearchRequest`, so everything here is tested without a server.

**Privacy (FR-API-02, D-014):** nothing here logs, stores or caches a request. Errors never contain any part of the request. Every response has `Cache-Control: no-store`. An unexpected failure logs only the error's class name and code (never its message).

## The two endpoints

Both are `POST` with a JSON body, so birth details and search text never appear in a URL (URLs can end up in hosting logs). They are separate server functions on Vercel: only the search function carries and loads the 21 MB place index.

### `POST /api/places/search`

```json
{ "query": "Bombay" }
```
→ up to 10 suggestions, in exactly the order `packages/places` ranks them (D-087, D-088, D-089). Under 3 characters: `{ "results": [] }`.
```json
{ "results": [
  { "label": "Mumbai, Maharashtra, India", "geonameId": 1275339, "lat": 19.07283, "lng": 72.88261,
    "timeZone": "Asia/Kolkata", "countryCode": "IN", "admin1Code": "16", "admin2Code": "", "featureCode": "PPLA" }
] }
```
Limits: query up to 100 characters, body up to 1 KB.

### `POST /api/chart`

```json
{
  "date": "1943-07-15",
  "time": "11:30",
  "place": { "geonameId": 1261481, "lat": 28.6139, "lng": 77.209, "timeZone": "Asia/Kolkata",
             "countryCode": "IN", "admin1Code": "07", "admin2Code": "094" },
  "clock": "ist",
  "repeatedTime": "earlier",
  "settings": { "ayanamsa": "lahiri", "node": "mean", "houseSystem": "whole-sign" }
}
```
- `date` `YYYY-MM-DD` (1800-01-01 – 2100-12-31, FR-IN-02) and `time` `HH:MM` or `HH:MM:SS`: local, at the birth place.
- **Either** `place` (the fields a search result returns; `label` and `featureCode` may be sent too and are ignored) **or** `manual`: `{ "lat", "lng", "utcOffsetSeconds" }` (FR-IN-07). The chart function trusts these fields and does not look the place up again.
- `clock` (optional): the "Which clock?" answer, one of `ist`, `war`, `bombay`, `calcutta`, `lmt`. Only allowed when this birth's question offers it. Without it, a birth in a window gets the default.
- `repeatedTime` (optional): `earlier` / `later`, only needed for a clock time that happened twice (daylight saving ended).
- `settings` (optional): defaults per FR-SET-01; other values are refused until built.

Response (shortened):
```json
{
  "apiVersion": 1,
  "engineVersion": "0.1.0",
  "settings": { "ayanamsa": "lahiri", "node": "mean", "houseSystem": "whole-sign" },
  "place": { "kind": "search", "geonameId": 1261481, "lat": 28.6139, "lng": 77.209, "timeZone": "Asia/Kolkata", "countryCode": "IN", "admin1Code": "07", "admin2Code": "094" },
  "clock": { "source": "clockRule", "id": "ist", "chosen": true, "utcOffsetSeconds": 19800, "timeZone": null, "tzdataVersion": null },
  "utc": "1943-07-15T06:00:00Z",
  "clockQuestion": { "applies": true, "windows": ["war-1942-1945"], "defaultClock": "war",
                     "options": [{ "id": "war", "utcOffsetSeconds": 23400 }, { "id": "ist", "utcOffsetSeconds": 19800 }] },
  "chart": { "meta": { … }, "bodies": { "La": { … }, "Su": { … }, … }, "houses": [ … ], "aspects": { … } }
}
```
`clock.source` is `timeZone` (the place's IANA zone; `tzdataVersion` set), `clockRule` (a "Which clock?" option; `chosen` = sent by the client, otherwise the default) or `manual`. `chart` is exactly the engine's output (`packages/engine/README.md`).

### Errors

`{ "error": { "code": "…" } }`, HTTP 400 (413 for a body over the limit, 500 for `INTERNAL_ERROR`). Settings errors also carry `"setting"` (the key name). The codes are listed in `src/errors.ts`:
`INVALID_REQUEST`, `REQUEST_TOO_LARGE`, `INVALID_DATE`, `DATE_OUT_OF_RANGE`, `INVALID_TIME`, `NONEXISTENT_LOCAL_TIME`, `AMBIGUOUS_LOCAL_TIME`, `INVALID_REPEATED_TIME`, `MISSING_PLACE`, `INVALID_PLACE`, `INVALID_LOCATION`, `INVALID_TIME_ZONE`, `INVALID_UTC_OFFSET`, `INVALID_CLOCK_CHOICE`, `UNKNOWN_SETTING`, `SETTING_NOT_SUPPORTED`, `INTERNAL_ERROR`.

Every response also has a `Server-Timing` header (wall time, CPU time, and for search the index load on a cold start) for measuring; it contains no request data.

## The "Which clock?" rule (`src/clock.ts`)

FR-IN-09; D-082, D-086, D-087, D-090. Only for places with country code `IN`, by the birth's **local** date, windows inclusive:

| Window ID | Where | From | To | Options (default first) |
|---|---|---|---|---|
| `india-before-1906` | anywhere in India | — | 1905-12-31 | `ist` +5:30, `lmt` (longitude × 240 s, rounded) |
| `mumbai-1906-1955` | Mumbai (`isMumbaiPlace`) | 1906-01-01 | 1955-12-31 | `ist`, `bombay` +4:51 (17460 s) |
| `west-bengal-1906-1948` | West Bengal (IN.28) | 1906-01-01 | 1948-12-31 | `ist`, `calcutta` +5:53:20 (21200 s) |
| `war-1941-1942` | anywhere in India | 1941-10-01 | 1942-05-14 | `ist`, `war` +6:30 (23400 s) |
| `war-1942-1945` | anywhere in India | 1942-09-01 | 1945-10-14 | **`war`**, `ist` |

Overlaps (D-090): all options of every matching window; default `war` in 1942-09-01 – 1945-10-14, otherwise `ist`. Option order: default first, then `ist`, `war`, `bombay`, `calcutta`, `lmt`. The chosen clock goes to the engine as `zone: { utcOffsetSeconds }`; outside every window the place's IANA zone is used. `isMumbaiPlace` repeats the place index's rule without loading it (the 4-place list is copied from `data/places/mumbai-no-district.json`; a test keeps them equal).

## Tests

`packages/api/test/` (clock rule: every window, first/last day, day after, overlaps, non-Indian places; endpoints: every error code, no echo, no logging, headers) and `tests/reference/api.test.ts` (R27–R29 end to end against JHora).
