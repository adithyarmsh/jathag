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

And (step 0.3.1) **Vimshottari dashas**, see below.

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

## Layout

| Path | What |
|---|---|
| `src/ephemeris/types.ts` | The adapter interface. The rest of the engine only knows this. |
| `src/ephemeris/sweph.ts` | The `sweph` (Node) adapter. **The only file allowed to import `sweph`** (a test checks this). It sets Lahiri before every call and throws `EphemerisError` (`EPHEMERIS_FALLBACK`) if Swiss Ephemeris ever falls back to its Moshier model. |
| `src/chart.ts` | `calculateChart()`: puts everything together. |
| `src/dasha.ts` | Vimshottari timeline, current period and coming up (step 0.3.1). |
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
