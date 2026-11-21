# data/places — GeoNames place index

The place index behind birth-place search (FR-IN-04, FR-IN-05, D-087). Built in step 0.2.11; the search code is in `packages/places`.

## What is here

| File | What it is |
|---|---|
| `build-index.mjs` | Build script (plain Node, no dependencies) |
| `sources.json` | The five GeoNames files used: URL, download date, size, server date, **SHA-256** |
| `corrections.json` | Fixes to GeoNames values applied during the build, each with its source and date (D-088) |
| `mumbai-no-district.json` | Mumbai places that GeoNames gives no district, for the "Which clock?" rule (D-082, D-086, D-087), plus the rough Mumbai outline the tests check them against |
| `index/places.tsv.gz` | The built index (≈ 21.3 MB; ≈ 70 MB unpacked), committed |
| `index/places.sha256` | SHA-256 of the unpacked `places.tsv` (the build is deterministic) |

The raw GeoNames downloads are **not** in git. GeoNames replaces its dump files every day and keeps no old copies, so the exact files used are kept as attachments to a GitHub Release:

**https://github.com/adithyarmsh/jathag/releases/tag/geonames-2026-11-21**

## Contents (D-087)

- **India:** every populated place (GeoNames feature class `P`) from `IN.zip`: 558,033 places, every place type, abandoned, destroyed and historical places included. Nothing is dropped.
- **Rest of the world:** every place in `cities500.zip` (population ≥ 500) outside India: 230,005 places.
- For each place: GeoNames id, name, ASCII name, selected alternate names, latitude and longitude (exactly as GeoNames gives them), IANA time zone, country, state (admin1) and district (admin2) codes and names, population, feature code.
- **Alternate names (India only, D-088):** places outside India are found by their main name and its plain spelling only. For Indian places we keep only Latin-script names that start with a capital letter, are not 2–4 letter codes (airport codes such as BOM), do not contain " - ", and are not just another spelling of a name already kept. That covers old names such as Bombay, Madras, Calcutta, Poona and Trivandrum.
- **Search names** for every place (name, ASCII name, and for India alternate names), already normalised (lower case, no accents) and sorted, each with its order bucket (India / elsewhere; city / village / abandoned). This lets the server load the index in under a second.

## Corrections (`corrections.json`)

GeoNames is sometimes wrong. We correct a value only when the error is clear and a reliable public source gives the right value. Each entry records the GeoNames id, the field, the old value, the new value, the reason, the source and the date. The build applies an entry only if GeoNames still has exactly the old value, and stops otherwise, so a data refresh makes someone look again. Applied corrections are listed in the index header (`#X` lines).

| Place | Field | GeoNames | Corrected | Source |
|---|---|---|---|---|
| Kandivli (1268126), Mumbai Suburban | latitude, longitude | 17.87339, 73.22921 (near Satara, ≈ 135 km south of Mumbai) | 19.20451, 72.83764 | Wikipedia "Kandivali" (19°12′16″N 72°50′16″E) and Wikidata Q6361552; checked 2026-11-21 |

## Rebuilding

1. Download the five files from the GitHub Release above (or, for **newer** data, from https://download.geonames.org/export/dump/) into one folder **outside** the repo. Do not unzip them. With the GitHub CLI:

   ```bash
   gh release download geonames-2026-11-21 -R adithyarmsh/jathag -D ~/geonames-2026-11-21
   ```

2. From the repo root run:

   ```bash
   pnpm places:build ~/geonames-2026-11-21
   ```

   The script checks every file's SHA-256 against `sources.json` and stops if one differs.
3. To check that the rebuild matches the committed index exactly:

   ```bash
   GEONAMES_DIR=~/geonames-2026-11-21 pnpm test
   ```

4. To use **newer** GeoNames data: download it, update `sources.json` (date, sizes, checksums), rebuild, and fix the counts in `packages/places/test/places.test.ts` if they changed. Re-check the Mumbai list (the tests show any Mumbai place without a district that is not on it). Attach the new raw files to a new Release (tag `geonames-YYYY-MM-DD`) and explain the changes in the PR.

## Index format (version 2, with the D-088 additions)

A UTF-8 text file with tab-separated columns, gzipped. Line 1 is `JATHAG-PLACES<TAB>2`. Header lines follow:

- `#S name sha256`: the source files
- `#Z n zone`: the time zones (place rows refer to them by number)
- `#C cc name`: the countries
- `#1 cc.admin1 name asciiname`: the states
- `#2 cc.admin1.admin2 name asciiname`: the districts
- `#M id`: Mumbai places with no district (from `mumbai-no-district.json`)
- `#X id field old new`: corrections applied (from `corrections.json`)

After the header there is one row per place, sorted by GeoNames id:

`id, name, asciiname (empty if same as name), alternate names (|-separated), lat, lon, country code, admin1, admin2, population (empty if 0), feature code, zone number`

After the line `#K` come the search names, one per line, sorted:

`normalised name, place number (row position, base 36), kind (0 = name, 1 = ASCII name, 2+n = alternate name n; base 36), population (base 36), order bucket (0–2 India, 3–5 elsewhere: city or neighbourhood (every place in Mumbai counts as one) / village / abandoned or historical)`

## Licence and attribution

The data comes from **GeoNames** (https://www.geonames.org/) under the **Creative Commons Attribution 4.0** licence (CC BY 4.0). Attribution is required: the app must credit GeoNames (D-018, on the Sources & credits page). The index is a modified extract (we select, reformat and add search fields), and the credit should say so, for example: "Place data © GeoNames (geonames.org), CC BY 4.0, adapted."
