# Rules for Claude Code in this repository

## Start of every session (do this before anything else)
1. Read this file, then `PROGRESS.md`, then the parts of `docs/` that the task touches (`docs/requirements.md`, `docs/decisions-log.md`, `docs/roadmap.md`).
2. Tell Adithya in 2–3 plain sentences: the current milestone and step, what was done last, and what this session will do.
3. Check `git status` and that `main` is up to date with GitHub. If there are uncommitted changes you did not make, ask before touching them. (Files added by the Claude Project for a docs update are expected; the handoff will say so.)
4. If the handoff's step does not match `PROGRESS.md`, or conflicts with `docs/`, stop and say so.

## End of every PR (no exceptions)
1. Update `PROGRESS.md` **in the same PR**: step status, the "Current position" table (current step, next step, blocked on, last updated), and a new row at the top of the session log (date, step ID, PR number, one plain-English line).
2. Mark a step ✅ only when its "Done when" condition in `docs/roadmap.md` is met. If it is met only partly, keep it 🔄 and write what is left.
3. If the work changed anything in `CLAUDE.md`'s rules or the repo structure, update this file in the same PR.
4. Never edit `docs/requirements.md`, `docs/decisions-log.md`, `docs/roadmap.md` or `docs/product-brief.md` on your own. Those come from the Claude Project. If you think one is wrong or out of date, say so in your final report.
5. Finish with a plain-English report: what changed, checks status, preview link, anything Adithya must do or decide.

## Working rules
1. **The founder is not a software engineer.** Explain plainly, one step at a time. Ask before installing anything, using sudo, deleting files, or doing anything hard to undo.
2. **Product decisions are made in the Claude Project** and recorded in `docs/`. Do not make product decisions. Small technical choices are fine; list them in your report.
3. **Calculation and interpretation are strictly separate.** `packages/engine` = calculations only (no UI, no interpretation text). `packages/content` = interpretation text as data only.
4. **Never write astronomical calculations from scratch.** Use Swiss Ephemeris (AGPL). Results must match the Jagannatha Hora reference tests in `tests/reference`; any engine change must keep all reference tests passing.
5. **The repository is PUBLIC.** Never commit secrets, API keys, `.env` files, or real people's birth details.
6. **Branching:** one roadmap step per branch, named `<step-id>-<short-name>` (e.g. `0.2.8-engine-core`). PR titles start with the step ID (e.g. `0.2.8: Engine core`). Never push directly to `main`.
7. **Never merge a pull request with failing checks**, and only merge when Adithya says so.
8. **Health-related content is general wellness only**, with a disclaimer. Never medical advice.
9. **Zero budget:** no paid services, analytics, trackers, or cookies without explicit approval.
10. **Merged steps go live on https://jathag.vercel.app straight away** (Decisions D-060). Until the v1.0 launch keep the whole site `noindex` + `robots.txt` disallow, and (from v0.2) show a "Beta — work in progress" notice. Only merge steps whose tests pass.

## Where things are
- `PROGRESS.md` — live build status (read first, update last)
- `docs/` — product brief, requirements (with requirement IDs and milestones), decisions log, roadmap (step IDs and "done when")
- `packages/engine` — calculation engine · `packages/content` — interpretation text · `apps/web` — Next.js site
- `packages/api` — server logic of the calculation API (step 0.2.12): chart + place-search handlers, error codes, and the "Which clock?" rule (`src/clock.ts`, D-082/D-086/D-090); see its README. `apps/web/app/api/chart` and `apps/web/app/api/places/search` are thin POST routes that call it (separate Vercel functions; only search loads the place index). Never log request bodies or put input in errors; responses are `no-store`
- Web build wiring for the engine (`apps/web/next.config.ts`): `sweph` kept out of the bundle, ephemeris files + sweph's Linux binary copied into the chart function, place index into the search function; `apps/web/bundler/engine-ephe-path-loader.cjs` lets Turbopack bundle the engine unchanged (the web app passes the ephemeris path, `apps/web/lib/server/paths.ts`)
- Engine internals (see `packages/engine/README.md`): only `src/ephemeris/sweph.ts` may import `sweph`; Swiss Ephemeris data files are pinned in `packages/engine/ephe/` (checksums tested); engine unit tests in `packages/engine/test/`
- Home page form (step 0.2.13): `apps/web/app/birth-form.tsx`, `place-search.tsx`, `clock-note-button.tsx`, `planet-table.tsx`; display-only helpers with tests in `apps/web/lib/` (`chart-format.ts` = IDs → words, degrees truncated to the second; `clock-note.ts`; `api-errors.ts`). The browser uses the API's clock rule via `apps/web/lib/clock-rule.ts` (imports `packages/api/src/clock.ts` by path; never import `@jathag/api` at runtime in page code, it pulls in the engine; `clock-rule.test.ts` checks this). No birth data in localStorage/cookies
- `apps/web/messages/en.json` — all website text (English); never hard-code page text in components (D-063)
- `data/places` — GeoNames place index: build script, pinned sources (`sources.json`, SHA-256), committed index `index/places.tsv.gz` (format 2), Mumbai list `mumbai-no-district.json`, GeoNames fixes `corrections.json` (with sources); raw downloads never committed, kept on GitHub Release `geonames-2026-11-21` (see its README) · `packages/places` — place search (no UI; never log queries) · `tests/reference` — JHora reference tests, 29 births (`raw/` = JHora answer key, `expected/` = clean data from `pnpm reference:convert`, `engine.test.ts` = engine tests switched on step by step, `api.test.ts` = R27–R29 end to end through the chart endpoint; R27–R29 have `iana: null` + a `clock`; see its README)
- `pnpm test` runs all tests (Vitest; includes `apps/web/lib/**/*.test.ts` and `tests/reference/web-table.test.ts`); `pnpm typecheck` type-checks the engine, `packages/places` and `packages/api`; CI runs lint, typecheck, test and build on every push and PR
- `notes/` — evaluation and research reports from Claude Code (e.g. `notes/0.2.1-ephemeris-evaluation.md`)
- Design: home page = "B2 — Split screen" (Decisions D-048); light mode uses gold accents, not blue (D-051). Design specs arrive in handoffs.
- Outer cards/boxes always use the `card-outer` class in `apps/web/app/globals.css` (gold border on hover/focus, D-066); inner cards use a plain border. No decorative numbers (D-067).
