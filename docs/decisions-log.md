# JATHAG – DECISIONS LOG

Last updated: 2026-11-20

Purpose: every product and technical decision, when it was made, and why. Newest entries at the bottom. If a decision changes, we do not delete it — we add a new entry that supersedes it and mark the old one "Superseded by D-xxx".

Status key: **Decided** · **Deferred** (decision intentionally postponed, with a trigger for when to revisit) · **Superseded**

---

## A. Strategy and constraints

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-001 | 2026-11-16 | Web app first. iOS and Android only after the web app is finalised. | From the brief. One platform at a time keeps the project manageable for a non-engineer founder. | Decided |
| D-002 | 2026-11-16 | Budget is zero. Only allowed spend: a domain name (optional). Apple (US$99/yr) and Google Play (US$25 one-time) fees accepted later, when mobile starts. | Founder constraint. Every tool and service must have a free tier that fits. | Decided |
| D-003 | 2026-11-16 | Web v1 is free with no ads and no payments. | Keeps hosting on free tiers (non-commercial) and avoids payments, tax and compliance work. | Decided |
| D-004 | 2026-11-16 | Workflow: Claude Project = decisions, requirements, design, content, handoffs. Claude Code = all code, tests and deployment, in a GitHub repository. | Code needs version history, tests and a persistent repository; planning needs project knowledge. | Decided |
| D-005 | 2026-11-16 | Founder's dev machine: M4 MacBook Air. JHora reference charts run on the founder's old Windows laptop. | JHora is Windows-only; the Mac is also required later for iOS builds. | Decided |

## B. Calculation engine

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-006 | 2026-11-16 | Ephemeris: **Swiss Ephemeris**, used under the **AGPL** licence. Consequence: Jathag's source code is public (open source). Revisit buying the CHF 700 Professional licence if Jathag ever earns money. | Only option that is both free and accurate enough. The free MIT alternative (Astronomy Engine, ±1 arcminute) would shift dasha dates by ~9 days per arcminute of Moon error. | Decided (revisit if monetised) |
| D-007 | 2026-11-16 | Never write astronomical calculations from scratch. Thin, standard formulas around the library (e.g. converting to sidereal) must be verified by the reference tests. | Project rule; accuracy is the core promise. | Decided |
| D-008 | 2026-11-16 | Ayanamsa default: Lahiri (Chitrapaksha), using the exact variant that matches JHora's Lahiri setting. Advanced users may choose others (only Lahiri is reference-tested in v1). | From brief; "correct" = matches JHora. | Decided |
| D-009 | 2026-11-16 | Rahu/Ketu: **Mean node** by default; True node available in advanced settings. | Most common default in Indian practice. Reference tests use Mean. | Decided |
| D-010 | 2026-11-16 | House system: **Whole sign only** in v1. | Standard for Parashari Rasi analysis; one unambiguous answer per house. | Decided |
| D-011 | 2026-11-16 | Dasha year length: **365.25 days** default; configurable in advanced settings. | Most widely used convention. To be cross-checked against JHora's setting when building reference cases. | Decided |
| D-012 | 2026-11-16 | Aspects: **classical graha drishti only** — all planets aspect the 7th; Mars also 4th & 8th; Jupiter 5th & 9th; Saturn 3rd & 10th. No Rahu/Ketu aspects. No Uranus/Neptune/Pluto anywhere. | Least disputed rules; disputed ones can become settings later. | Decided |
| D-013 | 2026-11-16 | Definition of correct: output matches Jagannatha Hora (same settings) within ±1 arcminute on longitudes and ±1 day on dasha dates. Claude designs ~25 edge-case reference births; founder runs them in JHora; Claude Code turns them into automated tests that must always pass. | A test is only as good as its reference; edge cases catch real bugs. | Decided |
| D-014 | 2026-11-16 | Calculations run on our server (an API), not in the browser. Birth inputs are never stored on the server. | One place to test and update; no large ephemeris files sent to every visitor; privacy by default. | Decided |
| D-015 | 2026-11-16 | Pratyantardasha is calculated and shown when a user taps into an Antardasha. (Updates brief default "Mahadasha + Antardasha".) | Founder's timing definition requires all three levels. | Decided |

## C. Birth time and place

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-016 | 2026-11-16 | Unknown/approximate birth time is allowed. User chooses: exact time, a custom range (e.g. 7:00–8:00), a preset (Morning 06–12, Afternoon 12–17, Evening 17–21, Night 21–06), or "don't know at all" (full day). | Blocking these users loses them; a fake midpoint chart misleads them. | Decided (preset times superseded by D-050) |
| D-017 | 2026-11-16 | For a time range, the engine calculates across the whole range and the app shows what is **certain** vs **uncertain** (e.g. "Ascendant is Leo or Virgo"), never a silently chosen midpoint. | The ascendant changes roughly every 2 hours; honesty protects credibility. | Decided |
| D-018 | 2026-11-16 | Place search uses the free **GeoNames** dataset, as comprehensive as technically possible (all populated places in India incl. villages, plus worldwide towns). Manual latitude/longitude/time-zone entry available as a fallback in advanced settings. Attribution to GeoNames shown in the app. | Zero budget (no paid geocoding API); diaspora users need worldwide coverage. | Decided |
| D-019 | 2026-11-16 | Time zones via the IANA time zone database with historical offsets (incl. Indian War Time 1942–45). | From brief. | Decided |

## D. Product scope and users

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-020 | 2026-11-16 | Target user: curious people from late teens (16+) upward, just getting into life, no astrology training; India and the Indian diaspora. Advanced settings hidden behind a toggle. | Sets depth, vocabulary and defaults; diaspora means foreign time zones/DST must work from day one. | Decided |
| D-021 | 2026-11-16 | Content must be suitable for 16–17-year-olds (no blunt heavy topics). Age verification needed when accounts arrive (DPDP: under-18 data needs parental consent). | Legal and audience fit. | Decided |
| D-022 | 2026-11-16 | Multiple saved profiles (unlimited), each named by the user. Web v1: saved in the user's browser only. Accepted limitation: clearing browser data deletes them; no sync across devices. | No accounts in web v1; privacy by default. | Decided |
| D-023 | 2026-11-16 | No accounts in web v1. Accounts (shared across web and mobile) are introduced when mobile development starts. Supabase deferred until then. | Saves cost and compliance work; matches private-by-default references. | Deferred (trigger: mobile phase) |
| D-024 | 2026-11-16 | **Downloads instead of profile export/import.** User ticks what to include: birth chart, calculations, interpretations, timing, etc. Chart only → image (PNG). Anything more → PDF. Generated in the browser. | Founder: users want to save/share their chart, not move data files around. | Decided |
| D-025 | 2026-11-16 | Offline mode: mobile apps only, never the web app. Engine kept as plain TypeScript so it can later run on the phone. | Founder decision; keeps the future door open. | Decided |
| D-026 | 2026-11-16 | Timing scope v1 (calculation focus): full chronological Mahadasha → Antardasha → Pratyantardasha timeline (past, current, future) with exact dates; current period highlighted; upcoming transition dates; major transits (Saturn, Jupiter, Rahu/Ketu sign changes); Sade Sati periods. | Calculation is the main focus; these are deterministic and testable. | Decided |
| D-027 | 2026-11-16 | Timing window definitions: **Short-term = Pratyantardasha** (weeks–months), **Medium-term = Antardasha** (months–years), **Long-term = Mahadasha** (years). | Clear, deterministic, explainable. | Decided |
| D-028 | 2026-11-16 | Life-area timing windows in v1 use one simple rule: a period is highlighted for a life area when its ruling planet rules or occupies that life area's house(s). Transit-combined windows deferred to a later phase. | Keeps v1 deterministic and explainable via the "i" button. | Decided |

## E. Interpretation content

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-029 | 2026-11-16 | Interpretations in v1 are **basic, not in-depth**. Calculation accuracy is the priority. | Founder decision. | Decided |
| D-030 | 2026-11-16 | Style follows the Saturn-in-7th sample in the brief: short, engaging, scannable, simple modern language, a "In a nutshell" takeaway, never childish, always reminds that the whole chart matters. | Founder-provided sample. | Decided |
| D-031 | 2026-11-16 | Tone: constructive, no fear-mongering, no fear-selling. Doshas stated factually with balancing context. No remedies (gemstones, pujas) in v1. | Differentiates from cluttered, fear-based sites. | Decided |
| D-032 | 2026-11-16 | Interpretations are hand-written blocks assembled by transparent rules. No AI-generated readings. Each conclusion has an "i" button that opens a pop-up showing which chart factors produced it. | Deterministic, reviewable, testable; brief excludes AI readings for now. | Decided |
| D-033 | 2026-11-16 | Claude drafts all content. Every entry is tagged with the classical source it rests on (e.g. BPHS chapter/verse). Sources are viewable on a separate, low-prominence "Sources" screen; the main screens show only the modern rewording. | Free alternative to a paid reviewer; makes every claim checkable. | Decided |
| D-034 | 2026-11-16 | Content is written in **original words**. The Sources screen shows citations (text, chapter, verse) and our own summary — never copied modern English translations, which are copyrighted. Original Sanskrit verse references are fine. | Copyright. | Decided |
| D-035 | 2026-11-16 | Launch labelled **Beta**, with a "Report an issue" link on every reading. | Catch content errors from real users without a paid reviewer. | Decided |
| D-036 | 2026-11-16 | Health content is general wellness only, with a disclaimer; never medical advice. | Project rule. | Decided |

## F. Design

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-037 | 2026-11-16 | Chart style: asked once at onboarding ("Which chart style did you grow up with?"), default South Indian, remembered, changeable in settings. | Preference splits by region; guessing annoys half of users. | Superseded by D-049 |
| D-038 | 2026-11-16 | Design process: (1) founder collects references → (2) Claude builds a Design System in the Project → (3) Claude mocks up core screens on a Design canvas → (4) founder approves → (5) handoff to Claude Code. Design runs in parallel with engine work. | Consistent premium look; no screen-by-screen drift. | Decided |
| D-039 | 2026-11-16 | v1 visuals use typography, colour and fine lines only. No commissioned illustrations (zero budget). Painted/celestial imagery may come later. | Budget; avoids blocking v1. | Decided |
| D-040 | 2026-11-16 | Chart diagrams (North and South Indian) are drawn by code (SVG), not images. | Crisp at any size; works in dark and light mode; downloadable. | Decided |
| D-041 | 2026-11-16 | Fonts from Google Fonts (free, open licence). | Zero budget. | Decided |

## G. Technology and hosting

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-042 | 2026-11-16 | Stack (validated): Next.js + React + TypeScript; Tailwind CSS + shadcn/ui; calculation engine as a separate TypeScript package with no UI code; interpretation content as a separate data package. | From brief; separation keeps calculation and interpretation independent and reusable on mobile. | Decided |
| D-043 | 2026-11-16 | Hosting: **Vercel Hobby (free)**. Allowed because Jathag web v1 is non-commercial (free, no ads, no payments). If Jathag ever earns money in any form (incl. donations), we must move to Vercel Pro (US$20/month) or another host. Cloudflare Pages/Workers is the free fallback, but its free plan's 10 ms CPU limit per request may be too tight for chart calculations — to be tested if needed. | Founder already knows Vercel; verified against Vercel's fair use terms. | Decided |
| D-044 | 2026-11-16 | Code lives in a **public** GitHub repository (required by AGPL). The app shows a "Source code" link. Interpretation content to be licensed separately from the code (exact licence wording to be confirmed before launch). | AGPL compliance; protect written content as far as legally possible. | Decided (content licence wording open) |
| D-045 | 2026-11-16 | Mobile framework (Capacitor vs React Native/Expo) decided after the web app is stable. | "Must feel like a real app" points to native; decision is cheap to defer if engine is pure TypeScript. | Deferred (trigger: web v1 stable) |

---

## H. Decisions of 2026-11-16 (evening) and 2026-11-20

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-046 | 2026-11-16 | Tagline: **"Know your chart, not just your sign."** | Founder's choice; says what makes Jathag different. | Decided |
| D-047 | 2026-11-16 | Phase 0 / v0.1 setup done: Next.js 16 + Tailwind, fonts Cormorant Garamond + Inter + Noto Serif Tamil (self-hosted at build), Next.js build telemetry off in CI. Live at https://jathag.vercel.app, auto-deploy from `main`. | Built by Claude Code; Cormorant has no Tamil glyphs; telemetry off fits the no-tracking rule. | Decided |
| D-048 | 2026-11-20 | Home page design = **"B2 — Split screen: Distilled layout, B's type and dark mode"** (Design canvas "Jathag home page"). One screen: header (wordmark + Beta, Learn, About, Profile, theme toggle), left hero (Indian-language words for "birth chart", tagline, short intro, three "What you'll get" cards), right card with the birth-details form, footer (About, Disclaimer, Privacy, Sources & credits, Source code). | Founder's choice from 4 explored directions. | Decided |
| D-049 | 2026-11-20 | **No onboarding screens.** Chart style is question 5 of the birth form ("Which chart style did you grow up with?"). First chart: South Indian pre-selected. After that the form pre-selects the user's last choice. It is always visible and editable on the form, and also changeable in Settings and on the chart. | Fewer clicks to the first chart; B2 already covers welcome and privacy. Supersedes D-037. | Decided |
| D-050 | 2026-11-20 | Part-of-day presets: **Morning 6 am–12 noon, Afternoon 12 noon–4 pm, Evening 4 pm–8 pm, Night 8 pm–6 am.** | Matches B2 design; founder's choice. Supersedes preset times in D-016. | Decided |
| D-051 | 2026-11-20 | Light mode keeps **warm gold accents** (a darker gold for readable text on the off-white background). B2's blue light-mode accent is NOT adopted; B2 is used for structure and layout. Dark mode = B2's midnight + gold. | Brand direction in the brief; B2 chosen for structure. | Decided |
| D-052 | 2026-11-20 | **Divisional charts in v1.0:** all 16 standard charts (Shodashavarga: D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60) calculated, displayed in both styles, each with a short "what this chart is for" note. Detailed per-planet readings only for D1 and D9. Each chart uses JHora's default calculation method and is reference-tested. | Calculation is cheap once D1 is right; per-planet readings for 16 charts (~1,700 entries) are too much for v1. Some charts (e.g. D2, D3) have several traditional methods, so matching JHora defines "correct". | Decided |
| D-053 | 2026-11-20 | **Panchanga at birth** (tithi, vara, nakshatra, yoga, karana) calculated, reference-tested and shown in **v0.9**, with short explanations of each of the five parts. | Pure calculation from Sun and Moon positions; founder's feature request. | Decided |
| D-054 | 2026-11-20 | **Learn section:** basic Learn in **v1.2**, interactive Learn (e.g. how the Moon, Sun and lagna move through the chart; eclipses) in **v1.5**. What goes in each is decided after v1.0. The "Learn" link in the header is hidden until v1.2. | Focus until v1.0 is a solid, accurate chart. | Decided |
| D-055 | 2026-11-20 | Roadmap reorganised into **version milestones v0.1 → v1.5**, each with numbered steps (e.g. step 0.2.6 = milestone v0.2, step 6). Replaces the earlier Phase 0–9 numbering. | Easier to review progress and to build in clean steps. | Decided |
| D-056 | 2026-11-20 | **Progress tracking:** `PROGRESS.md` in the repo is the source of truth for build status and is updated in the same PR as every change. `CLAUDE.md` tells every Claude Code session to read it first and update it last. A new Claude Code session is started for each step (or when context gets very long). | Gives every new session (and the founder) an exact picture of where the project stands. | Decided |
| D-057 | 2026-11-20 | **Docs sync:** canonical product docs (Brief, Requirements, Decisions Log, Roadmap) live in the Claude Project; mirrored in the repo's `docs/`. When docs change, Claude (Project) writes the new versions into the local Jathag folder and Claude Code commits them through a PR. | One source of truth for decisions; Claude Code always works from the latest docs. | Decided |
| D-058 | 2026-11-20 | The **production home page stays "Coming Soon" until the v1.0 launch.** Work in progress is viewed by the founder on an unlisted, no-index preview route (default `/preview`) or on Vercel preview links. | Visitors never see a half-built app. | Superseded by D-060 |
| D-060 | 2026-11-20 | **No hidden preview route.** Every completed, merged step goes live on https://jathag.vercel.app straight away, so the founder (and a friend or two) can check progress on the real site. Guardrails until the v1.0 launch: (1) the whole site is `noindex` + `robots.txt` disallow, so search engines don't list it; (2) from v0.2, a visible "Beta — work in progress" notice on every page; (3) only steps whose tests pass get merged. The v1.0 launch removes `noindex`. Vercel preview links per PR remain available for checking before merge. | Simpler to build and review; the site has no public audience yet, and the guardrails stop strangers mistaking unfinished work for the real thing. Supersedes D-058. | Decided |
| D-059 | 2026-11-20 | **One JHora session captures everything:** for the ~25 reference births, the founder exports positions, D1–D60 divisional charts, dashas (3 levels) and panchanga in one go. | Saves the founder repeating the JHora work for later milestones. | Decided |
| D-061 | 2026-11-20 | **Indian languages (v1.6 → v2.0).** Each user picks a **primary** language and a **secondary** language. Default: English primary + an Indian language secondary, which shows chart terms (rasi, nakshatra, planets, houses, dasha lords, panchanga terms, etc.) in that language next to the English. Or an Indian language as primary: most of the site in that language, with English as secondary. Rolled out step by step from v1.6 to v2.0; which languages, in what order, and the details are decided after v1.5. | Opens Jathag to people more comfortable in their own language; chart terms are the same across languages, so it fits naturally. | Decided (details after v1.5) |
| D-062 | 2026-11-20 | **Mobile apps start after the web launch:** v1.3 = first test build on the founder's own phone (framework decision D-045 made here), v1.4 = test version for a few friends. Public store release with v2.0. | The web app must be stable first; an early test build surfaces mobile issues before languages multiply the work. | Decided |
| D-063 | 2026-11-20 | **Built language-ready from the start (cheap now, expensive later):** the engine outputs stable IDs (e.g. `sign: 5`, `nakshatra: 13`), never English names; from v0.4 every piece of UI text lives in a message file, not hard-coded in screens; interpretation content keeps a language field. English is the only language until v1.6. | Adding languages later becomes "add translations" instead of "rewrite every screen". | Decided |
| D-064 | 2026-11-20 | **Phone order of the home page (real form, v0.2 onward):** short intro (Indian-language words + tagline) → birth form → "What you'll get" cards below the form. The Coming Soon page keeps the hero first (no form yet). | On a phone people come to get their chart; the form shouldn't be three screens down. Follows B2's phone layout. | Decided |
| D-065 | 2026-11-20 | **Star dust in light mode too:** the same subtle dot pattern as dark mode, in a low-opacity version of the light-mode gold accent, on the page background only (never behind text inside cards). | Founder's design choice; keeps one visual identity across both modes. | Decided |
| D-066 | 2026-11-20 | **Hover highlight on outer cards:** on devices with a mouse, the border of any outer card/box on the site turns the accent colour when the pointer is over it (smooth, subtle). Inner cards (e.g. the "What you'll get" cards) don't react. Keyboard users get the same highlight when focus is inside the card. | Founder's design choice; gives the calm page a little life without animation clutter. | Decided |
| D-067 | 2026-11-20 | **Minimal numbering:** avoid decorative numbers ("01, 02, 03") and numbered lists where order isn't meaningful. Structure comes from clear headings, subheadings, spacing and typography. Numbers are used only where they carry meaning (dates, degrees, steps that must happen in order). | Founder's design principle; cleaner, less "template-like" look. | Decided |
| D-068 | 2026-11-20 | **Footer credit:** two-line footer; includes "Made by Adithya", with "Adithya" underlined and linking to https://yoloadithya.com (opens in a new tab, `rel="noopener noreferrer"`). The home-page eyebrow line "Vedic birth chart · Free · No account" is removed. | Founder's choice. | Decided |

## Closed open items
- O-002 (life areas list): **confirmed as proposed** on 2026-11-20 (Requirements §6.6).

## Open items (not yet decided)

| ID | Item | Owner | Trigger |
|---|---|---|---|
| O-001 | Design references for screens beyond the home page (home page = B2, see D-048) | Founder | Before v0.4 |
| O-003 | Content licence wording (separate from AGPL code) | Claude to draft options; founder decides | Before public launch |
| O-004 | Pre-1955 Mumbai/Kolkata local time (Bombay/Calcutta Time) — the time zone database may not model it; decide how to warn users | Claude to research | During v0.2 |
| O-005 | Privacy-friendly analytics: none vs a free cookieless option | Founder | Before launch |
| O-006 | Domain name | Founder | Before launch |
