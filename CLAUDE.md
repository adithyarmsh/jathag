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
- `data/places` — GeoNames place index scripts · `tests/reference` — JHora reference tests
- Design: home page = "B2 — Split screen" (Decisions D-048); light mode uses gold accents, not blue (D-051). Design specs arrive in handoffs.
