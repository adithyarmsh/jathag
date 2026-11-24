# JATHAG – ROADMAP (v0.1 → v2.0)

Version 2.10 · 2026-11-24 · Companion to `requirements.md` and `decisions-log.md`. Live status of every step is tracked in `PROGRESS.md` at the repo root.

---

## Part 1 — Who does what

| Tag | Who | What they do | Where |
|---|---|---|---|
| **[YOU]** | Adithya, the founder | Decide, approve designs and content, run JHora, test on phone and laptop, approve Claude Code's permission prompts, merge PRs. Never needs to write code. | Everywhere |
| **[PROJECT]** | Claude in the "Jathag" Claude Project | Questions, decisions, requirements, design (Design System + Design canvas), interpretation content, reference test cases, handoffs for Claude Code, reviews, keeps docs updated (writes them into the local Jathag folder). | Claude desktop app, Project chat |
| **[CODE]** | Claude Code | All code, tests, PRs, deployments. Reads `CLAUDE.md` + `PROGRESS.md` at the start of every session; updates `PROGRESS.md` in every PR. | Claude Code, inside `/Users/adithya/Documents/Jathag` |

Claude (Project) and Claude Code do not share memory. The bridges are: the handoff you paste, the `docs/` folder, `CLAUDE.md` and `PROGRESS.md`.

### Glossary
- **Repository (repo):** the project folder plus full history, stored on GitHub (public, AGPL).
- **Branch:** a draft copy for one change. **Pull request (PR):** a request to merge a branch into `main`, showing exactly what changed. **Merge:** accept it.
- **main:** the official version; whatever is on `main` is what Vercel puts live.
- **CI:** GitHub's robot that builds and tests every change. Green tick = pass; red cross = don't merge.
- **Preview link:** a private test website Vercel builds for every branch.
- **noindex:** a tag that tells search engines not to list the site. Jathag is live and updated after every step, but stays unlisted until the v1.0 launch.
- **Handoff:** a paste-ready brief from [PROJECT] to [CODE]: what to build, acceptance criteria, files, requirement IDs.
- **Step ID:** `0.2.6` = milestone v0.2, step 6. Used everywhere: handoffs, PR titles, `PROGRESS.md`.

---

## Part 2 — The working loop (every step)

1. **[PROJECT]** Agree the next step from `PROGRESS.md`; write the handoff.
2. **[YOU]** Start a **new** Claude Code session in the Jathag folder; paste the handoff.
3. **[CODE]** Reads `CLAUDE.md` + `PROGRESS.md`, says where we are, creates a branch, builds, tests, updates `PROGRESS.md`, opens a PR.
4. **[YOU]** Check the green tick and the preview; ask for fixes or say merge.
5. **[CODE]** Merges after approval; confirms the deploy.
6. **[YOU]** Tell the Project chat it's merged (or paste Claude Code's final report).
7. **[PROJECT]** Updates docs/decisions if anything changed (writes them into the folder) and prepares the next handoff.

**Ground rules:** one step per branch · never merge a red cross · no secrets or real people's birth details in the public repo · product decisions only in the Project · if Claude Code's plan contradicts `docs/`, stop and bring it to the Project.

---

## Part 3 — Milestones at a glance

| Milestone | You can see… | Status |
|---|---|---|
| **v0.1 Coming soon** | Live holding page; repo, CI, auto-deploy; docs + progress tracking; B2-styled Coming Soon | 🔄 finishing |
| **v0.2 First real chart** | On the live site: enter real birth details, see planet positions that match JHora | ⏳ |
| **v0.3 Timing engine** | Dashas (3 levels), transits, Sade Sati, approximate-time results (as plain lists on the live site) | ⏳ |
| **v0.4 Design system + app shell** | Approved design system and screen mockups; real header/footer/theme; full B2 home form; saved profiles | ⏳ |
| **v0.5 Chart screens** | Overview, beautiful D1/D9 charts (South + North), planets table and planet pages | ⏳ |
| **v0.6 Timing screens** | Timeline with "you are here", transits, Sade Sati card | ⏳ |
| **v0.7 Interpretations** | ~600 approved readings, "i" pop-ups, Sources screen, life-area pages | ⏳ |
| **v0.8 Approx. time, settings, downloads** | Certain/uncertain markers, settings, PNG/PDF downloads, report-an-issue | ⏳ |
| **v0.9 Panchanga + legal** | Panchanga card; privacy, disclaimer, about, credits pages | ⏳ |
| **v1.0 Beta launch** | Quality pass; domain; Jathag (English web app) goes public | ⏳ |
| v1.1 | Beta feedback fixes; 16 divisional charts; accounts (sign in, save profiles and charts) | ⏳ |
| v1.2 | Mobile test build on your own phone | ⏳ |
| v1.3 | Mobile test version for a few friends | ⏳ |
| v1.4 | Basic Learn (scope decided after v1.1) | ⏳ |
| v1.5 | Basic Learn with more detail | ⏳ |
| v1.6 | Interactive Learn (web, iOS, Android) | ⏳ |
| v1.7 | Indian languages: secondary-language terms + Indian primary language | ⏳ |
| v1.8 | Indian languages, step by step | ⏳ |
| v1.9 | Final check of every language (terms, translations, readings) | ⏳ |
| **v2.0** | **Full setup live on App Store, Play Store and web; marketing push** | ⏳ |

Design (Track D) and content writing (Track C) can start early, in parallel with engine work; they are listed under the milestone where they must be finished. Time estimates: unknown until we measure pace during v0.2.

---

## v0.1 — Coming soon

| Step | Who | What | Done when |
|---|---|---|---|
| 0.1.1 | YOU | Install Homebrew, Node 24, pnpm, GitHub CLI; log in to GitHub | ✅ |
| 0.1.2 | YOU | Create public GitHub repo `adithyarmsh/jathag` | ✅ |
| 0.1.3 | CODE | Monorepo skeleton, LICENSE (AGPL), README, CLAUDE.md, CI | ✅ |
| 0.1.4 | CODE | Coming Soon page live on Vercel with auto-deploy (PR #1 = CI update) | ✅ |
| 0.1.5 | CODE | Indian-language words, bolder wordmark, dark/light switch (PR #2) | ✅ |
| 0.1.6 | PROJECT → CODE | Docs into `docs/`, `PROGRESS.md`, updated `CLAUDE.md` (PR #3) | Merged; Claude Code reports correct status at session start |
| 0.1.7 | PROJECT → CODE | Restyle Coming Soon in the B2 look, gold accents in both modes (PR #4) | Merged; live site matches B2 structure in both modes and on phone |
| 0.1.8 | YOU | Turn on two-factor login on GitHub and Vercel | Done |
| 0.1.9 | PROJECT → CODE | Docs sync: decisions D-061–D-064 (languages, mobile, language-ready, phone order) and milestones v1.3–v2.0 into the repo (PR #5) | Merged; PROGRESS.md lists milestones up to v2.0 |
| 0.1.10 | PROJECT → CODE | Home polish: star dust in light mode, hover highlight on outer cards, remove eyebrow line and "01/02/03", two-line footer with "Made by Adithya" (PR #6) | Merged; live site checked in both modes, phone + desktop |

## v0.2 — First real chart

| Step | Who | What | Done when |
|---|---|---|---|
| 0.2.1 | PROJECT | Handoff: evaluate Swiss Ephemeris JS/WebAssembly bindings (licence, upkeep, accuracy, runs on Vercel) — report only | Handoff given |
| 0.2.2 | CODE | Evaluation report | Report in Project chat |
| 0.2.3 | YOU + PROJECT | Choose the binding; log the decision | Logged |
| 0.2.4 | PROJECT | Design ~25 reference births + a JHora settings checklist + an export checklist covering positions, D1–D60, dashas (3 levels) and panchanga | Sheet delivered |
| 0.2.5 | YOU | Install JHora on the Windows laptop; apply the settings checklist | Settings screenshot matches |
| 0.2.6 | YOU | Enter all births; export everything on the checklist; send files to the Jathag folder | Files in `tests/reference/raw/` |
| 0.2.7 | CODE | Turn JHora exports into automated reference tests | Tests exist (failing is fine) |
| 0.2.8 | CODE | Engine core (outputs stable IDs, not English names — D-063): time zone → UTC; sidereal positions; sign/degree/nakshatra/pada/lord; retrograde; lagna; whole-sign houses; D9; dignity; graha drishti; combustion | Position tests pass (±1″, D-074; exact signs/nakshatras/padas/D9); dignity (D-076) and combustion (D-077) tested |
| 0.2.9 | YOU + PROJECT | Review the test report; explain any mismatches | Signed off |
| 0.2.10 | PROJECT + YOU | Research O-004 (pre-1955 Bombay/Calcutta local time); propose handling; JHora check (what its atlas fills in for old Indian dates) + reference births R27–R29 (Bombay Time, Calcutta Time, Delhi local time) | Decisions logged (D-082, D-083, D-085, D-086); R27–R29 answer key in `raw/` and checked by the Project |
| 0.2.11 | CODE | GeoNames place index (all Indian populated places + worldwide towns) + feasibility report on Vercel limits | Report reviewed |
| 0.2.12 | CODE | Calculation API (no logging of birth details); applies the "Which clock?" rule and passes the engine an explicit UTC offset to the second (D-082); adds R27–R29 to `births.json` and the reference tests (births without an IANA zone, times with seconds; D-085); all 29 births pass | Works on preview; logs checked |
| 0.2.13 | CODE | Minimal B2 form (replaces the Coming Soon card) + plain planet-position table; "Beta — work in progress" notice; short warning note for births in the historical-clock windows (FR-IN-09) | Live on jathag.vercel.app |
| 0.2.14 | YOU | Test 20 places you know; compare your own chart with JHora | Matches |
| 0.2.15 | CODE | Founder test fixes (D-094): smarter place search + hint, 12-hour time with bounded pick-lists and AM/PM buttons, day/month dropdowns with live date checks, earlier old-clock "i", place details with time zone and UTC offset, fixed header, footer version, "Coming soon" tags and calculation line, no duplicate cards, form in the first page load | Live; founder re-checks |

## v0.3 — Timing engine

| Step | Who | What | Done when |
|---|---|---|---|
| 0.3.1 | CODE | Vimshottari Mahadasha / Antardasha / Pratyantardasha + current period + coming up | Dasha tests pass (±1 day) |
| 0.3.2 | CODE | Transits: today's positions, houses from Moon and lagna, Saturn/Jupiter/Rahu-Ketu sign changes (10 years), Sade Sati periods | Tests pass |
| 0.3.2.1 | CODE | Basic South Indian Rasi (D-1) chart on the home page, between the form and the planet table: sign + house number from the Lagna in every box, planets with whole degrees and (R), Lagna marked, birth details in the centre; provisional styling (founder's request, D-101) | Live; founder checks it against his JHora chart |
| 0.3.3 | YOU | Spot-check 2–3 transit / Sade Sati dates in JHora | Match |
| 0.3.4 | CODE | Life-area window rule (period lord rules/occupies the area's houses), with reasons | Tests pass |
| 0.3.5 | PROJECT | Design 3–5 approximate-time test cases | Delivered |
| 0.3.5.1 | CODE | Basic South Indian chart: heading "South Indian Birth Chart" and no degrees in the boxes (founder's request, D-108) | Live; founder checks |
| 0.3.6 | CODE | Approximate-time scanner (segments, certain vs uncertain values, dasha date ranges) in the engine, plus `POST /api/chart/range` for a local from–to range, no screen (D-111) | Tests pass (the five 0.3.5 cases); whole-day scan timed on Vercel |
| 0.3.7 | CODE | Show all of the above as plain lists on the live site | Live |

## v0.4 — Design system + app shell

| Step | Who | What | Done when |
|---|---|---|---|
| 0.4.1 | YOU | References for the remaining screens (O-001); can start any time | Sent |
| 0.4.2 | PROJECT | Design System from B2 (tokens for dark + light with gold accents, type, spacing, components, "i" pop-up), contrast-checked | You approve |
| 0.4.3 | PROJECT | Mockups (phone + desktop): overview (the separate chart page, see 0.5.1), charts, planet page, timeline, transits, life area, profiles, settings, downloads, empty/error states | You approve |
| 0.4.4 | PROJECT | Design handoff (tokens, components, screen specs) | Given |
| 0.4.5 | CODE | App shell: header (Learn hidden), footer, theme toggle, fonts, layout grid; all UI text in message files (language-ready, D-063) | Merged |
| 0.4.6 | CODE | Full B2 birth form: exact time on the main form, the approximate-time modes (custom range, part-of-day presets, don't know) under Advanced settings (D-106; placement decided in the input design), place search, chart-style question (remembered), "Which clock?" question for affected births with "IST (or not sure)" pre-selected ("War Time (or not sure)" for 1942-09 – 1945-10) (FR-IN-09, D-082, D-086), validation | Merged |
| 0.4.7 | CODE | Profiles saved in the browser: list, open, edit, delete, notice | Merged |

## v0.5 — Chart screens

| Step | Who | What | Done when |
|---|---|---|---|
| 0.5.1 | CODE | Chart overview (bird's-eye view) on **its own page**, opened by "See my chart" (founder, 2026-11-21): the birth details at the top, editable there (changing them recalculates), with the **download buttons** next to them (working from 0.8.4); the chart and the other sections below. Until then (v0.2–v0.4) the table appears under the form on the home page | You compare with JHora |
| 0.5.2 | CODE | D1 + D9 chart diagrams, South + North, SVG, both themes; style toggle (replaces the basic chart from 0.3.2.1) | Visual match with JHora |
| 0.5.3 | CODE | Planets table + planet detail pages (numbers; text placeholders until v0.7) | Merged |

## v0.6 — Timing screens

| Step | Who | What | Done when |
|---|---|---|---|
| 0.6.1 | CODE | Dasha timeline (3 levels, you-are-here, coming up, short/medium/long labels) | Matches JHora for today |
| 0.6.2 | CODE | Transits screen + Sade Sati card + transit layer on the timeline | Merged |

## v0.7 — Interpretations (Track C; writing can start after v0.2)

| Step | Who | What | Done when |
|---|---|---|---|
| 0.7.1 | PROJECT | Content Style Guide (from the Saturn-in-7th sample) | You approve |
| 0.7.2 | PROJECT | Pilot batch of 10 entries with sources | You approve |
| 0.7.3 | PROJECT | Remaining entries in batches, tracked in a review sheet | Batches drafted |
| 0.7.4 | YOU | Review each batch for tone; spot-check sources | All approved |
| 0.7.5 | CODE | Content package + "i" pop-ups + Sources screen + life-area pages + timing windows on pages | Content-coverage test passes |

## v0.8 — Approximate time, settings, downloads

| Step | Who | What | Done when |
|---|---|---|---|
| 0.8.1 | CODE | Approximate-time experience (certain vs uncertain markers, ranges) | You test "Morning" for a known birth |
| 0.8.2 | CODE | Settings: beginner + advanced toggle, reset | Merged |
| 0.8.3 | PROJECT | Download checklist + PDF layout design | You approve |
| 0.8.4 | CODE | Downloads: chart-only → PNG; anything else → PDF; in-browser; the download buttons sit at the top of the chart page next to the birth details (0.5.1) and wherever else the site offers downloads | All combinations work on iPhone + Android |
| 0.8.5 | CODE | Report-an-issue link | Merged |

## v0.9 — Panchanga + legal

| Step | Who | What | Done when |
|---|---|---|---|
| 0.9.1 | CODE | Panchanga at birth (tithi, vara, nakshatra, yoga, karana) | Matches JHora exports |
| 0.9.2 | PROJECT | Five short "what this part means" explanations | You approve |
| 0.9.3 | CODE | Panchanga card | Merged |
| 0.9.4 | PROJECT | Privacy, Disclaimer, About, Credits pages + content licence options (O-003) | You decide |
| 0.9.5 | CODE | Legal pages live | Merged |
| 0.9.6 | YOU | Decide analytics (O-005) | Logged |

## v1.0 — Beta launch

| Step | Who | What | Done when |
|---|---|---|---|
| 1.0.1 | CODE | Accessibility + performance audit and fixes | Report clean |
| 1.0.2 | YOU | Real-device testing with a checklist from the Project | Done |
| 1.0.3 | PROJECT | Pre-launch review against Requirements §13 | All met |
| 1.0.4 | YOU | Buy the domain (optional); 5–10 beta testers lined up | Done |
| 1.0.5 | CODE | Public launch: remove `noindex` and the work-in-progress notice; connect the domain | Live and listed |
| 1.0.6 | YOU + PROJECT | Collect beta feedback; plan v1.1 | Done |

Marketing of the English web app may start any time after 1.0.5 (D-084). SEO/AEO and social media (Instagram) are planned in a separate, parallel chat after v1.0 (O-009); their technical groundwork goes into v0.4 and the 1.0.1 audit.

## v1.1 — Feedback fixes, divisional charts, accounts

| Step | Who | What | Done when |
|---|---|---|---|
| 1.1.1 | YOU + PROJECT | Sort beta feedback into fixes | List agreed |
| 1.1.2 | CODE | Beta feedback fixes | Merged |
| 1.1.3 | CODE | All 16 divisional charts (D1–D60) using JHora's default methods | Every reference test matches |
| 1.1.4 | PROJECT | 16 "what this chart is for" notes | You approve |
| 1.1.5 | CODE | Divisional chart selector beside the main chart, both styles | Merged |
| 1.1.6 | PROJECT | Accounts plan (O-008): sign-in options (email, Google, Apple, phone number, maybe Facebook), costs, privacy and DPDP rules, what is stored | You decide |
| 1.1.7 | CODE | Accounts: sign-in, profiles and charts saved and synced; moving browser-saved profiles into an account | Merged; tested on phone + desktop |
| 1.1.8 | PROJECT | Plan scope for Learn (v1.4–v1.6) and Indian languages (v1.7–v1.9) | You approve |

## After v1.1 (steps are detailed when we get there)

| Milestone | What | Rough steps |
|---|---|---|
| **v1.2** | Mobile test build | Decide framework (D-045, prototype comparison) → engine runs on the phone (offline) → install a test build on your own phone. A free Android test install is possible; iPhone test builds via TestFlight need the Apple Developer account (US$99/yr) |
| **v1.3** | Mobile test version for friends | Core screens on mobile → share test builds with a few friends → fix |
| **v1.4** | Basic Learn | Scope (decided after v1.1) → write → build, on web and mobile |
| **v1.5** | Basic Learn, more detail | Every chart term and detail: what it means and how it is calculated |
| **v1.6** | Interactive Learn | Simple, intuitive interactive explanations driven by the engine: how a chart is derived, how planets move between boxes, mahadasha and antardasha |
| **v1.7** | Indian languages, first version | Secondary-language setting (Hindi, Kannada, Telugu, Malayalam, Bengali or Tamil; off by default) showing chart terms next to the English → option to make an Indian language primary with English always secondary. Method decided after v1.1 |
| **v1.8** | Indian languages, step by step | Complete the interface and readings language by language |
| **v1.9** | Language verification | Reconciliation process and checkpoints so every term, translation and reading is correct in every language (native-speaker review) |
| **v2.0** | **Full launch** | Web and iOS/Android apps live in the App Store and Play Store; store accounts (Apple US$99/yr, Google US$25); marketing push |

- Revisit the Swiss Ephemeris licence and hosting plan if Jathag ever earns money (D-006, D-043).
