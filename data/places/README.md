# data/places — GeoNames place index

The place index behind birth-place search (FR-IN-04, FR-IN-05). Built in step 0.2.11; the search code is in `packages/places`.

## What is here

| File | What it is |
|---|---|
| `build-index.mjs` | Build script (plain Node, no dependencies) |
| `sources.json` | The five GeoNames files used: URL, download date, size, server date, **SHA-256** |
| `index/places.tsv.gz` | The built index (≈ 17 MB; ≈ 56 MB unpacked), committed |
| `index/places.sha256` | SHA-256 of the unpacked `places.tsv` (the build is deterministic) |

The raw GeoNames downloads are **not** in git. GeoNames replaces its dump files every day and keeps no old copies, so to rebuild the *same* index you need the exact files whose checksums are in `sources.json`. Keep them somewhere safe (outside the repo).

## Contents

- **India:** every populated place (GeoNames feature class `P`) from `IN.zip`: 558,033 places, all feature codes (nothing dropped).
- **Rest of the world:** every place in `cities500.zip` (population ≥ 500) outside India: 230,005 places.
- For each place: GeoNames id, name, ASCII name, selected alternate names, latitude and longitude (exactly as GeoNames gives them), IANA time zone, country, state (admin1) and district (admin2) codes and names, population, feature code.
- **Alternate names:** only Latin-script names that start with a capital letter, are not 2–4 letter codes (airport codes such as BOM), do not contain " - ", and are not just another spelling of a name already kept. That covers old names such as Bombay, Madras, Calcutta, Poona and Trivandrum, and costs about 3.9 MB of the 56 MB.

## Rebuilding

1. Download the five files listed in `sources.json` from https://download.geonames.org/export/dump/ into one folder outside the repo. Do not unzip them.
2. From the repo root run:

   ```bash
   pnpm places:build /path/to/that/folder
   ```

   The script checks every file's SHA-256 against `sources.json` and stops if one differs.
3. To use **newer** GeoNames data, update `sources.json` first (new date, sizes, checksums), rebuild, then fix the counts in `packages/places/test/places.test.ts` if they changed. Explain the changes in the PR.
4. To check that a rebuild matches the committed index exactly:

   ```bash
   GEONAMES_DIR=/path/to/that/folder pnpm test
   ```

## Index format (version 1)

A UTF-8 text file with tab-separated columns, gzipped. Line 1 is `JATHAG-PLACES<TAB>1`. Header lines follow, sorted:

- `#S name sha256`: the source files
- `#Z n zone`: the time zones (place rows refer to them by number)
- `#C cc name`: the countries
- `#1 cc.admin1 name asciiname`: the states
- `#2 cc.admin1.admin2 name asciiname`: the districts

After the header there is one row per place, sorted by GeoNames id:

`id, name, asciiname (empty if same as name), alternate names (|-separated), lat, lon, country code, admin1, admin2, population (empty if 0), feature code, zone number`

## Licence and attribution

The data comes from **GeoNames** (https://www.geonames.org/) under the **Creative Commons Attribution 4.0** licence (CC BY 4.0). Attribution is required: the app must credit GeoNames (D-018, on the Sources & credits page). The index is a modified extract (we select and reformat the fields), and the credit should say so, for example: "Place data © GeoNames (geonames.org), CC BY 4.0, adapted."
