# Jathag – Progress

> **Read this first in every session.** It is the single source of truth for where the build stands.
> Update it in the same PR as every change (see `CLAUDE.md`). Step IDs match `docs/roadmap.md`.

## ▶ Current position

| | |
|---|---|
| **Milestone** | v0.2 First real chart — 🔄 in progress |
| **Current step** | 0.2.9 — Test report reviewed (Adithya + Claude Project) |
| **Next step** | 0.2.10 — O-004 Bombay/Calcutta time decision |
| **Then** | 0.2.11 — GeoNames place index + feasibility |
| **Blocked on** | Project review of the 0.2.8 report, then Adithya's approval to merge PR #9 (D-075) |
| **Live site** | https://jathag.vercel.app (Coming Soon in the B2 design; hidden from search engines) |
| **Last updated** | 2026-11-20 |

Status key: ✅ done · 🔄 in progress · ⏳ not started · ⛔ blocked · ⏭ skipped (with reason)

---

## Milestones

| Milestone | Status |
|---|---|
| v0.1 Coming soon | ✅ |
| v0.2 First real chart | 🔄 |
| v0.3 Timing engine | ⏳ |
| v0.4 Design system + app shell | ⏳ |
| v0.5 Chart screens | ⏳ |
| v0.6 Timing screens | ⏳ |
| v0.7 Interpretations | ⏳ |
| v0.8 Approximate time, settings, downloads | ⏳ |
| v0.9 Panchanga + legal | ⏳ |
| v1.0 Divisional charts + Beta launch | ⏳ |
| v1.1 Feedback fixes | ⏳ |
| v1.2 Basic Learn | ⏳ |
| v1.3 Mobile test build | ⏳ |
| v1.4 Mobile test version for friends | ⏳ |
| v1.5 Interactive Learn | ⏳ |
| v1.6–v1.9 Indian languages, step by step | ⏳ |
| v2.0 Multilingual Jathag + public apps | ⏳ |

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
- ✅ 0.2.8 Engine core: time zone → UTC, sidereal positions, Lagna (D-073), whole-sign houses, D-9, dignity (D-076), aspects, combustion (D-077); `sweph` behind one adapter, data files pinned; all 100 position reference tests pass (every longitude within 0.31″ of JHora) (PR #9, awaiting review)
- ⏳ 0.2.9 Test report reviewed
- ⏳ 0.2.10 O-004 Bombay/Calcutta time decision
- ⏳ 0.2.11 GeoNames place index + feasibility
- ⏳ 0.2.12 Calculation API
- ⏳ 0.2.13 Minimal form + planet table live on the site
- ⏳ 0.2.14 Founder test: 20 places + own chart vs JHora

### v0.3 — Timing engine
- ⏳ 0.3.1 Dashas (3 levels) · ⏳ 0.3.2 Transits + Sade Sati · ⏳ 0.3.3 JHora spot-check · ⏳ 0.3.4 Life-area windows · ⏳ 0.3.5 Approx-time test cases · ⏳ 0.3.6 Approx-time scanner · ⏳ 0.3.7 Lists on the live site

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

### v1.0 — Divisional charts + Beta launch
- ⏳ 1.0.1 16 divisional charts · ⏳ 1.0.2 Chart notes · ⏳ 1.0.3 Chart selector · ⏳ 1.0.4 A11y/perf audit · ⏳ 1.0.5 Device testing · ⏳ 1.0.6 Pre-launch review · ⏳ 1.0.7 Domain + beta testers · ⏳ 1.0.8 Go live · ⏳ 1.0.9 Feedback

---

## Open questions / blockers
- O-001 Design references for screens beyond the home page (founder, before v0.4)
- O-003 Content licence wording (before launch)
- O-004 Pre-1955 Bombay/Calcutta local time (during v0.2)
- O-005 Analytics: none vs cookieless (v0.9)
- O-006 Domain name (v1.0)

---

## Session log (newest first)

| Date | Step | PR | What happened |
|---|---|---|---|
| 2026-11-20 | 0.2.8 | #9 | Engine core built: positions, Lagna, houses, D-9, dignity, aspects, combustion, local time → UTC; JHora position tests switched on and passing for all 25 births (constant ≈ −0.14″ offset, max 0.31″); hand-made dignity/aspect/combustion/time-zone tests added. |
| 2026-11-20 | 0.2.3–0.2.7 | #8 | Decisions D-069–D-074 logged; JHora answer key for 25 synthetic births added; converter turns it into clean test data; 283 self-checks pass; 180 engine tests wait (switched off) for the engine; tests now run in CI. |
| 2026-11-20 | 0.2.1–0.2.2 | #7 | Swiss Ephemeris options compared; `sweph` and `swisseph-wasm` both ran on a Vercel preview and agreed within 0.004″; report recommends `sweph` behind an adapter. Choice pending (0.2.3). |
| 2026-11-20 | 0.1.10 | #6 | Home polish (star dust in both modes, gold hover border on outer cards, numbers and eyebrow line removed, "Made by Adithya" footer) plus docs D-065–D-068. Founder confirmed two-factor login (0.1.8). v0.1 complete. |
| 2026-11-20 | 0.1.9 | #5 | Docs synced from the Claude Project: decisions D-061–D-064 (languages, mobile, language-ready, phone order), requirements FR-LANG-01/02, milestones up to v2.0. |
| 2026-11-20 | 0.1.7 | #4 | Coming Soon page redesigned in the B2 split-screen look with gold accents in dark and light; site hidden from search engines; page text moved to `apps/web/messages/en.json`; READMEs use milestone names. |
| 2026-11-20 | 0.1.6 | #3 | Docs, PROGRESS.md and updated CLAUDE.md added (prepared in the Claude Project). |
| 2026-11-16 | 0.1.5 | #2 | Indian-language words, bolder wordmark, dark/light switch. |
| 2026-11-16 | 0.1.4 | #1 | CI actions updated to Node 24 versions; first automatic production deploy confirmed. |
| 2026-11-16 | 0.1.3 | — | Initial setup pushed to `main` (the only direct push allowed); site live on Vercel. |
