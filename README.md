# Jathag

Jathag is a calm, precise Vedic astrology web app. It aims to give people accurate birth charts (calculated with Swiss Ephemeris and checked against Jagannatha Hora), honest plain-language explanations, and no ads, no fear-based messaging and no tracking.

## Status

**Coming soon (beta).** The live site at https://jathag.vercel.app shows a Coming Soon page and is hidden from search engines until the v1.0 launch. Build status: [PROGRESS.md](PROGRESS.md).

## Folder structure

```
apps/web/            Next.js website (currently the Coming Soon page; page text in apps/web/messages/)
packages/engine/     Calculation engine (Swiss Ephemeris, AGPL). No UI code. v0.2 (step 0.2.8).
packages/content/    Interpretation content as data. Licensed separately (TBD).
data/places/         GeoNames place index scripts. v0.2 (step 0.2.11).
tests/reference/     Jagannatha Hora reference tests. v0.2 (steps 0.2.6–0.2.7).
docs/                Product brief, requirements, decisions log and roadmap.
PROGRESS.md          Live build status, step by step (see docs/roadmap.md).
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
