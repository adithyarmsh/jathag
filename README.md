# Jathag

Jathag is a calm, precise Vedic astrology web app. It aims to give people accurate birth charts (calculated with Swiss Ephemeris and checked against Jagannatha Hora), honest plain-language explanations, and no ads, no fear-based messaging and no tracking.

## Status

**Coming soon.** The repository currently contains the project structure and a Coming Soon page.

## Folder structure

```
apps/web/            Next.js website (currently the Coming Soon page)
packages/engine/     Calculation engine (Swiss Ephemeris, AGPL). No UI code. Phase 1.
packages/content/    Interpretation content as data. Licensed separately (TBD).
data/places/         GeoNames place index scripts. Phase 3.
tests/reference/     Jagannatha Hora reference test cases. Phase 1.
docs/                Product brief, requirements, decisions log and roadmap.
.github/workflows/   Continuous integration (lint + build on every push and pull request).
```

## Development

Requires Node 24 and pnpm.

```bash
pnpm install
pnpm dev      # local site at http://localhost:3000
pnpm lint
pnpm build
```

## Licence

- **Code:** GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](LICENSE).
- **Interpretation content** (`packages/content`): licensed separately from the code. Licence to be decided.

## Credits

_To be added (Swiss Ephemeris, GeoNames, fonts and other open-source projects)._
