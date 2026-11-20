# JHora reference tests

Jathag's definition of "correct" is: the same answer as Jagannatha Hora (JHora 8.0) with the same settings (D-013, D-074). This folder holds JHora's answers for 26 test births and the tests that hold the engine to them.

**All 26 births are synthetic.** They were designed to hit edge cases (time zones, boundaries, retrogrades, high latitude, 1901 and 1853 (R26, D-080), leap day, before sunrise). They are not real people.

## What is in here

| Path | What it is |
|---|---|
| `births.json` | The 26 births R01–R26: date, local time, **true** UTC offset, IANA time zone, latitude/longitude, and why each one is included. The engine is always fed these values. |
| `raw/` | JHora's answer key, exactly as exported. **Never edit.** `rNN.pdf` (printed chart), `rNN.jhd` (JHora's birth file), `rNN-pratyantar.txt` (pratyantardasha times for R01, R09, R10, R15, R22), `jhora-settings-jathag.ini` (the JHora settings used, D-070). |
| `expected/` | Clean data made from `raw/` by the converter: `R01.json` … `R26.json`. |
| `scripts/` | `convert.mjs` (the converter), `parse.mjs` (how the PDFs and text files are read), `ids.mjs` (the stable IDs). |
| `checks.test.ts` | Self-checks on the answer key. Always on, must always pass. |
| `engine.test.ts` | Tests that compare the engine to `expected/`. Switched off until the engine exists; see the top of the file for how each step switches its group on. |

## What `expected/RNN.json` contains

All values use stable IDs, not English names (D-063): signs 1–12 (1 = Aries), nakshatras 1–27 (1 = Ashwini), bodies `La` (Lagna) `Su Mo Ma Me Ju Ve Sa Ra Ke`, weekday 1–7 (1 = Sunday), tithi 1–30, yoga 1–27, karana 1–11, lunar month 1–12, samvatsara 1–60. The full list is in `scripts/ids.mjs`.

- `printed` — birth details as JHora printed them (to cross-check against `births.json`), plus the birth instant in UTC. `jhd` — the same read from JHora's birth file.
- `bodies` — for Lagna and the 9 planets: sidereal longitude in arcseconds from 0° Aries (`lonArcsec`), sign, nakshatra, pada, navamsa sign, retrograde.
- `panchanga` — samvatsara, lunar month, tithi (+ % left), nakshatra (+ % left), weekday, yoga, karana, hora lord.
- `vimshottari` — 9 mahadashas × 9 antardashas with JHora's printed start dates (date only, birth-place clock).
- `pratyantardashas` — for the 5 births with a `.txt` file: every pratyantardasha start and end, as printed (`local`) and in UTC (`utc`).
- `divisional` — the sign of each body in D-1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60, read from the South Indian chart drawings. `chartRetrograde` records which bodies JHora drew in brackets (retrograde).

## Running things

```bash
pnpm test
```

Runs every test (CI does this on every push and pull request).

```bash
pnpm reference:convert
```

Rebuilds `expected/` from `raw/`. Only needed if `raw/` changes; `checks.test.ts` fails if `expected/` is out of date.

## What the self-checks prove

- All 26 births parsed with no missing field and all 20 charts present.
- Printed birth details and the `.jhd` files match `births.json` (R22 by instant, see below).
- In every birth: the D-1 chart drawing equals the table's Rasi column, and the D-9 drawing equals the Navamsa column, for every body; bracketed (retrograde) bodies in every chart equal the table's "(R)".
- Every sign, nakshatra, pada and navamsa in the table agrees with its own longitude; Ketu is exactly opposite Rahu.
- Panchanga nakshatra = Moon's nakshatra, and its "% left" agrees with the Moon's longitude.
- Mahadashas and antardashas are in Vimshottari order, start with the Moon's nakshatra lord, and their lengths follow the 365.25-day year.
- Pratyantardashas: 9 per antardasha, in order, back to back, with the right lengths, matching the PDF's dasha table.

## Tolerances (how close the engine must be to JHora)

Set in `engine.test.ts`, chosen by the birth's **local date** in `births.json`:

| Births | Longitudes (all bodies and Lagna) | Dasha times (from step 0.3.1) | Decision |
|---|---|---|---|
| From 1900-01-01 | within 1″ | within 1 hour | D-074 |
| Before 1900-01-01 (today only R26) | within 3″ | within 12 hours | D-081 |

Signs, nakshatras, padas, D-9, divisional signs and retrograde must be **exact** for every birth.

Why two levels: JHora and Swiss Ephemeris estimate Earth's past rotation (ΔT) a little differently, so the gap grows slowly with distance from today. The Moon moves fastest, so it shows the gap most (2018 −0.21″, 1901 +0.30″, 1853 +1.47″). For 1853 that is about 3 seconds of the Moon's motion, far less than how precisely any 1800s birth time is known. Births from 1800 stay supported (FR-IN-02); the public promise (D-013: ±1′, ±1 day) is the same for all dates.

## JHora quirks to know about

- **R22 (Madras Mean Time, UTC+5:21:10).** JHora's time zone has no seconds box, so R22 was typed in as 07:29:50 at UTC+5:21 — the same instant as the true 07:30:00 at UTC+5:21:10 in `births.json` (D-072). The PDF therefore shows 07:29:50; the tests compare the instant.
- **Lagna (D-073).** JHora's Lagna = tropical ascendant minus the Lahiri ayanamsa *without nutation*. Swiss Ephemeris' default sidereal ascendant includes nutation and is off by about 18.7″ (R01). Planets do include nutation.
- **0.14″ Lahiri offset.** JHora's "Traditional Lahiri" starts about 0.14″ away from Swiss Ephemeris' `SE_SIDM_LAHIRI`. It is constant, below the 1″ tolerance and ignored. Because dashas magnify Moon differences, it moves dasha times by 10–26 minutes — inside the 1-hour tolerance (D-074).
- **Dasha times are on the birth place's clock** — the fixed UTC offset typed into JHora (no daylight-saving changes later in life). `expected/` stores the printed time and the UTC instant; tests compare UTC.
- **Before sunrise = previous weekday.** R24 (Pune, 05:54) and R19 (Oslo in December, 08:30) are before sunrise, so JHora's Vedic weekday is the day before the calendar date.
- **Rahu and Ketu** are never marked "(R)" by JHora, so retrograde is only tested for Sun–Saturn.
- **Place labels** printed in the PDFs (e.g. "Madras" for R12, "(, India)" for London) are just JHora's text box; only the coordinates matter, and they are correct.
- **Seconds in coordinates (R26).** R01–R25 have whole-minute coordinates; R26 (New Haven, 41° 18′ 29″ N, 72° 55′ 43″ W) is the first with seconds. The PDF prints them as `72 W 55' 43"`; the `.jhd` stores degrees + *decimal minutes* (`72.557167` = 72° 55.7167′). The converter reads both at full precision; the `.jhd` keeps 6 decimals, so it can differ from `births.json` by 0.000001° (≈0.004″).
- **R26 (1853, fixed UTC−5:00, `Etc/GMT+5`).** The US had no standard time until 1883, so R26 uses a fixed offset — exactly what was typed into JHora ("5:00 West of GMT"). Birth instant 1853-06-28T12:25:00Z. No pratyantardasha file.
