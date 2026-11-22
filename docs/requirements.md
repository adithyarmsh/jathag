# JATHAG – REQUIREMENTS DOCUMENT (WEB v1)

Version 1.9 · 2026-11-22 · Source of truth together with the Product Brief and the Decisions Log. Where this document and the brief disagree, this document wins (it reflects later decisions). Every requirement has an ID (e.g. FR-CALC-03) so handoffs and tests can point to it.

Each requirement is tagged with the milestone that delivers it (see §14). How to read priorities: **"Must"** = required for the v1 beta launch. **"Should"** = wanted in v1, can slip to v1.1 if it blocks launch. **"Later"** = explicitly not in v1.

---

## 1. Purpose of web v1

A free, ad-free, private-by-default web app that turns a person's birth details into an **accurate** Vedic birth chart (verified against Jagannatha Hora) and explains it in short, modern, constructive language. Calculation accuracy is the main focus; interpretations are basic in v1.

## 2. Users

- **Primary:** curious people aged 16+, from late teens upward, with no astrology training; in India and the Indian diaspora (US, UK, Gulf, Singapore, Australia, Canada, etc.).
- **Secondary:** hobbyists who want to check settings and numbers (served by the hidden "Advanced" toggle).
- **Implication:** plain language everywhere; technical terms (e.g. "Navamsa") always come with a one-line explanation; foreign time zones and daylight saving must work perfectly.

## 3. Product principles (apply to every feature)

1. **Accuracy first.** Same inputs + same settings = same result, always. Any change to the engine must pass all reference tests.
2. **Calculation and interpretation are separate.** The engine produces numbers and facts; the content layer turns facts into words. Neither contains the other's logic.
3. **Show your working.** Every interpretation has an "i" button showing which chart factors produced it.
4. **Honest about uncertainty.** Approximate birth times show what is certain vs uncertain.
5. **Constructive, never fear-based.** No fear-selling, no remedies, no doom.
6. **Private by default.** No accounts; nothing about the user stored on our servers.
7. **Premium and calm.** Minimal, cosmic, gold-on-midnight; no clutter, no ads, no flashing.

---

## 4. Birth input and profiles

| ID | Requirement | Priority |
|---|---|---|
| FR-IN-01 | Input form: Name (free text, used as profile name), Date of birth, Time of birth, Place of birth. | Must |
| FR-IN-02 | Date range supported: 1 Jan 1800 – 31 Dec 2100. Dates outside are rejected with a clear message. | Must |
| FR-IN-03 | Time of birth has four modes: (a) **Exact** time (hour, minute; seconds optional in advanced); (b) **Custom range** (from–to, e.g. 07:00–08:00); (c) **Preset (part of day)** — Morning 6 am–12 noon, Afternoon 12 noon–4 pm, Evening 4 pm–8 pm, Night 8 pm–6 am (next day); (d) **Don't know** (whole day). | Must |
| FR-IN-04 | Place search with type-ahead suggestions, starting at 3 characters. Each suggestion shows "Place, District, State, Country" (e.g. "Kumbakonam, Thanjavur, Tamil Nadu, India") to disambiguate duplicates: plain names without accents, repeats collapsed, the words "District"/"Division" dropped. Suggestions are ordered: places in India first (matched on all names, incl. old names, e.g. "Bombay" → Mumbai), largest population first; then places outside India (matched on their main name only), largest first; ties: cities and city neighbourhoods before villages, then alphabetical (e.g. "che" → Chennai first). (D-087, D-088) | Must |
| FR-IN-05 | Place coverage: every populated place in India in GeoNames (cities, towns, villages, neighbourhoods, including abandoned and historical places) plus worldwide places with population ≥ 500. Every populated place worldwide does not fit the free plan (D-087). | Must |
| FR-IN-06 | After a place is chosen, show its latitude, longitude and time zone in small text (expanded in advanced mode) so users can sanity-check. | Should |
| FR-IN-07 | Advanced: manual entry of latitude, longitude and time zone / UTC offset (for places not found or for historical local time). | Must |
| FR-IN-08 | Input validation with friendly messages (e.g. missing place, impossible date like 31 Feb). | Must |
| FR-IN-10 | Question 5 of the form: "Which chart style did you grow up with?" South Indian / North Indian, with small chart icons. First chart ever: South Indian pre-selected. After that: the user's last choice is pre-selected. Always visible and editable on the form. | Must |
| FR-IN-09 | **"Which clock?" question for births in historical-clock windows (D-082).** Shown only when place and date fall in: anywhere in India before 1906-01-01 (IST or not sure / the town's own local time); Mumbai City + Mumbai Suburban 1906-01-01 – 1955-12-31 (IST or not sure / Bombay local time UTC+4:51); West Bengal 1906-01-01 – 1948-12-31 (IST or not sure / Calcutta local time UTC+5:53:20); anywhere in India 1941-10-01 – 1942-05-14 (IST or not sure / War Time UTC+6:30); anywhere in India 1942-09-01 – 1945-10-14 (War Time or not sure, UTC+6:30, pre-selected / IST UTC+5:30; D-086). Default pre-selected: "IST (or not sure)" (UTC+5:30), except in the 1942-09-01 – 1945-10-14 window, where "War Time (or not sure)" is pre-selected. No question outside these windows. v0.2 (0.2.13): a short warning note only, specific to the situation, behind a small circled "i" next to the date (D-092); v0.4 (0.4.6): the question. | Should |
| FR-PROF-01 | Profiles saved in the browser (local storage). Unlimited profiles. Each has a user-given name. | Must |
| FR-PROF-02 | Profile list: view, open, edit (re-calculates), delete (with confirmation). | Must |
| FR-PROF-03 | Clear notice: "Profiles are saved only in this browser. Clearing browser data removes them." | Must |
| FR-PROF-04 | Settings (chart style, theme, advanced options) saved in the browser. | Must |
| FR-PROF-05 | **Accounts (v1.1):** sign-in with email, Google, Apple, phone number, and maybe Facebook; users save profiles and charts and see them on any device. Cost, privacy and provider details decided at the start of v1.1 (O-008, D-084). | Later (v1.1) |

## 5. Calculations (the engine)

All calculations use Swiss Ephemeris (AGPL). The engine is a standalone TypeScript package with **no UI code**, version-numbered; every output includes the engine version and the settings used.

### 5.1 Core positions

| ID | Requirement | Priority |
|---|---|---|
| FR-CALC-01 | Convert local birth date/time + place to UTC using the IANA time zone database with historical offsets (incl. Indian War Time 1942–45, foreign daylight saving rules), or using an explicit UTC offset given to the second (manual entry, FR-IN-07, or the "Which clock?" answer, FR-IN-09). | Must |
| FR-CALC-02 | Sidereal longitudes (Lahiri default) for the 9 grahas: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu (Ketu = Rahu + 180°). | Must |
| FR-CALC-03 | For each graha: sign, degree within sign (deg/min/sec), nakshatra, pada, nakshatra lord, retrograde status, speed. | Must |
| FR-CALC-04 | Dignity for each graha: exalted, debilitated, moolatrikona, own sign, or neutral/friend/enemy sign (natural relationships), from a fixed, documented table. | Must |
| FR-CALC-05 | Ascendant (lagna): sign, degree, nakshatra, pada. | Must |
| FR-CALC-06 | Houses: whole sign (house 1 = lagna sign). Each house: sign, lord, occupants. | Must |
| FR-CALC-07 | Navamsa (D9) placement for lagna and all grahas. | Must |
| FR-CALC-08 | Aspects: classical graha drishti only (all → 7th; Mars + 4th, 8th; Jupiter + 5th, 9th; Saturn + 3rd, 10th). Output: which planets aspect which houses and which planets. No Rahu/Ketu aspects. | Must |
| FR-CALC-09 | Combustion (planet too close to the Sun) flag, using a documented standard set of orbs. | Should |
| FR-CALC-10 | **Divisional charts (v1.1):** all 16 Shodashavarga charts — D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60 — for lagna and all grahas, using JHora's default method for each, reference-tested. | Later (v1.1) |
| FR-CALC-11 | **Panchanga at birth (v0.9):** tithi (with paksha), vara (weekday, sunrise-based as in JHora), nakshatra, yoga, karana — reference-tested against JHora. | Must (v0.9) |

### 5.2 Timing

| ID | Requirement | Priority |
|---|---|---|
| FR-TIME-01 | Vimshottari Mahadasha sequence from birth for 120 years, with dasha balance at birth based on the Moon's position in its nakshatra. Year length 365.25 days (configurable). | Must |
| FR-TIME-02 | Antardasha (Bhukti) within every Mahadasha. | Must |
| FR-TIME-03 | Pratyantardasha within every Antardasha. | Must |
| FR-TIME-04 | Exact start and end date for every period (date precision in UI, on the birth place's clock with a short note saying so, D-097; full timestamp in data). The timeline starts at the true start of the mahadasha running at birth; periods that ended before birth are marked (D-096). | Must |
| FR-TIME-05 | "Current period" at all three levels for the moment of calculation (passed to the engine as an input, D-096); "coming up" = the next start at each level. | Must |
| FR-TIME-06 | Timing-window definitions: Short-term = Pratyantardasha, Medium-term = Antardasha, Long-term = Mahadasha. | Must |
| FR-TIME-07 | Life-area windows (simple rule): a period is flagged for a life area when its ruling planet rules or occupies that area's house(s). Each flag explains itself via the "i" button. | Must |
| FR-TIME-08 | Transit-combined life-area windows (e.g. dasha + Jupiter transit). | Later |

### 5.3 Transits

| ID | Requirement | Priority |
|---|---|---|
| FR-TRAN-01 | Current sidereal positions of all 9 grahas (for "now"). | Must |
| FR-TRAN-02 | Each current planet's house counted from natal Moon (gochara) and from natal lagna. | Must |
| FR-TRAN-03 | Sign-change (ingress) dates for Saturn, Jupiter and Rahu/Ketu: the most recent one and the next ones for the coming 10 years. Every crossing is listed, including back-and-forth crossings while a planet is retrograde, each marked as enters / moves back / enters again (D-099). | Must |
| FR-TRAN-04 | Sade Sati: all past, current and future periods from birth to 120 years after birth (Saturn transiting the 12th, 1st and 2nd from the natal Moon sign), with phase (rising/peak/setting) and dates. Each period is continuous from Saturn's first entry into the 12th to its final exit from the 2nd; each phase starts at Saturn's first entry into its sign; retrograde dips are listed inside the period; a period already running at birth is marked (D-099). | Must |
| FR-TRAN-05 | Retrograde stations of transiting planets. | Later |

### 5.4 Approximate birth time

| ID | Requirement | Priority |
|---|---|---|
| FR-APX-01 | For range/preset/unknown time, the engine scans the full range and finds every moment a time-sensitive value changes (lagna sign, lagna nakshatra, D9 lagna, Moon nakshatra, Moon pada, Moon sign, dasha balance). | Must |
| FR-APX-02 | Output separates **certain** facts (same across the whole range) from **uncertain** ones, listing every possible value with the time sub-range it applies to (e.g. "Ascendant Leo if born before 07:42, Virgo after"). | Must |
| FR-APX-03 | Dasha dates for uncertain times shown as ranges (earliest–latest start date). | Must |
| FR-APX-04 | UI never presents a single "best guess" chart as if it were exact; all uncertain items carry a visible marker. | Must |

### 5.5 Settings that affect calculations

| ID | Requirement | Priority |
|---|---|---|
| FR-SET-01 | Defaults: Vedic, Sidereal, Lahiri, Rasi D1 + Navamsa D9, Vimshottari, Whole sign, Mean node, 365.25-day year. | Must |
| FR-SET-02 | Advanced toggle (hidden by default) exposes: Ayanamsa (Lahiri, Raman, Krishnamurti — only Lahiri is reference-tested; others marked "not verified"), Node (Mean/True), Dasha year length (365.25 / 360 / 365.2422), seconds in time input, manual coordinates. | Must |
| FR-SET-03 | Every chart screen and download shows the settings used in small text. | Must |

### 5.6 Calculation API

| ID | Requirement | Priority |
|---|---|---|
| FR-API-01 | A server endpoint receives birth inputs + settings and returns all calculation results as structured data. | Must |
| FR-API-02 | The server does not store, log or forward birth inputs. Request logging must exclude birth details. | Must |
| FR-API-03 | Response time: under 2 seconds for an exact-time chart; under 5 seconds for a full-day "don't know" scan (target, measured on production). | Should |

---

## 6. Screens and features (web app)

### 6.1 Global

| ID | Requirement | Priority |
|---|---|---|
| FR-UI-01 | Responsive: works well from 360 px phones to large desktops. Mobile-first layout. | Must |
| FR-UI-02 | Dark and light mode; default follows the device setting; user can override with the header toggle (remembered). Dark = midnight blue + gold + ivory. Light = warm off-white + deep ink + **darker gold accents** (no blue). | Must |
| FR-UI-03 | "Beta" label visible in the header. | Must |
| FR-UI-04 | Footer (two lines): About, Disclaimer, Privacy, Sources & credits (GeoNames, Swiss Ephemeris), Source code (AGPL link); and "Made by Adithya" with "Adithya" underlined, linking to https://yoloadithya.com (D-068). | Must |
| FR-UI-05 | Every interpretation block has an "i" button opening a pop-up: which factors produced it (e.g. "Saturn in 7th house · Saturn aspects 7th from 1st"), plus a small "See classical source" link to the Sources screen. | Must |
| FR-UI-07 | Header (B2): wordmark + Beta badge, Learn link (hidden until v1.4), About, Profile (opens saved profiles), theme toggle. Mobile: Profile and menu buttons. | Must |
| FR-UI-08 | Hover highlight: on pointer devices, the border of every outer card/box turns the accent colour on hover (subtle transition); inner cards don't react; the same highlight appears when keyboard focus is inside the card (D-066). | Must |
| FR-UI-09 | Minimal numbering: no decorative numbers; hierarchy shown through headings, subheadings, spacing and type; numbers only where meaningful (D-067). | Must |
| FR-UI-10 | Star-dust dot pattern on the page background in both themes (gold-tinted, low opacity), never behind card text (D-065). | Must |
| FR-UI-06 | "Report an issue" link on every reading (opens a simple form or pre-filled email/GitHub issue; no personal data sent unless the user includes it). | Must |

### 6.2 Home page (B2 design, one screen, no onboarding screens)

| ID | Requirement | Priority |
|---|---|---|
| FR-HOME-01 | One screen, layout per design "B2 — Split screen" (Decisions D-048): desktop = left hero card + right form card. **Phone order (D-064):** short intro (Indian-language words + tagline) → the birth form → the "What you'll get" cards below the form. (The Coming Soon page, which has no form, shows the hero first.) | Must |
| FR-HOME-02 | Left hero: Indian-language words for "birth chart" (Hindi, Bengali, Telugu, Tamil, Kannada, Malayalam), the tagline "Know your chart, not just your sign.", a one-sentence intro, and three "What you'll get" cards (Accurate chart · Plain-language explanations · Your life timeline), without decorative numbers (D-067). | Must |
| FR-HOME-03 | Right card "Your birth details — Five questions, about a minute": the birth form (FR-IN-01…10) and a "See my chart" button, with the privacy line "Your details are only used to calculate your chart. Nothing is stored on our servers." under it (D-092; must change when accounts arrive, O-008). | Must |
| FR-HOME-04 | No separate welcome or chart-style screens (supersedes the earlier onboarding requirements). | Must |
| FR-HOME-05 | Progress goes live as each step is merged (Decisions D-060). Until the real form exists (v0.2), the right-hand card shows "Coming soon". Until the v1.0 launch: whole site `noindex` + `robots.txt` disallow; from v0.2 a visible "Beta — work in progress" notice on every page. | Must |

### 6.3 Chart overview (bird's-eye view) — the home screen of a profile

| ID | Requirement | Priority |
|---|---|---|
| FR-OV-01 | Top: name, birth details, settings summary, certainty notice if time is approximate. | Must |
| FR-OV-02 | Rasi chart in the chosen style. | Must |
| FR-OV-03 | "Your chart at a glance": Lagna, Moon sign, Moon nakshatra, Sun sign — each with a one-line meaning. | Must |
| FR-OV-04 | Current Mahadasha / Antardasha / Pratyantardasha with end dates. | Must |
| FR-OV-05 | Cards linking to each section: Charts, Planets, Life Areas, Timing, Transits. | Must |

### 6.4 Charts

| ID | Requirement | Priority |
|---|---|---|
| FR-CH-01 | Rasi (D1) and Navamsa (D9), switchable; North and South Indian styles, switchable. | Must |
| FR-CH-02 | Drawn as SVG by code; crisp at any size; themed for dark/light. | Must |
| FR-CH-03 | Planet abbreviations with degree; retrograde marked (R); lagna marked. | Must |
| FR-CH-04 | Tap/click a planet in the chart → its planet detail page. | Should |
| FR-CH-05 | **Divisional chart selector (v1.1):** beside the main chart, a list/selector of all 16 divisional charts; selecting one shows it in the chosen style with its short "what this chart is for" note. | Later (v1.1) |
| FR-CH-06 | Chart style toggle (South/North) on the chart screen; changing it updates the remembered preference. | Must |

### 6.5 Planets

| ID | Requirement | Priority |
|---|---|---|
| FR-PL-01 | Table of all 9 grahas + lagna: sign, degree, nakshatra, pada, house, dignity, retrograde, (combust). | Must |
| FR-PL-02 | Each planet opens a detail page: positions, house, aspects given and received, D9 placement, interpretation blocks (planet in sign, planet in house), "i" buttons. | Must |

### 6.6 Life areas

Confirmed by the founder on 2026-11-20:

| Life area | Main houses | Natural significator (karaka) |
|---|---|---|
| Personality & self | 1 | Sun |
| Money & family | 2, 11 | Jupiter |
| Communication, courage & siblings | 3 | Mars |
| Home, mother & inner peace | 4 | Moon |
| Learning, creativity & children | 5 | Jupiter |
| Health & wellness (general wellness only + disclaimer) | 1, 6 | Sun |
| Relationships & marriage | 7 | Venus |
| Career & work | 10, 6 | Saturn / Sun |
| Luck, beliefs & mentors | 9 | Jupiter |
| Spirituality, rest & letting go | 12, 8 | Ketu / Saturn |

| ID | Requirement | Priority |
|---|---|---|
| FR-LA-01 | List of life areas, each opening a page. | Must |
| FR-LA-02 | Each page assembles basic blocks: house sign, house lord and where it sits, planets in the house, aspects on the house, karaka condition — each block with an "i" button. | Must |
| FR-LA-03 | Life-area timing windows (FR-TIME-07) shown on each page: "Periods that especially activate this area". | Must |
| FR-LA-04 | Health page carries the wellness disclaimer at the top and avoids medical claims. | Must |

### 6.7 Timing

| ID | Requirement | Priority |
|---|---|---|
| FR-TM-01 | Chronological timeline of all Mahadashas (past, current, future) with dates; current one highlighted with a "You are here" marker. | Must |
| FR-TM-02 | Expand Mahadasha → Antardashas → Pratyantardashas, each with exact dates. | Must |
| FR-TM-03 | "Coming up" list: next transitions at each level with dates. | Must |
| FR-TM-04 | Short/medium/long-term labels on levels (Pratyantar/Antar/Maha). | Must |
| FR-TM-05 | Major transits and Sade Sati periods shown on the same timeline (toggleable layer). | Must |
| FR-TM-06 | Short interpretation for each Mahadasha (9) and basic one-liners for Antardashas. | Must |

### 6.8 Transits

| ID | Requirement | Priority |
|---|---|---|
| FR-TR-01 | Today's planetary positions and which house each is in from natal Moon and lagna. | Must |
| FR-TR-02 | Sade Sati status card (none / rising / peak / setting, with dates). | Must |
| FR-TR-03 | Upcoming major sign changes (Saturn, Jupiter, Rahu/Ketu) with dates. | Must |
| FR-TR-04 | One-line basic meaning per transit. | Should |

### 6.8a Panchanga (v0.9)

| ID | Requirement | Priority |
|---|---|---|
| FR-PAN-01 | A Panchanga card for the birth moment: tithi + paksha, vara, nakshatra, yoga, karana, each with a one-line plain-English explanation of what that part is. | Must (v0.9) |

### 6.9 Downloads

| ID | Requirement | Priority |
|---|---|---|
| FR-DL-01 | A "Download" button opens a checklist: ☐ Birth chart (Rasi/Navamsa, chosen style) ☐ Planet positions ☐ Planet interpretations ☐ Life areas ☐ Dasha timeline ☐ Transits & Sade Sati ☐ Settings used. | Must |
| FR-DL-02 | Only "Birth chart" ticked → image download (PNG). Anything else ticked → a single PDF containing the selected sections. | Must |
| FR-DL-03 | Generated in the browser (no birth data sent anywhere for the download). | Must |
| FR-DL-04 | Downloads carry Jathag branding, settings used, engine version, date generated, beta notice and disclaimer. | Must |

### 6.10 Settings

| ID | Requirement | Priority |
|---|---|---|
| FR-ST-01 | Beginner settings: chart style, theme. | Must |
| FR-ST-02 | Advanced toggle → calculation settings (FR-SET-02). | Must |
| FR-ST-03 | "Reset to defaults". | Must |

### 6.11 Sources screen (low prominence)

| ID | Requirement | Priority |
|---|---|---|
| FR-SRC-01 | Reachable only from "i" pop-ups and the footer — not in main navigation. | Must |
| FR-SRC-02 | For each content entry: classical citation (text, chapter, verse) and our own short summary of what the source says. No copied modern translations. | Must |
| FR-SRC-03 | A short "About the calculations" section on the Sources & credits page: ephemeris and settings used, known small differences vs JHora (D-079, D-081, D-083), and how historical Indian clocks are handled (D-082). | Must (v0.9) |

---

## 7. Interpretation content

| ID | Requirement | Priority |
|---|---|---|
| FR-CONT-01 | Style: matches the Saturn-in-7th sample — 50–120 words, simple modern language, "In a nutshell" one-liner, reminds that the whole chart matters, suitable for 16+. | Must |
| FR-CONT-02 | Tone rules: constructive; no fear; no fatalistic predictions ("you will divorce"); no remedies; doshas stated factually with balancing context; health = general wellness + disclaimer. | Must |
| FR-CONT-03 | Each entry stored as data with fields: ID, factor (e.g. "saturn_house_7"), title, body, nutshell, source citation, source summary, status (draft / founder-approved), version. | Must |
| FR-CONT-04 | v1 inventory (basic): Lagna in 12 signs (12); planets in signs (9×12 = 108, short); planets in houses (9×12 = 108); Moon nakshatras (27); Mahadashas (9); Antardasha one-liners (81); house-lord-in-house blocks for life areas (12×12 = 144, short); transit one-liners (~108, short); Sade Sati phases (3); dosha explainers (few); "what this chart is for" notes for 16 divisional charts (16, v1.1); explanations of the 5 parts of panchanga (5, v0.9). **≈ 620 entries, most short.** | Must (one-liners may be "Should") |
| FR-CONT-05 | All content written in original words by Claude, reviewed and approved by the founder for tone; source citation required before an entry is marked approved. | Must |
| FR-CONT-06 | Content stored separately from code, under a separate licence (wording TBD, O-003). | Must |
| FR-CONT-07 | Deeper, synthesised readings; per-planet readings for divisional charts other than D1/D9; other languages; AI readings. | Later |
| FR-LANG-01 | **Language-ready architecture (v0.2 onward):** engine returns stable IDs, not names; all UI strings in message files from v0.4; content entries carry a language field (Decisions D-063). | Must |
| FR-LANG-02 | **Indian languages (v1.7 → v1.9, D-084):** optional secondary language (Hindi, Kannada, Telugu, Malayalam, Bengali or Tamil), off by default, showing chart terms next to the English (e.g. "Cancer கடகம்"); option to make one of these the primary language with English always kept as secondary. v1.8 completes it step by step; v1.9 verifies every term, translation and reading with native-speaker checkpoints. Scope and method decided after v1.1. | Later (v1.7–v1.9) |
| FR-CONT-08 | **Learn section (D-084):** basic Learn (v1.4), more detailed (v1.5), interactive (v1.6), on web, iOS and Android. Explains everything shown in the chart: terms, what they mean, how they are calculated, how planets move between boxes, dashas. Scope decided after v1.1. | Later (v1.4–v1.6) |

---

## 8. Privacy, legal and safety

| ID | Requirement | Priority |
|---|---|---|
| NFR-PRIV-01 | No accounts; no birth data stored on servers; profiles only in the user's browser. (Applies until v1.0; accounts in v1.1 change this, rules decided in O-008.) | Must |
| NFR-PRIV-02 | No ad trackers, no third-party marketing cookies. Analytics: none or a free cookieless option (O-005). | Must |
| NFR-PRIV-03 | Privacy page in plain language explaining exactly what is (not) collected. | Must |
| NFR-LEG-01 | Disclaimer: astrology for self-reflection; not medical, legal, financial or psychological advice. | Must |
| NFR-LEG-02 | AGPL notice + public source link; GeoNames and Swiss Ephemeris credits. | Must |
| NFR-LEG-03 | Content licence notice for interpretation text (O-003). | Must |

## 9. Quality (non-functional)

| ID | Requirement | Priority |
|---|---|---|
| NFR-ACC-01 | Accessibility: WCAG 2.2 AA colour contrast in both themes (watch gold-on-ivory in light mode); keyboard navigable; charts have text alternatives (the planet table). | Must |
| NFR-PERF-01 | First screen loads in under 3 seconds on a mid-range phone on 4G. | Should |
| NFR-BRW-01 | Works on the latest 2 versions of Chrome, Safari (iOS + macOS), Firefox, Edge, Samsung Internet. | Must |
| NFR-SEC-01 | No secrets (keys, passwords) in the public repository. | Must |
| NFR-DET-01 | Determinism: identical inputs + settings + engine version produce byte-identical calculation output. | Must |

## 10. Accuracy and testing

| ID | Requirement | Priority |
|---|---|---|
| TEST-01 | ~25 reference births, designed by Claude, computed in JHora by the founder (Lahiri, Mean node, Whole sign, 365.25) in ONE session that exports everything needed up to v1.0: planet and lagna positions, nakshatra/pada, all 16 divisional charts, Vimshottari dasha (3 levels) and panchanga. Stored in the repository. | Must |
| TEST-02 | Tolerances: longitudes and lagna ±1 arcminute; sign, nakshatra, pada and every divisional-chart sign must match exactly; panchanga elements must match exactly; dasha/bhukti/pratyantar start dates ±1 day. | Must |
| TEST-03 | Tests run automatically on every code change (GitHub Actions, free for public repos). A change that fails any test cannot be released. | Must |
| TEST-04 | Additional automated checks: time zone conversions (incl. War Time and foreign DST), approximate-time scanning, Sade Sati dates, determinism. | Must |
| TEST-05 | Content checks: every factor the engine can produce has an approved content entry (no missing text). | Must |

Reference case coverage (Claude will specify exact births):
1. Modern births in Chennai, Delhi, Mumbai, Kolkata, Bengaluru
2. Indian War Time birth (1943)
3. Pre-independence birth (1930s)
4. Birth near midnight (date boundary)
5. Moon near a nakshatra boundary
6. Lagna near a sign boundary
7. A planet near a sign boundary
8. Rahu near a sign/nakshatra boundary
9. Several retrograde planets
10. Navamsa boundary case
11. Diaspora: USA with daylight saving
12. UK in the 1940s (double summer time)
13. Southern hemisphere (Australia)
14. High latitude (e.g. Toronto/Oslo)
15. Singapore/Malaysia (historic time zone changes)
16. Gulf (Dubai)
17. Birth around 1900
18. Birth around 2005–2010 (teen user)
19. Birth on 29 February
20. Sunrise birth
21–25. Spares for bugs found during development

## 11. Technical architecture (for Claude Code)

- **Repository:** one public GitHub repo ("monorepo") with:
  - `packages/engine` — calculation engine (TypeScript + Swiss Ephemeris). No UI code. Own version number.
  - `packages/content` — interpretation entries as data files + their schema.
  - `apps/web` — Next.js web app (UI, API endpoint, downloads).
  - `data/places` — scripts that turn GeoNames into a compact search index.
  - `tests/reference` — the 25 JHora reference cases and their expected outputs.
  - `docs/` — copies of the brief, requirements, decisions log; `CLAUDE.md` with rules for Claude Code.
- **Swiss Ephemeris in TypeScript:** via an existing JavaScript/WebAssembly binding — Claude Code to evaluate candidates in step 0.2.1 and report licence + accuracy before choosing.
- **Hosting:** Vercel Hobby (non-commercial). Preview link for every change; production on main branch. Each merged step goes live; the whole site is `noindex` until the v1.0 launch (FR-HOME-05, D-060).
- **Progress tracking:** `PROGRESS.md` at the repo root, updated in every PR (Decisions D-056).
- **CI:** GitHub Actions running all tests on every change.
- **Feasibility checks in v0.2:** (a) Swiss Ephemeris binding runs inside Vercel's server functions; (b) the place index fits Vercel's function size limits.

## 12. Out of scope for web v1

Accounts and sync (v1.1) · 16 divisional charts (v1.1) · payments and ads · offline mode · tarot · compatibility (porutham) · AI readings · Indian languages (v1.7–v1.9) · mobile apps (test builds v1.2–v1.3, public v2.0) · remedies · other house systems · other dasha systems · transit-combined life-area windows · retrograde station alerts · notifications · Learn section (v1.4–v1.6) · per-planet readings for divisional charts other than D1/D9.

## 13. Definition of done for the v1 beta launch

- All "Must" requirements implemented.
- All reference tests and automated checks pass.
- Founder has approved every screen design and every content entry's tone.
- Tested on real phones (iOS Safari, Android Chrome) and desktop, both themes.
- Privacy, disclaimer, sources and AGPL pages live.
- 5–10 friendly beta testers have used it and critical issues are fixed.

## 14. Milestones (what ships when)

| Milestone | Delivers | Main requirement IDs |
|---|---|---|
| v0.1 Coming soon 🔄 | Live holding page, repo, CI, auto-deploy, docs + progress tracking, B2-styled Coming Soon | NFR-SEC-01, FR-HOME-05 |
| v0.2 First real chart | Engine core matching JHora; place search; calculation API; minimal B2 form + planet table on the live site | FR-CALC-01…09, FR-IN-04…07, FR-API-01…03, TEST-01…04 |
| v0.3 Timing engine | Dashas (3 levels), transits, Sade Sati, life-area windows, approximate-time scanner | FR-TIME-*, FR-TRAN-*, FR-APX-01…03 |
| v0.4 Design system + app shell | Approved design system and screen mockups; app shell; full B2 home form; profiles in browser | FR-UI-01…07, FR-HOME-01…04, FR-IN-*, FR-PROF-* |
| v0.5 Chart screens | Overview; D1/D9 charts in both styles; planets table + detail pages | FR-OV-*, FR-CH-01…04, FR-CH-06, FR-PL-* |
| v0.6 Timing screens | Timeline, transits, Sade Sati card | FR-TM-*, FR-TR-* |
| v0.7 Interpretations | Style guide; ~600 approved entries; "i" pop-ups; Sources screen; life-area pages | FR-CONT-*, FR-UI-05, FR-SRC-*, FR-LA-* |
| v0.8 Approximate time, settings, downloads | Certain/uncertain UX; beginner/advanced settings; PNG/PDF downloads; report-an-issue | FR-APX-04, FR-SET-*, FR-ST-*, FR-DL-*, FR-UI-06 |
| v0.9 Panchanga + legal | Panchanga calc + card; privacy, disclaimer, about, credits, content licence | FR-CALC-11, FR-PAN-01, NFR-PRIV-*, NFR-LEG-* |
| v1.0 Beta launch | Quality pass; domain; `noindex` removed (public launch, English web app) | NFR-ACC-01, NFR-PERF-01, NFR-BRW-01, §13 |
| v1.1 | Beta feedback fixes; 16 divisional charts; accounts (sign-in, saved profiles and charts) | FR-CALC-10, FR-CH-05, FR-PROF-05 |
| v1.2 | Mobile test build (founder's phone); framework decided | — |
| v1.3 | Mobile test version for a few friends | — |
| v1.4 | Basic Learn | FR-CONT-08 |
| v1.5 | Basic Learn, more detail | FR-CONT-08 |
| v1.6 | Interactive Learn (web, iOS, Android) | FR-CONT-08 |
| v1.7 | Indian languages: secondary-language terms; Indian primary language with English secondary | FR-LANG-02 |
| v1.8 | Indian languages, step-by-step completion | FR-LANG-02 |
| v1.9 | Verification of all languages (terms, translations, readings) | FR-LANG-02 |
| v2.0 | Full setup live on App Store, Play Store and web; marketing push | — |
