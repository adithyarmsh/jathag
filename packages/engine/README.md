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
- `calculateChart(input, { settings })`: the defaults are `{ ayanamsa: 'lahiri', node: 'mean', houseSystem: 'whole-sign' }`. Any other value throws a `SettingsError` (`SETTING_NOT_SUPPORTED` / `UNKNOWN_SETTING`) until that option is built.
- The calculation is synchronous. Swiss Ephemeris keeps its settings process-wide, so the adapter sets them right before each calculation, and nothing may `await` in between.

## Layout

| Path | What |
|---|---|
| `src/ephemeris/types.ts` | The adapter interface. The rest of the engine only knows this. |
| `src/ephemeris/sweph.ts` | The `sweph` (Node) adapter. **The only file allowed to import `sweph`** (a test checks this). It sets Lahiri before every call and throws `EphemerisError` (`EPHEMERIS_FALLBACK`) if Swiss Ephemeris ever falls back to its Moshier model. |
| `src/chart.ts` | `calculateChart()`: puts everything together. |
| `src/time.ts` | `localToUtc()`. Uses the Temporal API (`@js-temporal/polyfill`) with the runtime's built-in IANA tz database. |
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
