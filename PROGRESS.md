# Jathag – Progress

> **Read this first in every session.** It is the single source of truth for where the build stands.
> Update it in the same PR as every change (see `CLAUDE.md`). Step IDs match `docs/roadmap.md`.

## ▶ Current position

| | |
|---|---|
| **Milestone** | v0.3 Timing engine — 🔄 in progress (v0.2 First real chart ✅) |
| **Current step** | 0.3.5 — Approximate-time test cases (Project step) |
| **Next step** | 0.3.6 — Approximate-time scanner |
| **Then** | v0.4 — Design system + app shell |
| **Blocked on** | Project: final 0.3.5 case files |
| **Live site** | https://jathag.vercel.app (birth form, South Indian Rasi chart + planet table, Beta notice, footer v0.3.4 (v0.3.5.1 once PR #19 is merged); the chart API also returns the dasha timeline, transits, Sade Sati and life-area links, not shown yet; hidden from search engines) |
| **Last updated** | 2026-11-24 |

Status key: ✅ done · 🔄 in progress · ⏳ not started · ⛔ blocked · ⏭ skipped (with reason)

---

## Milestones

| Milestone | Status |
|---|---|
| v0.1 Coming soon | ✅ |
| v0.2 First real chart | ✅ |
| v0.3 Timing engine | 🔄 |
| v0.4 Design system + app shell | ⏳ |
| v0.5 Chart screens | ⏳ |
| v0.6 Timing screens | ⏳ |
| v0.7 Interpretations | ⏳ |
| v0.8 Approximate time, settings, downloads | ⏳ |
| v0.9 Panchanga + legal | ⏳ |
| v1.0 Beta launch | ⏳ |
| v1.1 Feedback fixes, 16 divisional charts, accounts | ⏳ |
| v1.2 Mobile test build | ⏳ |
| v1.3 Mobile test version for friends | ⏳ |
| v1.4 Basic Learn | ⏳ |
| v1.5 Basic Learn, more detail | ⏳ |
| v1.6 Interactive Learn | ⏳ |
| v1.7 Indian languages, first version | ⏳ |
| v1.8 Indian languages, step by step | ⏳ |
| v1.9 Language verification | ⏳ |
| v2.0 Full setup live on App Store, Play Store and web | ⏳ |

---

## Steps

### v0.1 — Coming soon
- ✅ 0.1.1 Developer tools installed on the founder's Mac (Homebrew, Node 24, pnpm, GitHub CLI)
- ✅ 0.1.2 Public GitHub repo `adithyarmsh/jathag`
- ✅ 0.1.3 Monorepo skeleton, LICENSE (AGPL-3.0), README, CLAUDE.md, CI
- ✅ 0.1.4 Coming Soon page live on Vercel, auto-deploy from `main` (PR #1: CI actions → Node 24)
- ✅ 0.1.5 Indian-language words, bolder wordmark, dark/light switch (PR #2)
- ✅ 0.1.6 Docs into `docs/`, this PROGRESS.md, updated CLAUDE.md (PR #3)
- ✅ 0.1.7 Coming Soon restyled in the B2 look, gold accents in both modes; site `noindex` + `robots.txt`; page text in a message file (PR #4)
- ✅ 0.1.8 Founder: two-factor login on GitHub and Vercel (confirmed 2026-11-20)
- ✅ 0.1.9 Docs sync (D-061–D-064, milestones to v2.0) (PR #5)
- ✅ 0.1.10 Home polish: star dust in light mode, hover highlight on outer cards, no eyebrow line or "01/02/03", two-line footer with "Made by Adithya"; docs D-065–D-068 (PR #6)

### v0.2 — First real chart
- ✅ 0.2.1 Handoff: evaluate Swiss Ephemeris bindings (spike tested `sweph` and `swisseph-wasm` on a Vercel preview; spike branch deleted)
- ✅ 0.2.2 Evaluation report (`notes/0.2.1-ephemeris-evaluation.md`)
- ✅ 0.2.3 Choose binding: `sweph` behind an adapter; `swisseph-wasm` later for the phone (D-069)
- ✅ 0.2.4 Reference births + JHora settings/export checklists (25 synthetic births in `tests/reference/births.json`; D-070–D-072)
- ✅ 0.2.5 JHora 8.0 installed and configured (Windows laptop; settings in `tests/reference/raw/jhora-settings-jathag.ini`)
- ✅ 0.2.6 JHora exports for all reference births in `tests/reference/raw/` (D-073, D-074)
- ✅ 0.2.7 Reference tests created: converter → `tests/reference/expected/`, 283 self-checks passing, 180 engine tests written and switched off until 0.2.8 / 0.3.1 / 0.9.1 / 1.0.1
- ✅ 0.2.8 Engine core: time zone → UTC, sidereal positions, Lagna (D-073), whole-sign houses, D-9, dignity (D-076), aspects, combustion (D-077); `sweph` behind one adapter, data files pinned; all 100 position reference tests pass (every longitude within 0.31″ of JHora) (PR #9)
- ✅ 0.2.9 Test report reviewed: signed off by Adithya + Project; D-079 accepted; R26 added (D-080); pre-1900 tolerance D-081 (3″ / 12 h before 1900; R26 Moon +1.47″) (PR #10)
- ✅ 0.2.10 O-004 Bombay/Calcutta/War Time clocks decided (D-082, D-083, D-085, D-086); R27–R29 JHora answer key in `tests/reference/raw/` (raw only, added to the tests in 0.2.12)
- ✅ 0.2.11 GeoNames place index + feasibility: 558,033 Indian places + 230,005 worldwide towns; `packages/places` search (India first, 3-character minimum, ASCII labels, `isMumbai`/`isWestBengal`); index loads in 0.81 s / 463 MB on Vercel; raw files on GitHub Release `geonames-2026-11-21`; Kandivli corrected. Report reviewed and approved (D-087–D-089) (PR #11)
- ✅ 0.2.12 Calculation API: `POST /api/places/search` and `POST /api/chart` (private, `no-store`, error codes only, separate Vercel functions), "Which clock?" rule (`packages/api/src/clock.ts`, D-082/D-086/D-090), R27–R29 in the reference tests (29 births, all pass); chart 1.1 s cold / ≈0.5 s warm on Vercel, no birth data in logs. Report reviewed and approved (D-091) (PR #12)
- ✅ 0.2.13 Minimal form + planet table live: date/time/place form with type-ahead search, planet table (degrees cut to the second like JHora's digits), friendly error messages, first/second-time choice, old-clock "i" note, Beta notice; approved with founder wording (D-093) (PR #13)
- ✅ 0.2.14 Founder test passed: places worldwide found correctly; own chart matches JHora on all 10 rows to the second (D-094)
- ✅ 0.2.15 Founder test fixes (D-094, D-095): smarter place search (last word(s) as state/country, aliases UK/USA/UAE), 12-hour time with AM/PM buttons, day/month dropdowns with live checks, earlier old-clock "i", place details with UTC offset, fixed header, footer version, "Coming soon" tags + calculation line, honest hero intro, cards rendered once (PR #14)

### v0.3 — Timing engine
- ✅ 0.3.1 Dashas (3 levels): Vimshottari timeline + current period + coming up in the engine and chart API; all JHora dasha tests pass; dates on the clock at birth (D-098) (PR #15)
- ✅ 0.3.2 Transits + Sade Sati: positions now with houses from Moon and Lagna, Saturn/Jupiter/Rahu-Ketu sign changes incl. retrograde back-and-forth, Sade Sati periods from birth to +120 years with phases and status, in the engine and chart API; all tests pass; approved as built (D-100) (PR #16)
- ✅ 0.3.2.1 Basic South Indian chart (D-101): Rasi (D-1) chart drawn as SVG between the form and the planet table, house numbers from the Lagna, whole degrees and (R), Lagna corner mark, birth details in the centre, one-line key; matches the table for all 29 reference births; visible "Birth chart" header (PR #17). Founder's comparison with JHora passed (D-103)
- ✅ 0.3.3 JHora spot-check: all 8 transit / Sade Sati checks match JHora (D-103)
- ✅ 0.3.4 Life-area windows: graha → life-area links (rules or occupies one of the area's houses, Requirements §6.6; Rahu/Ketu by occupation only; no karaka; every reason listed) in the engine, period helper for all three dasha levels, chart API `lifeAreas`; all tests pass (PR #18)
- 🔄 0.3.5 Approximate-time test cases designed by the Project (D-107); the founder's JHora check passed; the Project is writing the final case files
- 🔄 0.3.5.1 Basic chart: heading "South Indian Birth Chart", degrees only in the planet table (chart boxes show abbreviations and (R)), planet labels larger (D-108) (PR #19). Live after merge; founder checks
- ⏳ 0.3.6 Approx-time scanner · ⏳ 0.3.7 Lists on the live site

### v0.4 — Design system + app shell
- ⏳ 0.4.1 References · ⏳ 0.4.2 Design System · ⏳ 0.4.3 Mockups · ⏳ 0.4.4 Design handoff · ⏳ 0.4.5 App shell · ⏳ 0.4.6 Full B2 form · ⏳ 0.4.7 Profiles

### v0.5 — Chart screens
- ⏳ 0.5.1 Overview · ⏳ 0.5.2 D1/D9 charts (South + North) · ⏳ 0.5.3 Planets table + pages

### v0.6 — Timing screens
- ⏳ 0.6.1 Dasha timeline · ⏳ 0.6.2 Transits + Sade Sati

### v0.7 — Interpretations
- ⏳ 0.7.1 Style guide · ⏳ 0.7.2 Pilot · ⏳ 0.7.3 Batches · ⏳ 0.7.4 Founder review · ⏳ 0.7.5 Content in app

### v0.8 — Approximate time, settings, downloads
- ⏳ 0.8.1 Approx-time UX · ⏳ 0.8.2 Settings · ⏳ 0.8.3 Download design · ⏳ 0.8.4 Downloads · ⏳ 0.8.5 Report an issue

### v0.9 — Panchanga + legal
- ⏳ 0.9.1 Panchanga calc · ⏳ 0.9.2 Explanations · ⏳ 0.9.3 Panchanga card · ⏳ 0.9.4 Legal drafts · ⏳ 0.9.5 Legal pages · ⏳ 0.9.6 Analytics decision

### v1.0 — Beta launch
- ⏳ 1.0.1 A11y/perf audit · ⏳ 1.0.2 Device testing · ⏳ 1.0.3 Pre-launch review · ⏳ 1.0.4 Domain + beta testers · ⏳ 1.0.5 Public launch · ⏳ 1.0.6 Beta feedback

### v1.1 — Feedback fixes, divisional charts, accounts
- ⏳ 1.1.1 Sort feedback · ⏳ 1.1.2 Feedback fixes · ⏳ 1.1.3 16 divisional charts · ⏳ 1.1.4 Chart notes · ⏳ 1.1.5 Chart selector · ⏳ 1.1.6 Accounts plan · ⏳ 1.1.7 Accounts · ⏳ 1.1.8 Plan Learn + languages

### v1.2–v2.0 (steps detailed later, see `docs/roadmap.md`)
- ⏳ v1.2 Mobile test build · ⏳ v1.3 Mobile test version for friends · ⏳ v1.4 Basic Learn · ⏳ v1.5 Basic Learn, more detail · ⏳ v1.6 Interactive Learn · ⏳ v1.7 Indian languages, first version · ⏳ v1.8 Indian languages, step by step · ⏳ v1.9 Language verification · ⏳ v2.0 Public apps + web, marketing push

---

## Open questions / blockers
- O-001 Design references for screens beyond the home page (founder, before v0.4)
- O-003 Content licence wording (before launch)
- O-005 Analytics: none vs cookieless (v0.9)
- O-006 Domain name (v1.0)
- O-007 Historical clocks for places now in Pakistan/Bangladesh and princely states (before v1.0)
- O-008 Accounts: sign-in options, costs, privacy (before v1.1)
- O-009 SEO/AEO and marketing (after v1.0)

---

## Session log (newest first)

| Date | Step | PR | What happened |
|---|---|---|---|
| 2026-11-24 | 0.3.5.1 | #19 | Approved by the Project (D-110). D-109 / D-110 committed unchanged. Squash-merged; stays 🔄 until the founder checks it live. |
| 2026-11-24 | 0.3.5.1 | #19 | Chart card heading now "South Indian Birth Chart"; degrees removed from the chart boxes (label = abbreviation + (R) when retrograde, never on Rahu/Ketu); planet labels now use the largest size that fits, from 14 down to 9.5 (all 29 reference births: 13–14 in every box, was 10–12); key line and screen-reader text unchanged (no degrees in them). Chart matches the table on sign, house and (R) for all 29 births. Only `apps/web`, PROGRESS.md, CLAUDE.md and the three docs (committed unchanged) changed. Waiting for Project review. |
| 2026-11-24 | 0.3.4 | #18 | Approved by the Project (D-105: built as reported, incl. the small choices). D-105 committed unchanged. Squash-merged. |
| 2026-11-24 | 0.3.4 | #18 | Life-area windows built: engine table of the 10 life areas (IDs only), each graha linked to the areas whose houses it rules or occupies with every reason (Rahu/Ketu by occupation only, no karaka, no score), `periodsForLifeArea` for all three dasha levels, chart API `lifeAreas` (once per graha, +0.3 KB compressed); engine 0.4.0. Hand-made tests + all 29 births re-derived from `expected/`; 1,265 tests green. D-103 / D-104 committed unchanged; 0.3.2.1 and 0.3.3 marked ✅ (D-103). Waiting for Project review. |
| 2026-11-23 | 0.3.2.1 | #17 | Approved by the Project with a visible 'Birth chart' header (D-102). D-102 committed unchanged. Squash-merged. |
| 2026-11-23 | 0.3.2.1 | #17 | Basic South Indian Rasi chart built on the home page (between the form and the table): fixed-sign layout, sign name + "Nth house" from the Lagna in each box, planets as "Sa 20° (R)" (whole degree cut off, like the table; never (R) on Rahu/Ketu), Lagna corner line + "La", date/time/place in the centre, key line underneath; text shrinks only when a box is crowded (even all 10 fit). Page now scrolls to the chart after calculating. Data in `apps/web/lib/south-chart.ts`, drawing in `apps/web/app/south-chart.tsx`; no engine/API/places/reference-data change. 1,205 tests green. D-101 / roadmap v2.7 / requirements v1.10 committed unchanged. Waiting for Project review. |
| 2026-11-22 | 0.3.2 | #16 | Approved by the Project (D-100: built as reported, incl. the six small choices). D-100 committed unchanged. Squash-merged. |
| 2026-11-22 | 0.3.2 | #16 | Transits + Sade Sati built: 9 grahas at the dashas' moment with houses from Moon and Lagna; sign-change search on Swiss Ephemeris output (20-day steps, stations found where they matter, to the second) for Saturn, Jupiter, Rahu/Ketu marked enters / moves back / enters again; Sade Sati periods from birth to +120 years with phases, dips and status; chart API `transits` section; engine 0.3.0. Project's Saturn example matches on every date. Natal positions and dashas unchanged; all tests green. Preview: chart 1.15 s cold / 0.50–0.58 s warm (transits add 65–90 ms of work), 120 KB raw / 15.5 KB sent, logs clean, page unchanged. 1,162 tests green. Report in `notes/0.3.2-transits.md`; JHora checklist for 0.3.3 in `notes/0.3.3-jhora-checklist.md`. D-099 / requirements v1.9 committed unchanged. Waiting for Project review. |
| 2026-11-22 | 0.3.1 | #15 | Approved by the Project (D-098: dasha dates on the clock at birth, like JHora; display of births after the calculation moment decided in 0.3.7). D-098 committed unchanged. Squash-merged. |
| 2026-11-22 | 0.3.1 | #15 | Vimshottari dashas built: engine timeline (9/81/729 periods from the true start before birth, whole-second UTC), current period + coming up for a moment passed in, dasha year setting (365.25/360/365.2422), chart API `dashas` section; JHora dasha tests on and passing for all 29 births (max 30.7 min from 1900, 4.6 h for 1853); JHora's dates use the fixed offset at birth (D-097 research); build loader replaced by a small engine change; engine 0.2.0; 1,107 tests green. Preview: chart 1.01 s cold / ≈0.3 s warm, 106 KB raw / 13 KB sent, logs clean; page unchanged. D-096/D-097 docs committed unchanged. Waiting for Project review. |
| 2026-11-22 | 0.2.15 | #14 | Approved by the Project (D-095) with two additions: hero intro now "…and soon explains it in short, honest, modern language."; country aliases UK/USA/UAE in place search ("london uk", "dallas usa", "dubai uae") with tests. D-095 docs committed unchanged. Squash-merged; v0.2 complete. Next: 0.3.1 Dashas. |
| 2026-11-21 | 0.2.15 | #14 | Founder test fixes built (D-094 items 1–10): place search retries with the last word(s) as state/country ("london canada"), 12-hour time with bounded pick-lists and AM/PM buttons (none pre-selected), Day dropdown with only real days, live checks, "i" from the date alone ("If born in India"), place details with the UTC offset the chart uses, sticky header, footer version, "Coming soon" tags, cards rendered once. The form was already in the first HTML (10b, nothing to fix). 1,010 tests green. D-094 docs committed unchanged. Waiting for Project review. |
| 2026-11-21 | 0.2.13 | #13 | Report approved by the Project (D-093): form title "Generate Your Chart", new Beta notice and page description; D-093 docs committed unchanged. Squash-merged; live on jathag.vercel.app. Next: 0.2.14 founder test. |
| 2026-11-21 | 0.2.13 | #13 | Minimal form + planet table built: date/time/place form with type-ahead search, friendly message for every API error code, first/second-time choice when clocks went back, old-clock "i" note worked out in the browser with the API's own rule, plain planet table (degrees cut to the second, like JHora's digits), Beta notice. Table matches JHora for all 29 births (244 of 290 degrees identical, rest 1″). 903 tests green. D-092 docs committed unchanged. Waiting for Project review. |
| 2026-11-21 | 0.2.12 | #12 | Report reviewed and approved by the Project; D-091 (edge cases: start of 1800, midnight 1906-01-01, pre-1906 IST default accepted; matched old name in search results deferred to 0.4.6) committed. Squash-merged; 0.2.12 done. Next: 0.2.13 Minimal form + planet table. |
| 2026-11-21 | 0.2.12 | #12 | Calculation API built: place search and chart endpoints (separate Vercel functions; only search loads the index), "Which clock?" rule with tests for every window, boundary and overlap (D-090 committed unchanged), R27–R29 added (29 births, R29 at 3″; all pass, max 0.61″). On the Vercel preview: chart 1.1 s cold / ≈0.5 s warm, search 2.4 s cold / ≈0.5 s warm, logs hold no birth data or search text (first preview crashed search: it imported the engine; fixed + test). 790 tests green. Report in `notes/0.2.12-calculation-api.md`; waiting for Project review. |
| 2026-11-21 | 0.2.11 | #11 | Report reviewed and approved by Adithya + Project (D-089: odd Indian alternate names stay; Mumbai places rank as neighbourhoods accepted). Squash-merged; 0.2.11 done. Next: 0.2.12 Calculation API. |
| 2026-11-21 | 0.2.11 | #11 | Second follow-up (D-088): Indian places first (all names), foreign places after (main name only; their alternate names dropped), ties city/neighbourhood → village → abandoned, Mumbai places rank as neighbourhoods (founder's choice); Kandivli coordinates corrected via `corrections.json` (Wikipedia/Wikidata). Index 21.3 MB, loads in 0.81 s / 463 MB on Vercel. Waiting for Project review. |
| 2026-11-21 | 0.2.11 | #11 | Follow-up after Project review (D-087): ASCII labels with repeats collapsed and "District"/"Division" dropped; population-first order; 3-character minimum; Mumbai list (4 places) + `isMumbai`/`isWestBengal`; index format 2 loads in 0.86 s / 518 MB on Vercel (was 5–9 s / 680 MB); raw GeoNames files on GitHub Release `geonames-2026-11-21`. Waiting for Project review. |
| 2026-11-21 | 0.2.11 | #11 | GeoNames place index built (558,033 Indian places + 230,005 worldwide towns), search package `packages/places` with tests; measured on a Vercel spike (searches < 1 ms, but loading takes 5–9 s, fixable). Report ready for review; not merged. |
| 2026-11-21 | 0.2.10 | — | Bombay/Calcutta/War Time clock rules decided (D-082–D-086); R27–R29 JHora answer key added (raw only) |
| 2026-11-20 | 0.2.9 | #10 | Project decision D-081: reference tests allow 3″ (dashas 12 h) for births before 1900, 1″ / 1 h unchanged from 1900; exact checks unchanged. R26 now passes; 0.2.9 signed off. |
| 2026-11-20 | 0.2.9 | #10 | R26 (New Haven, 1853) added to the reference tests; converter now reads coordinates with seconds from the `.jhd`; all self-checks pass for 26 births and R01–R25 data unchanged. Engine matches JHora for R26 except the Moon (+1.47″ > 1″ limit), so 0.2.9 is not signed off; PR left open for the Project. |
| 2026-11-20 | 0.2.8 | #9 | Engine core built: positions, Lagna, houses, D-9, dignity, aspects, combustion, local time → UTC; JHora position tests switched on and passing for all 25 births (constant ≈ −0.14″ offset, max 0.31″); hand-made dignity/aspect/combustion/time-zone tests added. After Project review: `@types/node` added and engine type check now runs in CI; D-078 logged. |
| 2026-11-20 | 0.2.3–0.2.7 | #8 | Decisions D-069–D-074 logged; JHora answer key for 25 synthetic births added; converter turns it into clean test data; 283 self-checks pass; 180 engine tests wait (switched off) for the engine; tests now run in CI. |
| 2026-11-20 | 0.2.1–0.2.2 | #7 | Swiss Ephemeris options compared; `sweph` and `swisseph-wasm` both ran on a Vercel preview and agreed within 0.004″; report recommends `sweph` behind an adapter. Choice pending (0.2.3). |
| 2026-11-20 | 0.1.10 | #6 | Home polish (star dust in both modes, gold hover border on outer cards, numbers and eyebrow line removed, "Made by Adithya" footer) plus docs D-065–D-068. Founder confirmed two-factor login (0.1.8). v0.1 complete. |
| 2026-11-20 | 0.1.9 | #5 | Docs synced from the Claude Project: decisions D-061–D-064 (languages, mobile, language-ready, phone order), requirements FR-LANG-01/02, milestones up to v2.0. |
| 2026-11-20 | 0.1.7 | #4 | Coming Soon page redesigned in the B2 split-screen look with gold accents in dark and light; site hidden from search engines; page text moved to `apps/web/messages/en.json`; READMEs use milestone names. |
| 2026-11-20 | 0.1.6 | #3 | Docs, PROGRESS.md and updated CLAUDE.md added (prepared in the Claude Project). |
| 2026-11-16 | 0.1.5 | #2 | Indian-language words, bolder wordmark, dark/light switch. |
| 2026-11-16 | 0.1.4 | #1 | CI actions updated to Node 24 versions; first automatic production deploy confirmed. |
| 2026-11-16 | 0.1.3 | — | Initial setup pushed to `main` (the only direct push allowed); site live on Vercel. |
