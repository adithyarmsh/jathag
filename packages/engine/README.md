# @jathag/engine

Jathag's calculation engine. **Calculations only:** no UI and no interpretation text (those live in `apps/web` and `packages/content`). Astronomy comes from Swiss Ephemeris (AGPL, D-006). The results are held to the JHora answer key in `tests/reference` (D-013, D-074).

## What it calculates (step 0.2.8)

From a birth instant (UTC) and a place (latitude/longitude):

- **Positions** of Su Mo Ma Me Ju Ve Sa Ra Ke: sidereal Lahiri longitude, speed, retrograde (speed < 0), sign, degree in sign, nakshatra, pada, nakshatra lord, D-9 sign (FR-CALC-02, 03, 07). Apparent geocentric positions; mean node; Ketu = Rahu + 180° (D-071).
- **Lagna**: tropical ascendant minus the Lahiri ayanamsa *without* nutation, the same way JHora does it (D-073). The same placement fields as the planets.
- **Houses**: whole sign, house 1 = Lagna sign; each house's sign, lord and occupants (FR-CALC-06, D-010).
- **Dignity**: EX / MT / OS / FR / NE / EN / DB from the BPHS table in D-076 (`src/dignity.ts`). Rahu and Ketu: `null`.
- **Aspects**: whole-sign graha drishti (FR-CALC-08, D-012): houses and planets each planet aspects.
- **Combustion** with the D-077 orbs (`src/combustion.ts`).

Plus **local time → UTC** (FR-CALC-01): an IANA time zone *or* a manual UTC offset in seconds.

And (step 0.3.1) **Vimshottari dashas**, (step 0.3.2) **transits, sign changes and Sade Sati**, (step 0.3.4) **life-area links** and (step 0.3.6) the **approximate-time scanner**; see below.

Everything uses stable IDs (D-063): signs 1–12, nakshatras 1–27, houses 1–12, body codes `La Su Mo Ma Me Ju Ve Sa Ra Ke`. There are no English names. Every result carries `meta` with the engine version, the settings used, the ephemeris version and data files, and the input.

## How to call it

```ts
import { localToUtc, calculateChart } from '@jathag/engine';

const { utc } = localToUtc({ date: '1992-08-14', time: '06:45', zone: { iana: 'Asia/Kolkata' } });
const chart = calculateChart({ utc, lat: 13.083333, lng: 80.283333 });

chart.bodies.Mo;   // { lon, sign, degInSign, nakshatra, pada, nakshatraLord, navamsaSign, speed, retrograde, house, dignity, combust }
chart.houses[0];   // { house: 1, sign: 5, lord: 'Su', occupants: ['Ju', 'Ve'] }
chart.aspects.Sa;  // { houses: [3, 8, 12], bodies: ['Su', 'Me'] }
chart.meta;        // { engineVersion, settings, ephemeris, input, julianDayUt }
```

- `localToUtc` throws a `TimeError` with a `code` and never guesses:
  - `NONEXISTENT_LOCAL_TIME`: the clocks jumped forward over this time.
  - `AMBIGUOUS_LOCAL_TIME`: the clocks went back, so the time happened twice. The error carries both `candidates`; call again with `repeatedTime: 'earlier' | 'later'`.
  - `INVALID_DATE`, `INVALID_TIME`, `INVALID_TIME_ZONE`, `INVALID_UTC_OFFSET`.
- `calculateChart(input, { settings })`: the defaults are `{ ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign', dashaYear: '365.25' }`. Any other value throws a `SettingsError` (`SETTING_NOT_SUPPORTED` / `UNKNOWN_SETTING`) until that option is built. `dashaYear` also accepts `'360'` and `'365.2422'`.
- **Ephemeris folder:** `createSwephAdapter({ ephePath })`. Without `ephePath` the adapter uses `defaultEphePath()` (this package's `ephe/` folder, worked out from the file's own location on first use, never at module load). A bundled copy (the web app) must pass `ephePath`; if it does not, Swiss Ephemeris finds no files and the adapter throws `EPHEMERIS_FALLBACK`. Step 0.3.1 made this change so Turbopack can bundle the engine unchanged (it used to need a build loader, D-091, D-096 item 7).
- The calculation is synchronous. Swiss Ephemeris keeps its settings process-wide, so the adapter sets them right before each calculation, and nothing may `await` in between.

## Vimshottari dashas (step 0.3.1, `src/dasha.ts`)

FR-TIME-01…05, D-011, D-015, D-070, D-096. Fixed arithmetic on the engine's own Swiss Ephemeris Moon (no extra astronomy, so CLAUDE.md rule 4 holds). The rule is the standard one from Brihat Parashara Hora Shastra; it is what JHora gives with "Vimshottari from the Moon, seed Krittika, antardashas start from the dasha lord" (D-070):

- **Order and years:** Ke 7, Ve 20, Su 6, Mo 10, Ma 7, Ra 18, Ju 16, Sa 19, Me 17 (= 120). Nakshatra lords follow the same order from Ashwini (1 Ke, 2 Ve, … 9 Me, 10 Ke, … 27 Me).
- **First mahadasha** = lord of the Moon's nakshatra at birth. **Balance at birth** = (fraction of the nakshatra not yet travelled) × that lord's years. The timeline starts at the mahadasha's true start, before birth (= birth − fraction travelled × lord's years).
- **Antardashas**: in each mahadasha the same order from the mahadasha lord, each maha years × antar years / 120. **Pratyantardashas**: the same rule one level down (antar length × pratyantar years / 120).
- **Year length** = the `dashaYear` setting: `'365.25'` days (default, D-011, the only one checked against JHora), `'360'`, `'365.2422'`.
- **No rounding build-up:** every boundary is the cycle start + an exact whole number N of 1/14 400 dasha years (N = 14 400 × maha years before + 120 × maha years × antar years before + maha × antar years × pratyantar years before), rounded once to the nearest whole second. So each end is exactly the next start and children exactly fill their parent.

```ts
import { calculateChart, vimshottariForChart, vimshottariNow } from '@jathag/engine';

const chart = calculateChart({ utc, lat, lng }, { settings: { dashaYear: '365.25' } });
const timeline = vimshottariForChart(chart);       // 9 mahadashas → 81 antardashas → 729 pratyantardashas
timeline.mahadashas[0];  // { lord: 'Ma', start: '1986-10-10T23:38:46Z', end: '…', endedBeforeBirth: false, containsBirth: true, antardashas: [ … ] }
const now = vimshottariNow(timeline, '2026-11-22T10:00:00.000Z');
now.current.antardasha;  // { path: [2, 8], lord: 'Ra', start: '…', end: '…' }  (null before birth / after the 120 years)
now.next.pratyantardasha; // the next START at that level (each level on its own; null when none is left)
```

- Times are ISO 8601 UTC, whole seconds. Showing them on the birth place's clock is the screens' job (D-097).
- `vimshottariNow` takes `asOf` as an input; **the engine never reads the system clock** (NFR-DET-01, a test checks this with a fake clock). A period is current when start ≤ asOf < end.
- Lower-level building block: `vimshottariTimeline({ moonLon, birthUtc, dashaYear })`.

## Transits, sign changes and Sade Sati (step 0.3.2, `src/transits.ts`)

FR-TRAN-01…04, D-099. No JHora answer key exists for this; correctness rests on Swiss Ephemeris, the self-checks in `test/transits.test.ts` and `tests/reference/transits.test.ts`, and the founder's JHora spot-check (0.3.3, `notes/0.3.3-jhora-checklist.md`).

```ts
const t = transitsForChart(chart, { asOf: '2026-11-22T10:00:00.000Z' }); // the same asOf as the dashas
t.positions.Sa;        // { lon, sign, degInSign, nakshatra, pada, nakshatraLord, navamsaSign, speed, retrograde, houseFromMoon, houseFromLagna }
t.signChanges.Sa;      // [{ planet: 'Sa', utc: '2025-03-29T16:15:10Z', fromSign: 11, toSign: 12, kind: 'enters' }, …]
t.sadeSati.periods[1]; // { start, end, startedBeforeBirth, startOutsideData, endOutsideData, phases: { rising, peak, setting }, crossings: [ … ] }
t.sadeSati.status;     // { asOf, phase: 'setting', current: { index, start, end, phases }, next: { … }, saturn: { sign: 12, houseFromMoon: 2 } }
```

- **Positions now:** the 9 grahas at `asOf`, through the same function as the natal planets (`siderealGrahas` in `chart.ts`: same adapter, Lahiri, apparent, mean node, Ketu = Rahu + 180°). No transit Lagna. Houses are whole-sign from the natal Moon's sign and from the natal Lagna's sign. A test checks that asOf = birth gives exactly the natal positions.
- **Sign changes (a search over Swiss Ephemeris output, not new astronomy, D-007):** sample longitude and speed every **20 days**. Same direction of motion at both ends of a step → the planet moved one way only, by at most ~6°, so it crossed at most one boundary, exactly when the end signs differ. Speed changed sign → one station inside the step; if a boundary was within reach (end signs differ, or an end is within `MAX_SPEED` × 20 days of a boundary), the station is found to the second and each side is checked the same way. Each crossing is narrowed to the second (interpolation with a halving fallback); the reported `utc` is the **first whole UTC second in the new sign**. **Why 20 days is safe:** a crossing could only be missed with two stations inside one step or over 30° of motion in one step. Saturn's stations are never less than 133.5 days apart and Jupiter's never less than 117.5 days (measured 1800–2399; the test asserts more than 5 steps), their top speeds (0.134 and 0.243 °/day) stay under `MAX_SPEED` (tested), and the mean node never stations (speed always −0.0530 ± 0.0001 °/day). A dense 1-hour scan finds exactly the same crossings (tests: Saturn 1960–2040, Jupiter 1990–2040, Rahu 2000–2030). Precision: 1 s of search; physically, the 0.14″ Lahiri difference to JHora is about 20 s of Saturn's time at normal speed.
- **Kinds**, relative to the normal direction (forward for Saturn/Jupiter, backward for the nodes): `enters` (further than the planet has been), `moves-back` (against the normal direction), `enters-again` (into a sign it had stepped back out of). Each search starts 1 year before the first crossing it reports, so a dip in progress (always under ~5 months) is known. The mean node only ever `enters`. Ketu's crossings are Rahu's moments into the opposite signs.
- **Window (FR-TRAN-03):** from the planet's most recent `enters` at or before asOf, up to asOf, plus every crossing in the 10 calendar years after asOf.
- **Sade Sati:** Moon sign M = natal Moon's sign; Saturn in M−1 = rising, M = peak, M+1 = setting. **Merging rule:** the stretches Saturn spends in those three signs are one period when the gap between them is shorter than **10 years of 365.25 days** (real gaps are retrograde dips under a year or ~22 years to the next return, so the threshold has no effect between 1 and 20 years). Period = first entry into M−1 → final exit from M+1. Phases start at Saturn's **first** entry into M−1 / M / M+1 inside the period; each ends where the next starts. Every Saturn crossing inside the period is listed with houses from the Moon (`fromHouse`/`toHouse`: 12, 1, 2, or 11/3 during a dip out). Periods last 6.4–8.9 years.
- **Span:** every period overlapping birth → birth + 120 calendar years. A period running at birth keeps its true start (`startedBeforeBirth`). **Before the data:** the ephemeris begins 1800-01-01 01:08:07 UTC (`EPHEMERIS_DATA_START`, D-091). If Saturn is already in one of the three signs there, `start` is `null` (`startOutsideData: true`), and so is the start of Saturn's phase at that moment and of any earlier phase. (On 1800-01-01 Saturn was at ~17°44′ Cancer, 13° from Leo, so no later phase can have begun before the data.) The end side works the same way (`endOutsideData`); the search stops at 2399-12-01 (`EPHEMERIS_DATA_END`), far beyond the ~2231 the API can need.
- **Status at asOf:** `none` / `rising` / `peak` / `setting` by the phase rules (a retrograde dip does not change the phase; `saturn` gives Saturn's real sign and house from the Moon), the running period and the next one to start.
- **Reuse and cost:** Saturn is searched once per chart over one range covering both the Sade Sati span and the sign-change window; about 25 ms per chart on a Mac. (A first version with 5-day steps and plain bisection gave byte-identical results for all 29 births but took 3× longer.)
- Lower-level pieces (exported for tests): `crossingTimeline`, `rawCrossings`, `sadeSatiPeriods`, and `calculateSadeSati({ moonSign, birthUtc, asOf })` for any Moon sign.
- Not here (D-099 item 7, FR-TRAN-05): Ashtama/Kantaka Shani, a list of retrograde stations, life-area windows (0.3.4, below).

## Life-area links (step 0.3.4, `src/life-areas.ts`)

The rule behind "Periods that especially activate this area" (FR-TIME-07, FR-LA-03, D-028, D-104): a graha is **linked to a life area when it rules or occupies one of that area's houses** (whole-sign houses from the Lagna). Every Vimshottari period, at all three levels, is flagged by **its own lord** (D-104 item 1), so a period's life areas are its lord's links.

- **Areas (IDs, Requirements §6.6):** `self` 1 · `money` 2, 11 · `communication` 3 · `home` 4 · `learning` 5 · `health` 1, 6 · `relationships` 7 · `career` 6, 10 · `luck` 9 · `spirituality` 8, 12 (`LIFE_AREAS`, `LIFE_AREA_HOUSES`). The words for them are not in the engine (D-063).
- **Lords:** the Parashari sign lords already used for dignity (`SIGN_LORD` in `ids.ts`). **Rahu and Ketu rule nothing**: occupation only (D-104 item 2). The karaka column of §6.6 is **not** used (D-104 item 3). No score (item 4).
- `lifeAreasForChart(chart)` (or `lifeAreaLinks({ lagnaSign, signs })` for any Lagna and signs) → `{ Su: [...], …, Ke: [...] }`, each graha's list in `LIFE_AREAS` order, one entry per area: `{ area: 'relationships', reasons: [{ kind: 'rules', house: 7, sign: 11 }, { kind: 'occupies', house: 7 }] }`. Reasons are sorted by house; for the same house "rules" comes first. `sign` (rules only) is the ruled sign in that house, needed because a dual lord rules two.
- `periodsForLifeArea(timeline, links, area, level)` → the periods at one level (`mahadasha` / `antardasha` / `pratyantardasha`) whose lord is linked to `area`, in time order, each `{ path, lord, start, end, reasons }` (`path` = position in the timeline, like `vimshottariNow`). Built on `dashaRefs(timeline, level)` in `dasha.ts` (all 9 / 81 / 729 periods at a level), which `vimshottariNow` now also uses. Includes periods that ended before birth; screens decide what to show (0.3.7, 0.7.5).
- Pure: no clock, no ephemeris. Measured on the 29 reference births: a graha is linked to 1–4 areas (average 2.5), and each area to 1–6 grahas (average 2.2).

## Approximate-time scanner (step 0.3.6, `src/approx-time.ts`)

FR-APX-01…03, D-107, D-111. For a place and a range of possible birth moments, every moment one of six values changes, the stretches in between, which values are certain, and the dasha date ranges.

```ts
import { scanTimeRange } from '@jathag/engine';

const r = scanTimeRange({ fromUtc: '1992-08-14T00:30:00Z', toUtc: '1992-08-14T06:30:00Z', lat: 13.083333, lng: 80.283333 });
r.events[0];   // { utc: '1992-08-14T00:39:30Z', changes: [{ value: 'ls', from: 4, to: 5 }, { value: 'ln', from: 9, to: 10 }, { value: 'ld9', from: 12, to: 1 }] }
r.segments[0]; // { from: '1992-08-14T00:30:00Z', to: '1992-08-14T00:39:29Z', ls: 4, ln: 9, ld9: 12, ms: 11, mn: 23, mp: 4 }
r.certain;     // ['ms']
r.dasha[1];    // { from, to, moonNakshatra: 24, lordAtBirth: 'Ra', mahadashas: [9 × { lord, startMin, startMax, endMin, endMax }], antardashas: [81 × { maha, lord, … }] }
r.meta;        // { engineVersion, settings, ephemeris, input, seconds }
```

- **Values** (`TIME_VALUES`): `ls` Lagna sign, `ln` Lagna nakshatra, `ld9` Lagna sign in the navamsa, `ms` Moon sign, `mn` Moon nakshatra (the dasha lord changes with it), `mp` Moon pada. IDs only.
- **Input:** both ends ISO 8601 UTC with whole seconds (`…T00:30:00Z`), both included; the end may equal the start. Settings as for `calculateChart` (only `dashaYear` affects the result).
- **Output:** `events` (a change moment = the **first whole second of the new value**; several values can change in the same second, listed in `TIME_VALUES` order), `segments` (maximal stretches with all six values constant; `to` = the second before the next change, the last ends at the range end), `certain` (values that never change), `dasha` (one entry per stretch of one Moon nakshatra: earliest/latest start and end of all 9 mahadashas and 81 antardashas, from the Vimshottari timeline at the first and last second of the stretch; no pratyantardashas).
- **Same Lagna and Moon as the chart:** `lagnaLongitude` (shared with `calculateChart`), the adapter's Moon, `placement`, at the same Julian day for each whole second; a test checks a chart at both ends of every segment.
- **Method (no new astronomy):** all six values are read off two *pada indexes* (which 3°20′ piece, 0–107) of the Lagna and the Moon. Both only move forward (the Moon is never retrograde; the Lagna moves forward everywhere outside the polar circles), so the number of boundaries crossed between two seconds is exactly the difference of the indexes (mod 108) whenever less than a full circle passes in between. The range is sampled every 30 minutes (`SAMPLE_SECONDS`) and every gap that crossed something is halved down to single seconds. So no change can be missed, however close two are: checked against a test of **every single second** for a whole day at all 29 reference places and at 60°N, 60°S, Reykjavik, Ushuaia and ±66.5° on three dates (47 days, identical), and in `test/approx-time.test.ts` for Oslo and 66.5°N.
- **Shortest gaps measured** (two changes of the same value; 12 days of 2001 per place): reference places `ld9` 3 min 4 s, `ln` 12 min 21 s, `ls` 28 min 34 s, `mp` 5 h 17 min; Reykjavik `ld9` 77 s; 66.5° `ld9` 2 s (1 s once in 1850). Moon signs and nakshatras change at most once a day.
- **Polar latitudes:** beyond **66.5°** north or south (`MAX_SCAN_LATITUDE`; the polar circles lie at 66.53°–66.57° in 1800–2100) the ecliptic can lie along the horizon, the Lagna jumps and runs backwards (measured at 67° and 70°N), and the rising sign is not well defined: `TimeRangeError` `POLAR_LATITUDE`, never an answer.
- **Errors** (`TimeRangeError.code`): `INVALID_RANGE_TIME` (not ISO UTC with whole seconds, or not a real moment), `RANGE_END_BEFORE_START`, `RANGE_TOO_LONG` (over 7 days, `MAX_SCAN_SECONDS`, a safety cap; the API allows one day), `POLAR_LATITUDE`. Bad latitude/longitude: `ChartInputError` as for the chart.
- **Speed:** a whole day takes about 12 ms on a Mac (about 1,300 ephemeris look-ups). The engine never reads the clock; same input, same output (NFR-DET-01, tested).
- Not here (D-107 item 2): houses, life areas, Sade Sati or transits per segment; those come in 0.8.1 by running the chart once per segment.
- `utcToLocal(utc, zone)` in `src/time.ts` (the reverse of `localToUtc`) gives the birth-place clock time of an instant, with `repeated: 'first' | 'second'` inside an hour that happened twice; the range endpoint uses it.

## Panchanga at birth (step 0.9.1, `src/panchanga.ts`)

FR-CALC-11, D-053, D-123. Tithi with paksha, nakshatra, vara (weekday), yoga, karana and the hora lord for a chart, matching JHora for all 29 reference births.

```ts
import { calculateChart, panchangaForChart } from '@jathag/engine';

const p = panchangaForChart(calculateChart({ utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 }), { utcOffsetSeconds: 19800 });
// { tithi: 16, paksha: 2, tithiLeftPercent: 44.04…, nakshatra: 23, nakshatraLeftPercent: 16.53…, yoga: 5, karana: 3,
//   weekday: 6, weekdayFrom: 'sunrise', sunrise: '1992-08-14T00:26:29Z', horaLord: 'Ve' }
```

- **IDs only:** tithi 1–30 (1–15 Shukla Pratipada … Purnima, 16–30 Krishna Pratipada … Amavasya), paksha 1 Shukla / 2 Krishna, nakshatra 1–27, weekday 1 = Sunday … 7 = Saturday, yoga 1 = Vishkambha … 27 = Vaidhriti, karana 1 Bava … 7 Vishti, 8 Shakuni, 9 Chatushpada, 10 Naga, 11 Kimstughna, hora lord a body code. Same IDs as `tests/reference/scripts/ids.mjs`.
- **Formulas** (on the chart's own sidereal Sun and Moon, in arcseconds): tithi = floor((Moon − Sun) / 12°) + 1; yoga = floor((Sun + Moon) / 13°20′) + 1; half-tithi h = floor((Moon − Sun) / 6°) + 1, karana h = 1 → 11, h = 2…57 → ((h − 2) mod 7) + 1, 58 → 8, 59 → 9, 60 → 10. A value exactly on a boundary belongs to the new one. "% left" = share of the current tithi or nakshatra still to go.
- **Vara is sunrise-based:** the weekday of the last sunrise at or before birth, its date on the clock offset at birth (`utcOffsetSeconds`, D-098). A birth before sunrise gets the previous weekday (R19, R24).
- **Sunrise** comes from the adapter's `nextSunEvent` (Swiss Ephemeris `rise_trans`, upper limb, refraction, 0 m, 1013.25 hPa, 20 °C; D-070 to D-072). It returns null where the Sun does not rise or set (polar day or night). There the weekday is the calendar weekday of the birth's local date, `weekdayFrom: 'calendarDay'`, and `sunrise` and `horaLord` are null (JHora has no reference for that).
- **Hora:** 24 equal horas of 60 minutes from the Vedic day's sunrise; the first is the weekday lord's, then Su, Ve, Me, Mo, Sa, Ju, Ma repeating. This matches JHora (HoraPreference=0) for all 29 births; day and night split into 12 equal parts each matches only 23.
- Pure apart from the sunrise; never reads the clock (NFR-DET-01). Bad offset: `PanchangaInputError`.

## Layout

| Path | What |
|---|---|
| `src/ephemeris/types.ts` | The adapter interface. The rest of the engine only knows this. |
| `src/ephemeris/sweph.ts` | The `sweph` (Node) adapter. **The only file allowed to import `sweph`** (a test checks this). It sets Lahiri before every call and throws `EphemerisError` (`EPHEMERIS_FALLBACK`) if Swiss Ephemeris ever falls back to its Moshier model. |
| `src/chart.ts` | `calculateChart()`: puts everything together. |
| `src/dasha.ts` | Vimshottari timeline, current period and coming up (step 0.3.1). |
| `src/transits.ts` | Positions now, sign-change search (Saturn, Jupiter, Rahu/Ketu) and Sade Sati (step 0.3.2). |
| `src/life-areas.ts` | Life-area table, graha → life-area links with reasons, periods for one area (step 0.3.4). |
| `src/panchanga.ts` | Panchanga at birth: tithi, paksha, nakshatra, sunrise-based weekday, yoga, karana, hora lord (step 0.9.1). |
| `src/approx-time.ts` | Approximate-time scanner: change moments, segments, certain values, dasha date ranges (step 0.3.6). |
| `src/time.ts` | `localToUtc()` and its reverse `utcToLocal()`. Uses the Temporal API (`@js-temporal/polyfill`) with the runtime's built-in IANA tz database. |
| `src/zodiac.ts` | Sign / nakshatra / pada / D-9 arithmetic, done in arcseconds. |
| `src/dignity.ts`, `src/aspects.ts`, `src/combustion.ts` | The rule tables from D-076, D-012, D-077. |
| `src/settings.ts`, `src/ids.ts`, `src/version.ts` | Settings, stable IDs and sign lords, and the engine version. |
| `ephe/` | Swiss Ephemeris data files `sepl_18.se1` (planets) and `semo_18.se1` (Moon), covering 1800–2399, 1.7 MB. From Astrodienst's official repository (github.com/aloistr/swisseph). Checksums are in `ephe/SHA256SUMS` and are pinned in `test/ephemeris.test.ts`. |
| `test/` | Hand-made unit tests. The JHora reference tests are in `tests/reference/engine.test.ts`. |

## Rules

- All engine code is plain TypeScript, apart from the adapter (D-025, D-069). A WebAssembly adapter for the phone (v1.3) plugs in through `calculateChart(input, { ephemeris })`.
- Bump `ENGINE_VERSION` (and `package.json` `version`) whenever a change could alter any calculated value (NFR-DET-01).
- Any engine change must keep `pnpm test` green, including every JHora reference test (CLAUDE.md rule 4).
- `pnpm typecheck` (from the repo root) type-checks the engine on its own; CI runs it on every push and PR.
- Longitudes are decimal degrees; turning them into degrees/minutes/seconds is the display layer's job (D-078). Birth time goes to Swiss Ephemeris as UT without a leap-second/UT1 correction, like JHora (D-078).
- To check the data files by hand: `cd packages/engine/ephe && shasum -a 256 -c SHA256SUMS`.
