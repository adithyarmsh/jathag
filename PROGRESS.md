# Jathag – Progress

> **Read this first in every session.** It is the single source of truth for where the build stands.
> Update it in the same PR as every change (see `CLAUDE.md`). Step IDs match `docs/roadmap.md`.

## ▶ Current position

| | |
|---|---|
| **Milestone** | v0.5 Chart screens 🔄 (0.5.1 ✅, D-138 to D-141). v0.4 Design system + app shell ✅ (0.4.1–0.4.7 done; 0.4.1–0.4.4 in the Project, D-125 to D-132; 0.4.5 D-133; 0.4.6 D-135; 0.4.7 D-137); v0.9 🔄 (0.9.1 ✅, pulled forward, D-123/D-124). v0.3 Timing engine ✅ (D-121) |
| **Current step** | 0.5.2 Charts, in review |
| **Next step** | 0.5.3 Planet pages |
| **Blocked on** | Project review of the 0.5.2 PR |
| **Live site** | https://jathag.vercel.app (design system "Still Water": one-line header, phone menu, Beta band, footer v0.5.1, Light / Dark / Match device, placeholder pages and a 404; home page = welcome + full birth form with Advanced settings (D-134) and a "See a sample chart" link; saved profiles kept in this browser (every chart saved automatically, "Your charts" page with Open / Edit / Delete, count in the phone menu, D-136); the chart page /chart (D-138 to D-140: details bar fixed on desktop with Edit details in place, contents panel, sections Chart · Right now · Dashas · Life areas · Sade Sati · Transits · Planets, South Indian Rasi chart with three fact tiles and "i" pop-ups; /chart?sample shows a made-up sample chart); `POST /api/chart/range` (approximate-time scan) and the chart API's `panchanga` section have no screen yet; hidden from search engines) |
| **Last updated** | 2026-11-28 |

Status key: ✅ done · 🔄 in progress · ⏳ not started · ⛔ blocked · ⏭ skipped (with reason)

---

## Milestones

| Milestone | Status |
|---|---|
| v0.1 Coming soon | ✅ |
| v0.2 First real chart | ✅ |
| v0.3 Timing engine | ✅ |
| v0.4 Design system + app shell | ✅ |
| v0.5 Chart screens | 🔄 |
| v0.6 Timing screens | ⏳ |
| v0.7 Interpretations | ⏳ |
| v0.8 Approximate time, settings, downloads | ⏳ |
| v0.9 Panchanga + legal | 🔄 |
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
- ✅ 0.3.5 Approximate-time test cases: five cases A1–A5 in `tests/reference/approx-time/` (D-107), founder's JHora check passed (D-109), delivered (D-111)
- ✅ 0.3.5.1 Basic chart: heading "South Indian Birth Chart", degrees only in the planet table (chart boxes show abbreviations and (R)), planet labels larger (D-108) (PR #19). Founder checked the live chart (D-111)
- ✅ 0.3.6 Approximate-time scanner: `scanTimeRange` in the engine (change moments, segments, certain values, mahadasha/antardasha date ranges; nothing missed, checked second by second; refuses beyond 66.5° latitude) and `POST /api/chart/range` (D-111 range rules, "Which clock?" at both ends, local times with first/second), no screen; all five 0.3.5 cases match exactly; whole day on Vercel 1.2 s cold / 0.44–0.91 s warm from India, 77 KB raw / 11.6 KB sent (PR #20)
- ✅ 0.3.7 Lists on the live site: four plain cards below the planet table (Right now, Dasha periods, Transits and Sade Sati, Life areas), built only from the chart API response; dates on the clock at birth; approved as built (D-114) (PR #21)
- ✅ 0.3.7.1 Founder feedback fixes (D-115): red "Coming soon" tags at the bottom of equal cards, smaller sign/house labels and Moon sign/nakshatra/pada in the chart centre, roomier "Right now" with Mahadasha/Antardasha/Pratyantardasha tiers and progress bars, date notes without "as in Jagannatha Hora", collapsible sign changes (one opener per planet) and Sade Sati periods, looser spacing; calculation line now "verified against independent reference charts" (D-116); approved and merged (PR #22); checked by the founder on his phone, 2026-11-24 (D-119)
- ✅ 0.3.7.2 Founder polish round 2 (D-117): every Sade Sati period its own opener (phases and dips inside, indented, sub-heading), count merged into the sentence under the heading; Dasha periods rows with the Right now level colours; random four-point background stars (3.5–5.25 px, D-118; brightness follows size, 28 per 320 × 320 px, new positions on every load) replace the tiled dots; approved (D-118) and merged (PR #23); checked by the founder on his phone, 2026-11-24 (D-119)
- ✅ 0.3.7.3 Page width bug on phones (D-119): the two sideways-scrolling table boxes (planet table, today's positions) are now positioning containers, so their hidden "Does not apply" texts no longer make the page 815 px wide on a 390 px phone; regression test; approved (D-120) and merged (PR #24), founder checked on his phone, 2026-11-24 (D-121)

### v0.4 — Design system + app shell
- ✅ 0.4.1 References from the founder (O-001), done in the Project
- ✅ 0.4.2 Design System "Still Water", approved in the Project (D-126 to D-128)
- ✅ 0.4.3 Mockups, approved in the Project (D-129 to D-131)
- ✅ 0.4.4 Design handoff: `docs/design/design-spec.md`, `tokens.json`, 18 mockups; Requirements v1.13 (D-132)
- ✅ 0.4.5 App shell (approved as D-133): Still Water tokens and fonts site-wide, one-line header, phone menu, Beta band, new footer, Light / Dark / Match device, placeholder pages and a 404; the home page keeps its layout in the new look (PR #27)
- ✅ 0.4.6 Full birth form (PR #28, D-135): B2 home layout (440 / 480 px form column), the quiet form of D-134 (no heading, Name, Date with the old-clock "i", Time, Place with two hints and "also known as", Chart style remembered), Advanced settings inside the card (coordinates, "Which clock?" when it applies, time certainty with two choices switched off, seconds); result still under the form
- ✅ 0.4.7 Saved profiles (PR #29, D-137): every successful chart is kept in this browser (inputs only, no duplicates), /profiles "Your charts" with Open, Edit and Delete, phone menu count

### v0.5 — Chart screens
- ✅ 0.5.1 Chart page (PR #30, D-138 to D-141): the chart on its own page /chart (only the profile id or "sample" in the address), seven sections in the D-129 order with a contents panel, Edit details in place with the home form, a sample chart, the first "i" pop-ups; the home page keeps only the welcome and the form; first-look changes D-139 (fixed details bar on desktop, hover pop-ups, smaller contents card, icon-only phone button); second polish round D-140 (one right edge, stars in the desktop gap, 38 stars per tile and a lighter light-mode star gold, hover grow on every clickable thing, the Pratyantardasha line); approved D-141. JHora matched (D-142).
- 🔄 0.5.2 Drawn charts (in review): South and North Indian, Rasi (D1) and Navamsa (D9) with chips, toggle and index; coordinates in DMS or DD; "Near <place>" for typed coordinates (D-143, D-144). Done when: the founder's JHora visual check after the merge
- ⏳ 0.5.3 Planets table + pages

### v0.6 — Timing screens
- ⏳ 0.6.1 Dasha timeline · ⏳ 0.6.2 Transits + Sade Sati

### v0.7 — Interpretations
- ⏳ 0.7.1 Style guide · ⏳ 0.7.2 Pilot · ⏳ 0.7.3 Batches · ⏳ 0.7.4 Founder review · ⏳ 0.7.5 Content in app

### v0.8 — Approximate time, settings, downloads
- ⏳ 0.8.1 Approx-time UX · ⏳ 0.8.2 Settings · ⏳ 0.8.3 Download design · ⏳ 0.8.4 Downloads · ⏳ 0.8.5 Report an issue

### v0.9 — Panchanga + legal
- ✅ 0.9.1 Panchanga calc (pulled forward, D-123): tithi with paksha, nakshatra, sunrise-based weekday, yoga, karana and hora lord in the engine and the chart API (`panchanga`); all 29 births match JHora; no screen; approved (D-124) (PR #26)
- ⏳ 0.9.2 Explanations · ⏳ 0.9.3 Panchanga card · ⏳ 0.9.4 Legal drafts · ⏳ 0.9.5 Legal pages · ⏳ 0.9.6 Analytics decision

### v1.0 — Beta launch
- ⏳ 1.0.1 A11y/perf audit · ⏳ 1.0.2 Device testing · ⏳ 1.0.3 Pre-launch review · ⏳ 1.0.4 Domain + beta testers · ⏳ 1.0.5 Public launch · ⏳ 1.0.6 Beta feedback

### v1.1 — Feedback fixes, divisional charts, accounts
- ⏳ 1.1.1 Sort feedback · ⏳ 1.1.2 Feedback fixes · ⏳ 1.1.3 16 divisional charts · ⏳ 1.1.4 Chart notes · ⏳ 1.1.5 Chart selector · ⏳ 1.1.6 Accounts plan · ⏳ 1.1.7 Accounts · ⏳ 1.1.8 Plan Learn + languages

### v1.2–v2.0 (steps detailed later, see `docs/roadmap.md`)
- ⏳ v1.2 Mobile test build · ⏳ v1.3 Mobile test version for friends · ⏳ v1.4 Basic Learn · ⏳ v1.5 Basic Learn, more detail · ⏳ v1.6 Interactive Learn · ⏳ v1.7 Indian languages, first version · ⏳ v1.8 Indian languages, step by step · ⏳ v1.9 Language verification · ⏳ v2.0 Public apps + web, marketing push

---

## Open questions / blockers
- ~~O-001 Design references for screens beyond the home page~~ resolved in 0.4.1–0.4.4
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
| 2026-11-28 | 0.5.2 | #31 | Drawn charts built (D-143, spec §7): South and North Indian SVG charts, Rasi (D1) and Navamsa (D9) (D9 houses from the D9 Lagna, (R) in both, never on Rahu/Ketu), chips and the South / North toggle under the chart (the toggle and the form's Chart style cards share "chartStyle"), the index (open on desktop, "What the letters mean" opener on phones); coordinates in DMS (default, N/E pre-selected) or DD, both sending the same decimals, profiles still version 1; "Near <place>" for typed coordinates from a new nearest-place lookup served with the place search (D-144). All 29 births match the JHora D1/D9 answer key in both styles. Waiting for Project review. |
| 2026-11-27 | 0.5.1 | #30 | Reviewed and approved by the Project (D-141) after two founder preview rounds (D-139, D-140) and one bug fix. Squash-merged. |
| 2026-11-27 | 0.5.1 | #30 | Founder's second polish round (D-140): the page column is now centred on a whole pixel (header, chart page, home, footer), so the fixed details bar and every block below it end on the same pixel (1280 px window: 1192 instead of 1192.5; 1440 px: 1272 instead of 1272.5; 1024 px: 985, unchanged); the background stars now show in the gap above the fixed bar on desktop (a clipped copy of the same stars, content still disappears there), 38 stars per 320 × 320 px (was 28), light mode uses a lighter star gold `--star-colour` #C49A3A at strength 0.6 (dark unchanged); one shared hover-grow rule (buttons ×1.02, small controls ×1.03, big rows and cards ×1.01; not when disabled, not links inside sentences, off with reduced motion); under an opened Mahadasha's Antardashas a line names the Pratyantardashas. D-140 committed unchanged. |
| 2026-11-27 | 0.5.1 | #30 | Fix (founder's screen recording): after choosing a section in the contents card the previous one stayed highlighted. Cause: the "current section" line sat at 30 % of the screen height and ignored the fixed details bar (D-139), so on shorter screens a section landing under the bar never counted. Now the line is where jumps land (the page's scroll-padding-top, incl. the bar) + 16 px, recomputed on scroll, resize and page-height changes; a chosen section (or the #address on load) is current at once and stays so until the reader scrolls. |
| 2026-11-27 | 0.5.1 | #30 | Founder's first-look changes (D-139): on desktop the details bar stays fixed under the header (the gap keeps the page background; the contents column and section jumps sit below it), phones unchanged; the "i" pop-ups open on hover as well as click/tap and float above the page; the desktop contents card about 20 % smaller; the phone contents button is icon-only (three lines of different lengths, 2 px edge, named "Contents"). D-139 committed unchanged. |
| 2026-11-27 | 0.5.1 | #30 | Chart page built (D-138, spec §6): "See my chart" saves the profile and opens /chart?profile=<id> with the result handed over in the page's memory (one request per visit; also works once when the browser blocks storage); /chart?sample shows the made-up R01; no profile or an unknown id goes home. Details bar, Edit details in place (the same form, "Update chart", updates the same profile), contents panel (dash column + card on desktop, floating button + bottom panel on phones), sections Chart · Right now · Dashas · Life areas · Sade Sati · Transits · Planets restyled to the boards (no left-border rules), three fact tiles with "i" pop-ups. Fixed on the way: the form crashed when the browser blocks storage entirely. R01 shows the same numbers (Lagna Leo 8° 31′ 13″ Magha 3). Two Project docs committed unchanged. Waiting for Project review. |
| 2026-11-27 | 0.4.7 | #29 | Reviewed and approved by the Project (D-137): folder checks, stored format and dedupe rule checked; edge cases accepted. Squash-merged. |
| 2026-11-27 | 0.4.7 | #29 | Saved profiles built (D-136, spec §11): every successful "See my chart" keeps the form inputs in localStorage `profiles` (version 1, never results; identical details update the same profile, empty name = "My chart"); /profiles "Your charts" with the FR-PROF-03 notice, cards (most recently used first) with Open (fills the form and calculates), Edit (fills the form, "Editing …" line, next calculation updates that profile) and Delete (asked inside the card), empty state A; phone menu shows "3 in this browser". Only the profile id travels in the address. R01 opened from a profile sends main's exact request and shows Lagna Leo 8°31′13″ Magha 3. Two Project docs committed unchanged. Waiting for Project review. |
| 2026-11-27 | 0.4.6 | #28 | Reviewed and approved by the Project (D-135): folder checks, preview at 390 and 1280 px, R01 and Mumbai 1940 Bombay time checked. Squash-merged. |
| 2026-11-27 | 0.4.6 | #28 | Full birth form built (D-134, spec §5 v1.2): B2 split from 1024 px (form 440 px / gap 48, from 1200 px 480 / 80), "What you'll get" as three plain items on desktop and three cards below the form on phones, "Coming soon" only on "Plain-language explanations". Form without a visible heading: Name (never sent, shown in the details line), Date with the old-clock "i" (its note now links to the clock choice), Time, Place (two Hyderabad hints, "also known as Bombay" via `matchedName` from the search API, state D link), Chart style South / North remembered in `chartStyle` (North draws South with a note until 0.5.2). Advanced settings opens inside the card: coordinates with a UTC-offset dropdown, "Which clock?" only when it applies (sent only when changed), time certainty with two choices switched off and tagged, seconds. States B, C, D, E. R01 sends exactly main's request and shows Lagna Leo 8°31′13″ Magha 3. Four Project docs committed unchanged. Waiting for Project review. |
| 2026-11-27 | 0.4.5 | #27 | Reviewed and approved by the Project (D-133): folder checks, preview at 390 and 1280 px in light and dark, menu and Esc, theme, placeholder page and 404, R01 matches the engine exactly. Squash-merged. |
| 2026-11-27 | 0.4.5 | #27 | App shell built on the design system "Still Water": every colour, spacing, corner and shadow from `docs/design/tokens.json` in both themes (a test fails if they drift apart), Fraunces + Inter (Cormorant removed), shared components in `apps/web/components/`, one-line sticky header, full-screen phone menu (focus trap, Esc, scroll lock), Beta band, two-line footer, Light / Dark / Match device without a flash, placeholder pages (/profiles, /settings, /about, /faq, /disclaimer, /privacy, /sources) and a 404, each with its own title, all still noindex. Home page unchanged in layout and behaviour (R01 checked), restyled, star dividers between the result cards; "What you'll get" tiles stack at 1024–1279 px so nothing sticks out. 1,756 tests green (was 1,567). D-125 to D-132, roadmap, requirements v1.13 and `docs/design/` committed unchanged. Waiting for Project review. |
| 2026-11-25 | 0.9.1 | #26 | Panchanga calculation built (pulled forward, D-123): sunrise through the adapter (Swiss Ephemeris rise/set, upper limb, refraction), tithi/paksha, nakshatra, sunrise-based weekday, yoga, karana and hora lord in the engine (`panchangaForChart`, engine 0.6.0) and a `panchanga` section in the chart API. All 29 reference births match JHora exactly on all six fields and within 0.05 points on both "% left"; the hora lord matches with 60-minute horas from sunrise (29/29; day/night split into 12 parts: 23/29). Polar fallback: calendar weekday, flagged. D-123 and roadmap v2.14 committed unchanged. Nothing new on the site except the footer. Approved by the Project (D-124, committed unchanged); squash-merged. |
| 2026-11-25 | 0.3.7.3 | #25 | Step 0.3.7.3 and milestone v0.3 closed (D-121): the founder zoomed out on his phone and the page fills the screen; D-121 and D-122 committed unchanged. The founder's optional JHora comparison matched everything (settings test, Dasas view for R01, R06 and R16, Saturn into Libra, Scorpio and Sagittarius; D-122). Docs and progress only, no code change. |
| 2026-11-24 | 0.3.7.3 | #24 | Page width bug fixed (D-119): measured on a production build at 390 px after calculating R01, the page was 815 px wide; the only elements past the screen were 12 hidden "Does not apply" texts (position absolute) in the planet table (right edges up to 814 px) and the today's-positions table (410 px), nothing else even with every list open. Both scroll boxes now `relative`; afterwards the page equals the screen at 320/360/390/430 px, light and dark, in every state; tables still scroll inside their boxes. Regression test renders both tables and checks every scroll box in the page code. 0.3.7.1 and 0.3.7.2 marked ✅ (founder checked them on his phone, D-119). D-119 and roadmap v2.13 committed unchanged. Approved by the Project as built (D-120, committed unchanged). Squash-merged; stays 🔄 until the founder zooms out on his phone. |
| 2026-11-24 | 0.3.7.2 | #23 | Founder polish round 2 built (D-117): Sade Sati list without the outer opener, one opener per period with Rising/Peak/Setting and Saturn's sign changes inside (indented 15 px, own sub-heading), count in the sentence under the heading; Dasha periods rows get the same level colours as the Right now tiers; the tiled star dust is replaced by random four-point stars drawn once per page load in one SVG (opacity 0.5–1 × the old dots, 28 per 320 × 320 px, page grows without stars moving). D-117 and roadmap v2.12 committed unchanged. Approved by the Project (D-118, committed unchanged) with one change: stars 3.5 to 5.25 px tip to tip (were 3 to 4.5). Squash-merged; 0.3.7.2 and 0.3.7.1 stay 🔄 until the founder checks the live site. |
| 2026-11-24 | 0.3.7.1 | #22 | Founder feedback fixes built (D-115): "Coming soon" tags pinned to the bottom of equal-height cards in muted brick red (6.45:1 light, 7.46:1 dark); chart sign names 6.7 and house labels 6.3 units (6.2 / 5.8 px on a 360 px phone), Moon sign, nakshatra and pada in the centre (equal to the table's Moon row for all 29 births); "Right now" with full-width tiers and progress bars, Coming up and Sade Sati side by side; "as in Jagannatha Hora" removed from the two date notes (methodLine unchanged); sign changes (one opener per planet) and all Sade Sati periods collapsed by default with one-line summaries; looser list spacing. D-115 and roadmap v2.11 committed unchanged. Approved by the Project (D-116, committed unchanged) with one wording change: the calculation line above the planet table now ends "verified against independent reference charts" (no user-visible Jagannatha/JHora left). Squash-merged; stays 🔄 until the founder checks the live site. |
| 2026-11-24 | 0.3.7 | #21 | Approved by the Project as built (D-114): "cycle ended on <date>" wording for old births kept; "As of" and "Planets today" dates stay on the birth clock; date note and Health line accepted. D-114 committed unchanged. Squash-merged; live on jathag.vercel.app. v0.3 complete. |
| 2026-11-24 | 0.3.7 | #21 | Lists on the site built (D-113): "Right now" (current Mahadasha/Antardasha/Pratyantardasha with the life areas they activate, coming up, Sade Sati status), "Dasha periods" (Mahadashas open to Antardashas and Pratyantardashas, drawn only when opened, periods before birth hidden, "You are here"), "Transits and Sade Sati" (today's positions, every sign change of Saturn/Jupiter/Rahu/Ketu, all Sade Sati periods with phases and Saturn's crossings), "Life areas" (linked planets with reasons, wellness line on Health). Every date on the clock at birth (new `date-format.ts`). No engine/API change. D-113 committed unchanged. Waiting for Project review. |
| 2026-11-24 | 0.3.6 | #20 | Approved by the Project as built (D-112), including keeping AMBIGUOUS_LOCAL_TIME for a range end in a repeated clock hour unless first/second is sent (D-112 item 1, no code change). D-112 committed unchanged. Squash-merged; live on jathag.vercel.app. |
| 2026-11-24 | 0.3.6 | #20 | Approximate-time scanner built: engine `scanTimeRange` (engine 0.5.0) finds every second where the Lagna sign/nakshatra/navamsa or Moon sign/nakshatra/pada changes, with segments, certain values and dasha date ranges; `POST /api/chart/range` with the D-111 range rules and local times (first/second in a repeated hour). All five Project cases match `cases.json` exactly (0 s difference); 47 place-days identical to a second-by-second check; whole day ≈12 ms in the engine locally, on the Vercel preview the whole-day request takes 1.2 s cold and 0.44–0.91 s warm seen from India (66–165 ms inside the function; target under 5 s), 77 KB raw / 11.6 KB sent, gives exactly case A4, no runtime log lines. D-111 and roadmap v2.10 and the case files committed unchanged; 0.3.5 and 0.3.5.1 marked ✅ (D-111). Waiting for Project review. |
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
