# JATHAG – DESIGN SPEC (Web v1)

Version 1.2 · 2026-11-27 · Roadmap step 0.4.4 (design handoff). Companion to `docs/requirements.md` (v1.14), `docs/decisions-log.md` (D-125 to D-134) and `docs/roadmap.md`.

**Read this before any step that changes what users see** (0.4.5 onward). It turns the approved Design System "Still Water" (D-126 to D-128) and the approved 0.4.3 mockups (D-129 to D-131) into build rules.

## 0. How to use this spec

- **Sources, in order of authority:** (1) `docs/requirements.md` says *what* must exist; (2) this spec says *how it looks and behaves*; (3) `docs/design/tokens.json` holds the exact design values; (4) `docs/design/mockups/*.dc.html` are the approved mockups, kept as a visual and numeric reference. If (2) and (4) disagree, this spec wins. If this spec and the requirements disagree, stop and bring it to the Project chat.
- **The mockups are reference files, not code to copy.** They are written in a canvas format (`<x-dc>`, `<sc-for>`, `{{…}}` holes, a `renderVals()` script) that does not run in Next.js. Read them for layout, spacing, sizes, copy and colours; build real React components. Inline `style="…"` values in them are the intended numbers.
- **All numbers in the mockups are real engine output** for the made-up reference birth R01 (Chennai, 14 Aug 1992, 6:45 AM IST) as of 26 Nov 2026. Use R01 for screenshots and tests. Never use a real person's birth details.
- **Every user-visible word goes into `apps/web/messages/en.json`** (D-063). Copy shown in the mockups is approved wording unless this spec marks it as a placeholder.
- The founder's rule (D-128): decide and move on. Small visual differences that do not break a rule here are fine; report them in the PR.

### Mockup files (`docs/design/mockups/`)

| File | Shows | Built in |
|---|---|---|
| `HomePhone.dc.html` | Home + full birth form, phone, light \| dark | 0.4.5 (shell), 0.4.6 (form) |
| `HomeDesktop.dc.html` | Home + full birth form, desktop, light \| dark | 0.4.5, 0.4.6 |
| `FormStates.dc.html` | "Which clock?" question, Advanced settings opened, errors | 0.4.6 |
| `ChartPhone.dc.html`, `ChartDesktop.dc.html` | Chart page in the D-129 order, light \| dark | 0.5.1 (page), 0.5.2, 0.5.3, 0.6.x |
| `SouthChart.dc.html` | The drawn South Indian D1 (shared part of both chart pages) | 0.5.2 |
| `Charts.dc.html` | South and North, D1 and D9, each with its index | 0.5.2 |
| `PlanetPage.dc.html` | Planet detail page (Saturn) | 0.5.3 |
| `DashaTimeline.dc.html` | Dasha timeline with "You are here" | 0.6.1 |
| `LifeArea.dc.html` | Life-area page (Health & wellness) | 0.7.5 |
| `AppShell.dc.html` | Header, phone menu, footer | 0.4.5 |
| `Profiles.dc.html` | Saved profiles, delete check | 0.4.7 |
| `Settings.dc.html` | Settings, beginner and advanced | 0.8.2 |
| `Downloads.dc.html` | Download sheet (phone) and dialog (desktop) | 0.8.4 |
| `States.dc.html` | Seven empty and error states | where each state occurs (see §6.12) |
| `InfoPopup.dc.html` | The "i" pop-up: a term, and "why is this shown" | 0.5.1 (terms), 0.7.5 (reasons) |
| `About.dc.html`, `Faq.dc.html` | About and FAQ pages (first-draft wording) | 0.9.5 |

Phone frames are 390 px wide; desktop frames 1280 px. Detail-page boards show desktop in light mode only (D-130 item 4); dark desktop uses the same tokens.

---

## 1. Design tokens

### 1.1 How tokens become code

- `docs/design/tokens.json` is the source (copied unchanged from the Design System artifact; sha256 `0b2a84d8…53e0b3`). Tokens become **CSS custom properties with the same names** in `apps/web/app/globals.css`: colour `bg` → `--bg`, spacing `space-4` → `--space-4`, radius `radius-lg` → `--radius-lg`, shadow `shadow-card` → `--shadow-card`.
- Keep today's theme mechanism: light values on `:root`; dark values under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and on `:root[data-theme="dark"]`. Settings and the phone menu offer **Light / Dark / Match device**; "Match device" removes `data-theme`.
- Expose the tokens to Tailwind 4 through `@theme inline` so classes like `bg-card`, `text-muted`, `rounded-lg` map to the variables. No hard-coded colours anywhere else.
- A test should parse `tokens.json` and check that every colour token exists in `globals.css` in both themes with the same value (so the file and the CSS can never drift).

### 1.2 Colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #F8F4EB | #0F1322 | Page background (warm paper / deep ink blue; never pure white or black) |
| `card` | #FFFFFF | #171C30 | Outer cards, the form panel, pop-ups |
| `raised` | #FCFAF5 | #1E2440 | Inner surfaces: open rows, the chart centre, "Advanced" panels |
| `ink` | #231F1A | #EDE8DC | Body text and headings |
| `muted` | #665F54 | #A9ADBD | Secondary text, dates, one-liners |
| `line` | #E3DBC9 | #2A3050 | Hairlines, inner borders, divider lines, empty bar tracks. Decoration only: never the only edge of a control |
| `field-border` | #8C8270 | #6E7696 | Edges of inputs, unselected chips, toggles, chart grid lines |
| `accent` | #76560F | #D4AE5A | Gold **fill**: primary button, selected chip/toggle, progress fills, divider star, background stars |
| `accent-text` | #76560F | #D9B566 | Gold **text**: eyebrow labels, links, the active section in the nav, "La" in charts |
| `on-accent` | #FFFFFF | #1B1405 | Text and icons on an `accent` fill (white in light, near-black in dark, D-127) |
| `accent-soft` | #F4EAD2 | #262A3A | Quiet highlight: "You are here" row, current period, Lagna box, pop-up header band, notices |
| `focus` | #76560F | #D9B566 | Keyboard focus ring |
| `tier-1` | #76560F | #D9B566 | Mahadasha (long-term) label and bar |
| `tier-2` | #23666F | #7FC6CF | Antardasha (medium-term) label and bar |
| `tier-3` | #6B4A96 | #BCA6E6 | Pratyantardasha (short-term) label and bar |
| `error` | #A3341F | #F1A08C | Errors only (field edge 2 px + message) |
| `soon-text` / `soon-bg` | #9A3324 / #FBEEEA | #F0A596 / #3A2024 | The "Coming soon" tag only |

All text pairs were measured at WCAG AA in both themes (Design System README). Any new colour pair must be measured in both themes before use.

**Renames from today's `globals.css`:** keep `--bg --card --ink --muted --line --accent --accent-text --accent-soft --error --soon-text --soon-bg --tier-1 --tier-2 --tier-3` (new values); `--shadow` → `--shadow-card`; `--star` → `--accent` (with `--star-strength` 0.3 light / 0.38 dark kept); remove `--accent-border`, `--sun-soft`, `--soon-border`; add `--raised --field-border --on-accent --focus --shadow-pop`.

### 1.3 Type

- **Fonts:** **Fraunces** (headings, weight 400, optical size on; italic for the one emphasised phrase in a hero) and **Inter** (everything else; 400, 500, 600), both through `next/font/google` (self-hosted at build, no request to Google at runtime). **Cormorant Garamond is removed.** The six Noto Serif fonts for the Indian-language words stay as they are (`:lang(..)` rules).
- **Scale** (size/line height, px):

| Token | Phone | Desktop | Font |
|---|---|---|---|
| display | 36/40 | 48/52 (home hero 56/62 as drawn) | Fraunces 400 |
| h1 | 32/38 | 36–40/42–46 | Fraunces 400 |
| h2 | 26/32 | 26–30/32–36 | Fraunces 400 |
| h3 | 20/28 | 20/28 | Fraunces 400 |
| body-lg | 17/27 (16/26 on phones is fine) | 17/27 | Inter 400 |
| body | 15/24 | 15/24 | Inter 400 |
| small | 13/20 | 13/20 | Inter 400 |
| label (eyebrow) | 12/16 | 12/16 | Inter 600, uppercase, letter-spacing 0.08em, `accent-text` |
| button | 15/20 (16 for the main action) | same | Inter 600 |

- Degrees, dates and table numbers use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere ("See my chart"). No exclamation marks, no emoji.

### 1.4 Space, shape, depth

- Spacing steps: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 24 · `space-6` 32 · `space-7` 48 · `space-8` 72 px.
- Card padding: 16 phone / 24 desktop. Gap between cards 8–12 (lists) or 20–24 (side-by-side cards). Heading to content 14–16.
- Between sections: the star divider (§3.6) with **44 px above and below on phones, 64 px on desktop**, as drawn in the approved mockups (more generous than the Design System README's 48/72; the mockups win, D-131).
- Corners: `radius-sm` 8 (fields, buttons, small rows) · `radius-md` 12 (inner cards, tiles, pop-up) · `radius-lg` 16 (outer cards) · `radius-pill` (chips, toggles, bars, tags).
- Shadows: `shadow-card` on outer cards in light mode only (dark mode uses the `line` border, shadow `none`); `shadow-pop` on the "i" pop-up, dialogs and menus in both themes.

### 1.5 Layout and breakpoints

- Content width: **max 1120 px**, centred. Page side padding 16 px (phone), 24 px (tablet), auto above 1168 px.
- Breakpoints: **phone < 640 px**, **tablet 640–1023 px**, **desktop ≥ 1024 px**. Everything must work from 360 px (FR-UI-01) and never be wider than the screen (the D-119 test stays).
- **Reading pages** (planet, timeline, life area, settings, About, FAQ): one column, max 680–760 px.
- **The 1024 px problem (D-093, D-116):** at 1024–1119 px the home split must not squeeze. Rule: the two-column home layout starts at 1024 px with form column 440 px and gap 48 px; from 1200 px use 480 px and gap 80 px (as drawn). "Coming soon" tags must never stick out of their card (test at 1024 px).

### 1.6 Decoration

- **Background stars** (D-117/D-118): keep the existing star field (random four-point stars, 3.5–5.25 px, generated in the browser), recoloured to `accent` × `--star-strength`. Behind everything, never behind text without a solid card, no clicks, hidden from screen readers.
- **Section divider** (§3.6). Nothing else decorative: no gradients, no glows, no zodiac clip-art, **no left-border cards** (today's 4 px left rules on dasha tiers are replaced, §6.4), no decorative numbers (D-067).

---

## 2. Motion

At most five kinds of motion (D-125, Design System README). Easing `cubic-bezier(.2,.7,.2,1)` (ease-out); no bounce, no spring, nothing loops.

| # | Motion | Spec | Where |
|---|---|---|---|
| 1 | Fade-up on scroll | 8 px up + fade in, 400 ms, once per section | Each section of the chart page and reading pages; the star divider fades only (400 ms, D-127) |
| 2 | Hover grow | Buttons × 1.02, chips × 1.03, 150 ms, border turns `accent` | Pointer devices only |
| 3 | Sliding fill | The selected half of a toggle slides, 240 ms | South/North, AM/PM, theme |
| 4 | Opener | Content slides open 240 ms; a short gold underline draws under the summary; chevron turns 180° | All openers (dasha rows, Sade Sati periods, FAQ, Advanced settings) |
| 5 | Progress fill | Bars fill from 0 to their value, 400 ms, when they come into view | Right now tiers, dasha rows, timeline |

- `prefers-reduced-motion: reduce` removes all movement and growth; only instant state changes remain. Content is fully visible without JavaScript (the fade-in is an enhancement; server-rendered HTML must not start hidden).
- Outer-card hover highlight (D-066, FR-UI-08) stays: border turns `accent` on pointer hover and when keyboard focus is inside.

---

## 3. Components

Build these once in `apps/web/components/` (plain React + Tailwind; no new UI library is needed, see §17). Each needs light and dark, hover, focus-visible, disabled where it applies, and a reduced-motion check. Touch targets ≥ 44 × 44 px.

### 3.1 Button
- **Primary:** `accent` fill, `on-accent` text, radius 8, height 46–50, Inter 600. One per screen area (e.g. "See my chart", "Download PDF", "Make a chart").
- **Quiet:** `card` fill, 1 px `field-border`, `ink` text ("Edit details", "Try again", "Reset all settings").
- **Destructive confirm** (profile delete only): `ink` fill with `bg` text. `error` red is not used for buttons (errors only).
- Disabled: 50 % opacity, no hover grow.

### 3.2 Chip
- Pill, min height 40–44, padding 0 14–16, 13 px. Unselected: transparent, 1 px `field-border`, `muted` text. Selected: `accent` fill, `on-accent` text, 600 (Railway pattern, D-125).
- Uses: chart-type row under the chart ("Rasi (D1)", "Navamsa (D9)"; later the 16 divisional charts, v1.1); phone section nav; planet switcher on the planet page; other-life-area row; part-of-day shortcuts.
- Chart-type and section chips are `aria-pressed` buttons or links with `aria-current`.

### 3.3 Toggle (segmented)
- A pill container with 1 px `field-border` and 3 px padding; options 38 px high; selected option filled `accent` with `on-accent` text; the fill slides (motion 3). `role="radiogroup"` + `role="radio"`.
- Uses: South / North (chart page, settings, downloads), AM / PM (form; **neither pre-selected**, D-094), Light / Dark / Match device.

### 3.4 Field
- Label above (13 px, 500, `muted`), control 44 px high, 1 px `field-border`, radius 8, `card` fill, 15 px text; hint below (13 px `muted`).
- Error: 2 px `error` border + message in `error` (13 px, 500) under the field, `aria-invalid`, message linked with `aria-describedby`; focus moves to the first field with an error (D-093).
- Selects keep the native control (good on phones) styled to match; the dropdown arrow sits a few px in from the edge (D-094).

### 3.5 Card
- **Outer card:** `card`, 1 px `line`, radius 16, `shadow-card` (light only), padding 16/24.
- **Inner card / tile:** `card` or `raised`, 1 px `line`, radius 12, padding 10–16.
- **Highlighted (current):** `accent-soft` fill + 1 px `accent` border ("You are here", current Mahadasha, current Sade Sati period, "Active now" card, selected chart-style option).

### 3.6 Divider
- A hairline (`line`) on each side of one 14 px gold four-point star (`accent`), `aria-hidden`. Padding 44 px above and below on phones, 64 px on desktop (§1.4). On phones the lines are shorter (side padding 48 px), the star keeps its size (D-127). Fades in once (motion 1).
- Star path (24 × 24 viewBox): `M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z`.

### 3.7 Progress
- Track `line`, fill in the level colour, pill ends. **Heights tell the level apart, as well as label and colour:** Mahadasha 8 px (phone) / 10 px (desktop), Antardasha 6 / 7, Pratyantardasha 4 / 5. A text value always accompanies the bar ("95% · about 10 months left"). `role="progressbar"` with `aria-valuenow` or the text read out.

### 3.8 InfoPopup ("i")
- Trigger: a 44 × 44 button containing a 20 px circled "i" (outlined `accent-text`; filled `accent` with `on-accent` letter while open). `aria-label` names the question ("What is the Lagna?", "Why is this area active?"), `aria-expanded`.
- Panel: max 320–360 px, `card`, 1 px `line`, radius 12, `shadow-pop`. Header band `accent-soft` with the title in Fraunces 20/28; body 15/24; optional second line 14/22 `muted`; optional link (13 px 600 `accent-text`).
- Opens on click and tap (phones have no hover), closes with Esc, a tap outside, or the trigger. Focus moves into the panel and back to the trigger on close. On phones it opens below its trigger at full content width; on desktop it opens under its "i".
- Two kinds (InfoPopup board): **a term** ("Lagna, the rising sign" + plain explanation + "More in the FAQ") and **why something is shown** (a short list of the chart facts behind it + the one rule sentence). The "why" kind is required for every interpretation and every highlight (FR-UI-05, FR-TIME-07).
- The old-clock "i" of 0.2.13 (black/ivory) **stays** next to the date (D-134); it is not this component. Its note links to the "Which clock?" choice inside Advanced settings (§5.2).

### 3.9 Opener (collapsible row)
- A full-width `<button aria-expanded>` row, min height 44–56, 1 px `line`, radius 8–12; open state `raised` fill + gold underline under the summary (motion 4); content below indented 12–16 px with a 1–2 px guide line in `line` or the level colour (timeline). Children are rendered only when opened where lists are long (729 pratyantardashas, D-113).
- Uses: Advanced settings, dasha rows, Sade Sati periods, FAQ answers, "All sign changes".

### 3.10 SectionNav
- **Phones/tablets (< 1024 px):** a sticky row of chips directly under the header, scrolling sideways (no visible scrollbar), active chip filled `accent`. **Desktop:** a sticky dot rail in a 150 px left column: 1 px `line` rail, 7 px hollow dots (`field-border` edge) and a 9 px filled `accent` dot for the active section, labels 14 px (`accent-text` 600 when active, `muted` otherwise) (D-127).
- Labels (chart page): **Chart · Right now · Dashas · Life areas · Sade Sati · Transits · Planets**. The active item follows the scroll (IntersectionObserver); clicking scrolls smoothly (instant with reduced motion) and moves focus to the section heading. It is a `<nav aria-label="Sections">`.

### 3.11 Also needed (small)
- **Tag:** "Coming soon" pill (`soon-bg` / `soon-text`, 12 px 600), "Active now" pill (`accent-soft` / `accent-text`), "BETA" outline pill in the header.
- **Notice:** `accent-soft` panel, radius 12, 14/22 text (privacy notices, the wellness disclaimer with a 1 px `accent` border and an "i" icon).
- **Sheet / dialog** (Downloads): phone = bottom sheet (radius 20 20 0 0) over a 45 % ink scrim; desktop = centred dialog 520 px. Focus is trapped while open; Esc closes; `role="dialog"` with a labelled title.
- **Table:** header 12 px 600 `muted`, rows 14 px with 1 px `line` separators, padding 9–12 × 12–16; wide tables scroll sideways inside a `relative` box (D-119/D-120).

---

## 4. App shell (AppShell board · step 0.4.5)

- **Header** (sticky, D-094): wordmark "Jathag" (Fraunces 24 phone / 26 desktop) + "BETA" pill, linked to home. Phones: theme button + menu button (44 × 44). Desktop nav: **New chart · Saved profiles · About · FAQ** (15 px; current page underlined 2 px `accent`), then a Settings icon button and the theme button (round, 1 px `line`). **Learn stays hidden** until v1.4 (FR-UI-07). One line on all widths (the two-line header of today is gone).
- **Phone menu:** opens full-screen under the header; the menu button becomes "Close" (×). Items as large rows (Fraunces 22, with a 13 px `muted` sub-line): New chart (Your birth details) · Saved profiles (count, e.g. "3 in this browser") · Settings · About · FAQ; current item on `accent-soft`. Below: Theme toggle Light / Dark / Match device. At the bottom: Disclaimer · Privacy · Sources & credits · Source code + the AGPL line. Focus is trapped while open; Esc closes.
- **Beta notice:** a thin `accent-soft` band under the header, 13 px, centred on desktop: "Jathag Beta. The stars are still aligning: we are actively refining our features and design." (scrolls away on phones, D-095).
- **Footer:** 1 px `line` top border. Line 1: About · FAQ · Disclaimer · Privacy · Sources & credits · Source code. Line 2: "Free and open source (AGPL-3.0). No ads, no account needed." Right side (desktop) / last line (phone): "v<step> · <commit> · Made by Adithya" (D-068, D-094).
- **Fonts, tokens, theme, star field, layout grid** all land in this step; existing pages keep working (the list cards are restyled to the new tokens but not rearranged until 0.5.1).
- **SEO groundwork (O-009):** every page server-rendered with its own `<title>` and meta description from `en.json`; clean URLs (`/`, `/chart`, `/profiles`, `/settings`, `/about`, `/faq`, `/planet/saturn`, `/timeline`, `/life-area/health`); the site stays `noindex` until 1.0.5.

## 5. Home page and birth form (HomePhone, HomeDesktop, FormStates · 0.4.5 layout, 0.4.6 form)

### 5.1 Layout
- **Desktop (≥ 1024):** B2 split (D-048, D-126): left column = Indian-language words (16 px `muted`), display heading "Know your chart, *not just your sign.*" (the italic phrase in `accent-text`), intro (17/27 `muted`), a short star divider, "WHAT YOU'LL GET" eyebrow and three plain items (h3 + one line, no cards): **An accurate chart** · **Your life timeline** · **Plain-language explanations** (with a "Coming soon" tag until v0.7). Right column = the form card.
- **Phones (D-064):** header → Beta band → words + heading + intro → form card (full width minus 12 px) → divider → "What you'll get" as three inner cards → footer.

### 5.2 The form (no heading, D-134)
The card has no visible heading (a hidden heading names the form for screen readers). **Field labels are 16/24, Inter 600, `ink`** (larger than the §3.4 default, D-134); hints stay 13 px `muted`. In this order, every label from `en.json`:
1. **Name:** label "Name" only, no hint, not marked optional (D-134). Left empty, the chart is still calculated (profiles later call it "My chart").
2. **Date of birth:** Day select (only days that exist, D-094) · Month select (full names on phones, short on desktop) · Year typed (4 digits). Live validation (e.g. "February 1993 has 28 days."). **Old-clock "i"** (D-092, D-134): for births in a historical-clock window (FR-IN-09) a small circled "i" next to the date label, `ink` colour (black in light, ivory in dark), opens the situation-specific note; the note ends with the link "Change it in Advanced settings", which opens Advanced settings and moves focus to the clock choice.
3. **Time of birth:** Hour select (1–12) · Minute select (00–59) · AM | PM toggle (neither pre-selected). Hint "As written on the birth record. 12 AM = midnight · 12 PM = noon." No "Not sure of the exact time?" link (D-134).
4. **Place of birth:** under the label the hint "Type your town or city, e.g. Hyderabad."; the type-ahead search (FR-IN-04; D-091 item 4: a muted second line "also known as Bombay" when an old name matched); under the box the hint "To narrow it down, add the state or country after a comma: Hyderabad, Telangana." After choosing: "13° 05′ N · 80° 17′ E · Asia/Kolkata (UTC+5:30)" in 13 px `muted`, the offset valid on the birth date.
5. **Chart style:** two option cards, **South Indian** and **North Indian**, with small chart icons (South: 4 × 4 grid with an empty centre; North: square with diagonals and a diamond). Selected card: 2 px `accent` border on `accent-soft`. First chart: South pre-selected; then the last choice (FR-IN-10). Until 0.5.2 the result draws South Indian, with one muted line when North was chosen.
- **"Advanced settings"**: a small text link (13–14 px, 600, `accent-text`, with a chevron, `aria-expanded`) directly above "See my chart". It opens **inside the form card** (the card grows, motion 4, §3.9); section headings inside use the field-label size (16/24 600). In this order (D-134):
  1. **Enter coordinates yourself** (checkbox; FR-IN-07): Latitude and Longitude (decimal degrees, negative = South / West) and a **UTC offset dropdown** (UTC−12:00 … UTC+14:00 in the real 15/30/45-minute steps). While on, the place search is disabled and no clock choice applies.
  2. **Which clock was the time written on?** (FR-IN-09, FormStates A panel moved here): only when the birth is in a window; one situation-specific sentence and two or three radio cards (label + UTC offset + difference from IST); default per D-082/D-086/D-090. When it does not apply, this section is not shown.
  3. **How sure are you of the birth time?** radio cards: **I know the exact time** (selected) · **I know roughly when** (From / To fields, "Or pick a part of the day:" chips Morning / Afternoon / Evening / Night, D-050/D-129, and the line "We'll show what stays the same across these two hours and what could differ. A narrow range gives a clearer chart.") · **I don't know the time**. **Until 0.8.1 the two approximate choices are shown but switched off, each with a "Coming soon" tag** (D-132).
  4. **Add seconds to the time** (checkbox): adds a Seconds select (00–59) beside the minutes.
- **See my chart** (primary, full width) and under it the privacy line (12/18 `muted`, centred): "Your details are only used to calculate your chart. Nothing is stored on our servers." (D-092; kept until accounts, D-134).
- **Errors** (FormStates C): per §3.4; place not chosen → "Please choose a place from the list."; AM/PM missing → "Please choose AM or PM."; all API error codes keep their friendly texts (0.2.13). An error inside Advanced settings opens it.

## 6. Chart page (ChartPhone, ChartDesktop, SouthChart, Charts · 0.5.1–0.6.2)

Its own page (`/chart`, opened by "See my chart"), per D-129, top to bottom:

### 6.1 Birth details bar
- Phone: a card with the name (Fraunces 22), "14 Aug 1992 · 6:45 AM · Chennai, Tamil Nadu, India", and two quiet buttons: **Edit details** · **Download**. Desktop: a full-width `card` band under the header: name + details + coordinates on the left; **Edit details · Download chart · Download report** on the right. Editing recalculates (0.5.1); downloads work from 0.8.4 (before that the buttons are hidden, not dead).

### 6.2 Section nav
Chips (phone) / dot rail (desktop), §3.10.

### 6.3 Birth chart section
- Eyebrow "BIRTH CHART", h1 "<Name>'s chart" (or "Your chart" for "My chart"), one-liner "A map of the sky at the moment of birth, seen from <place>. Each box is a sign; the numbers count houses from the Lagna."
- **The drawn chart** (§7), max 440–520 px wide (full width on phones).
- **Directly below the chart:** the chart-type chip row (**Rasi (D1)** · **Navamsa (D9)**; only charts that exist, D-125) and the **South / North** toggle (remembered, FR-CH-06). Desktop: chips left, toggle right, in the right-hand column next to the chart.
- A one-line "what this is" for the selected chart in an `accent-soft` notice: "**Rasi, the main chart.** Where each planet stood at birth. Most readings start here." / for D9: "**Navamsa.** Each sign split into nine parts. Read alongside the main chart, often for relationships and how strong each planet is." (final wording in the content steps, D-125 item 3g).
- **Three fact tiles:** Lagna (rising sign) · Moon sign · Birth star (with pada on desktop), each with an "i" (§3.8). (FR-OV-03 as amended in v1.13.)
- **The chart index** (§7.3) under the tiles.
- Desktop: chart left (440 px), heading, one-liner, chips/toggle, notice, tiles and index in the right column.

### 6.4 Right now
- Eyebrow "RIGHT NOW · <date>", h2 "You are in <planet>'s Mahadasha", one-liner "Life runs in nested periods, each led by a planet: a long chapter, a medium one inside it, and a short one inside that."
- **Tiers card:** three tiers, each: level label (12 px 600 uppercase in its tier colour: "LONG-TERM · MAHADASHA" / "MEDIUM-TERM · ANTARDASHA" / "SHORT-TERM · PRATYANTARDASHA"), planet name (Fraunces 24 / 21 / 18 phone; 28 / 23 / 20 desktop), the time left ("95% · about 10 months left", "5 days left"), the bar (§3.7), the dates. **No left-border rules** (replace today's 4 px rule).
- **Coming up** card: two-column rows (date in `muted` tabular, text): next short period, next Mahadasha (with its length).
- Link rows (12 px radius cards with ↓): "Sade Sati: <status>, until <date>" (jumps to the section); desktop also "Active life areas: …". Desktop: tiers card (1.5 fr) beside the coming-up column (1 fr).

### 6.5 Dasha periods
- Eyebrow, h2 "Your life in nine chapters", one-liner "The Vimshottari cycle: 120 years of planetary periods, starting from the Moon's birth star. Bar length shows how long each chapter lasts."
- Nine Mahadasha rows: name, years ("2011 – 2027"), length ("16 yrs"), a 4–6 px bar whose length = years / 20 (gold for the current row, `field-border` for the others). The current row is highlighted (§3.5) with "You are here" and opens to its nine Antardashas (start dates; current one in `tier-2` 600 with "· now"). Before-birth rule as D-113 ("Began before birth, on <date>"). Desktop rows are a 4-column grid (name · years · bar · length); its Antardashas show in a 3-column grid.
- A link to the full timeline page (§9).

### 6.6 Life areas
- Eyebrow, h2 "Which planets touch which part of life", one-liner "A planet is linked to a life area when it rules or sits in that area's houses. Marked areas are active in your current periods."
- Ten areas (names as Requirements §6.6): phone = one card with ten rows; desktop = 2-column grid of tiles. Each: name (15 px 600), the reasons in words ("Sun rules the 1st · Jupiter and Venus sit in the 1st"), an "Active now" tag where a current period's planet is linked (with the "why" pop-up, §3.8), Health with "General wellness only, not medical advice." Each area links to its page (0.7.5).

### 6.7 Sade Sati (own section, D-125/D-130)
- Eyebrow, h2 (e.g. "The last stretch of a slow phase" when setting; wording per status, never fear-based), one-liner "About seven and a half years while Saturn passes the sign before your Moon sign, the Moon sign itself, and the sign after. A time for patience and steady effort."
- **Status card:** phase name (Fraunces 20–22) + end date; a three-part bar (Rising / Peak / Setting, widths by real duration; the current phase filled `accent`, others `line`; 3 px gaps) with a "Today" marker (2 px `ink` line + label in `accent-text`); phase labels with start dates under it; one sentence on any back-and-forth crossing ("Saturn touches Aries on 3 Jun 2027, steps back into Pisces on 20 Oct 2027, and leaves for good on 23 Feb 2028.").
- "Every Sade Sati, birth to 120 years: <n> periods" then one opener per period (phone: rows; desktop: 5-column row), the current one highlighted, "Running at birth" / "Now" notes; each opens to its phases and dips (D-117).
- "None now" status: the card says so plainly and names the next period.

### 6.8 Transits
- Eyebrow, h2 "Where the planets are today", one-liner "Today's sky laid over your chart, counted from your Moon sign and from your Lagna."
- Table: Planet · Sign · From Moon · From Lagna (ordinals "10th"); Saturn etc. "(R)" when retrograde (never on Rahu/Ketu).
- **Next sign changes** card: the next three crossings (date · text, e.g. "Rahu moves into Capricorn, Ketu into Cancer"), then "All sign changes, next 10 years" (opener or link, enters / moves back / enters again wording, D-099). Desktop: table (1.3 fr) beside the card (1 fr).

### 6.9 Planet positions (last, D-129)
- Eyebrow, h2 "The exact numbers", one-liner. Table: Planet · Sign · Degree · Nakshatra (pada) · House · Dignity, plus Retrograde and Combust on desktop (phone: those as "(R)" in the name; the table scrolls sideways). Degrees cut off at the second (D-093).
- Under it the settings line (FR-SET-03): "Sidereal zodiac · Lahiri ayanamsa · Swiss Ephemeris · verified against independent reference charts · <coordinates> · <UTC offset>".
- Every planet name links to its planet page (§8).

### 6.10 Dates
Every date on the clock offset at birth (D-097/D-098), "14 Aug 2031" format, with the one short note near the first date list (D-113).

### 6.11 Panchanga card (0.9.3)
Not drawn yet. When built: a section after Life areas or inside the chart section (decided in 0.9.3), five tiles in the fact-tile style, each with an "i" (FR-PAN-01); handle `panchanga: null` with state F (§6.12).

### 6.12 Empty and error states (States board)
| State | Where | Content |
|---|---|---|
| A · No saved charts yet | Profiles | Gold star, h2, "Every chart you make is kept here, in this browser only.", primary "Make a chart" |
| B · Calculating | Chart page / form | "Calculating your chart…", an indeterminate gold bar, "Usually a second or two." (`aria-live="polite"`) |
| C · Could not calculate | Form / chart page | "We couldn't reach the calculator", "Your connection may have dropped for a moment. Your details are still in the form, so nothing is lost.", quiet "Try again" (`role="alert"`) |
| D · Place not found | Place search | "No places found. Try another spelling or a nearby town." + "Enter coordinates yourself" |
| E · Time happened twice | Form | The 0.2.13 repeated-time question as two quiet buttons |
| F · Part with no data | Panchanga card | "Not available for this birth: it falls before the first sunrise our data covers, on 1 Jan 1800. The rest of the chart is complete." |
| G · Page not found | 404 | "This page isn't here", "The link may be old or mistyped. Your saved charts are safe.", primary "Go to the home page" |

## 7. Drawn charts (SouthChart, Charts · 0.5.2)

### 7.1 South Indian
- 400 × 400 viewBox SVG, scaled to width; outer frame radius 10, grid lines `field-border` 1 px; centre 2 × 2 block in `raised`.
- Fixed sign boxes: Pisces top-left, Aries, Taurus, Gemini along the top; Cancer, Leo down the right; Virgo, Libra, Scorpio, Sagittarius along the bottom (right to left); Capricorn, Aquarius up the left (D-101).
- Each box: **sign name bottom-left** (10 units, `muted`), **house ordinal top-right** ("1st"…"12th", from the Lagna), planets centred (17 units, 500, `ink`), two per line, "Sa (R)" for retrograde. **Lagna box:** `accent-soft` fill, a gold 1.6 px diagonal across its top-left corner, "La" on its own first line in `accent-text` 600.
- Centre: "Rasi chart (D-1)" / "Navamsa (D-9)" (Fraunces 16), date and time, place (11 units, `muted`). **No Moon lines in the centre** (D-129).
- The SVG has `role="img"` and a full `aria-label` sentence; the planet table remains the text alternative (NFR-ACC-01).

### 7.2 North Indian
- Same frame; houses fixed: square, both diagonals, inner diamond; the 1st house is the top diamond (soft `accent-soft` fill), counting counter-clockwise.
- In each house: the **short sign name** (Ari, Tau, Gem, Can, Leo, Vir, Lib, Sco, Sag, Cap, Aqu, Pis; 11 units `muted`) placed towards the centre, planets (15 units) in the open part of the house (D-130).

### 7.3 Index under every chart (D-130)
- Under every drawn chart (South and North, D1 and D9, on every page and in downloads): eyebrow "INDEX", then **Signs**: the twelve "Ari Aries … Pis Pisces" pairs, and **Planets**: "La Lagna, rising sign · Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu · (R) retrograde". 12/18 px; abbreviation 600 `ink`, name `muted`; 3 columns on phones, 4 on desktop; top hairline.
- Planet abbreviations and sign names come from `en.json` (D-063) so the index is translatable later.
- Tapping a planet in a chart opens its planet page (FR-CH-04, Should).

## 8. Planet detail page (PlanetPage · 0.5.3)
- Back link "← <Name>'s chart"; planet chips (all nine, current selected).
- Eyebrow "PLANET", h1 "Saturn" + Sanskrit name in `muted` ("Shani"), a one-line nature of the planet (content step), and an `accent-soft` summary sentence ("In Meera's chart Saturn is in **Capricorn**, its own sign, in the **6th house**, and it was **retrograde** at birth.").
- Eight fact tiles (auto-fill, min 160 px): Sign (+ dignity in words) · Degree · Nakshatra · pada (+ its lord) · House (+ a plain house meaning) · Retrograde · Navamsa sign · Rules (houses and signs) · Looks at (aspected houses, FR-CALC-08).
- "What this placement means" card with a "Coming soon" tag until v0.7 (then the reading with its "In a nutshell", source and "i").
- "Life areas <planet> is linked to" (link rows with the reason) and "<Planet> and your timing" (its next or current Mahadasha in `tier-1`; where it is in the sky today, with Sade Sati status for Saturn).

## 9. Dasha timeline page (DashaTimeline · 0.6.1)
- Back link, eyebrow, h1 "Your timeline", one-liner "Nine planetary chapters across 120 years. Each one holds nine smaller periods, and each of those nine shorter ones."
- **Whole-life strip:** a 28 px row of nine segments from birth to the end of the cycle, widths by years (the part before birth left out), past segments `line`, the current one `tier-1` with its label in `on-accent`, future ones `raised` with a `line` edge; labels only where ≥ 5 years wide; a "You are here" marker; "Birth · 1992 / Today · 2026 / 2106" under it.
- A legend of the three levels (colour + bar height + words).
- **Vertical timeline:** a 2 px `line` rail with a dot per Mahadasha (past: filled `line`; current: 14 px `tier-1`; future: hollow `field-border`). Rows are openers (§3.9); the current Mahadasha is open, showing its Antardashas on a `tier-2` guide line; the current Antardasha is open, showing its Pratyantardashas on a `tier-3` guide line; the current one carries a bar and "You are here · <date> · <time left>".
- **Coming up** card and the clock note.
- The Sade Sati / transit layer (FR-TM-05) is added in 0.6.2 as a toggle above the timeline; its look follows the Sade Sati bar (§6.7).

## 10. Life-area page (LifeArea · 0.7.5)
- Back link, eyebrow "LIFE AREA", h1 (area name), one-liner naming its houses in plain words.
- **Health only:** the wellness notice directly under the title (§3.11): "**General wellness only, not medical advice.** For any health concern, please talk to a doctor." (FR-LA-04).
- "Active now" card when a current period touches the area (with the "why" pop-up).
- House tiles (one per house of the area): "1st house · Leo", what the house is about, its ruler and occupants.
- "Planets linked to this area" (link rows with reasons).
- **"Periods that touch this area"** (D-130): Mahadasha cards (label "LONG-TERM · MAHADASHA" in `tier-1` with an 8 px bar swatch, Fraunces planet name, "Now"/"Next" tag, dates, the reason) and inside each the Antardashas whose planet is linked (label "MEDIUM-TERM · ANTARDASHA" in `tier-2` with a 6 px swatch; rows with planet in `tier-2`, reason, dates). How far ahead the list goes is decided in 0.7.5 (the mockup shows today to 2046 plus a line pointing to the timeline); the rule is broad (D-105), so keep it scannable.
- "What this means for you" reading card ("Coming soon" until the content exists), then chips for the other areas.

## 11. Saved profiles (Profiles · 0.4.7)
- Eyebrow "SAVED PROFILES", h1 "Your charts", primary "New chart" (right on desktop, under the title on phones).
- Notice (FR-PROF-03, exact): "Profiles are saved only in this browser. Clearing browser data removes them."
- Profile cards (auto-fill, min 300 px): name (Fraunces 22), "date · time", place; **Open** (primary) · **Edit** · **Delete** (quiet), each 44 px.
- Delete asks inside the card (`role="alertdialog"`): "**Delete <name>'s profile?** It is removed from this browser and can't be brought back." with **Keep it** (quiet) and **Delete** (ink fill). Focus starts on "Keep it".
- Empty: state A.

## 12. Settings (Settings · 0.8.2)
- Eyebrow "SETTINGS", h1 "How Jathag looks and calculates", "Saved in this browser." (FR-PROF-04).
- Card 1 (beginner): Chart style (South / North toggle, "The one you grew up with") · Theme (Light / Dark / Match device) · **Show advanced options** switch (48 × 28; off by default).
- Card 2 "ADVANCED" (only when the switch is on), per FR-SET-02 v1.13 (D-131): Ayanamsa **Lahiri** ("Lahiri is the one we verify against reference charts") · Rahu and Ketu **Mean node** · Houses **Whole sign** (these three shown as fixed values, for transparency) · Dasha year **365.25 days** with 360 and 365.2422 as choices (non-default values marked "not checked against reference charts") · "Seconds in the birth time" checkbox. No True node, Raman or KP in v1 (moved to v1.2, D-131).
- "Reset all settings" (quiet) and the line "Dates are always shown on the clock used at birth, so they match what your family's records say."

## 13. Downloads (Downloads · 0.8.4)
- Trigger: the Download buttons on the chart page (§6.1). Phone: bottom sheet; desktop: dialog (§3.11).
- Title "Download", sub-line "Made in your browser. Nothing is sent anywhere." (FR-DL-03), close button.
- "What to include": one checkbox card per item (56 px, selected = `accent-soft` + `accent` border), items as FR-DL-01 (Birth chart · Navamsa chart · Planet positions · Planet readings (once v0.7 exists) · Dasha periods · Right now, Sade Sati and transits · Life areas); settings used are always printed (FR-DL-04), not a checkbox.
- Chart style toggle; a result line in an `accent-soft` notice: "**You'll get:** an image of the birth chart (PNG)." when only the birth chart is ticked, otherwise "a PDF report with …" (FR-DL-02); primary button "Download image" / "Download PDF".
- The PDF layout itself is designed in 0.8.3.

## 14. About and FAQ (About, Faq · 0.9.5; wording finalised in 0.9.4)
- **About:** centred hero (eyebrow, h1 "A birth chart, *explained plainly*", 17/27 intro), divider, four short parts (h2 + paragraph): Accurate first · Honest, never fear-based · Private by default · Free and open; then "Who makes it" (link to Adithya), the not-advice notice with a Disclaimer link, primary "Make your chart". Linked from the footer and the menu (D-125).
- **FAQ:** eyebrow, h1 "Questions people ask first", "Short answers. No question is too basic."; questions as openers (§3.9; open = `raised` + gold underline under the question + turned chevron); "Something missing? Ask or report an issue". Answers are first drafts for 0.9.4. Each question has its own anchor (`/faq#birth-time`) so "i" pop-ups can link to it ("More in the FAQ").

---

## 15. Accessibility rules (NFR-ACC-01, WCAG 2.2 AA)
- Contrast: only token pairs listed in §1.2 for text; re-measure any new pair in both themes.
- Focus: 2 px solid `focus` outline with 2 px offset on every interactive element (`:focus-visible`).
- Touch targets ≥ 44 × 44 px (chips 40 px high are allowed only inside a row with 8 px gaps; prefer 44).
- Real elements: `<button>`, `<a href>`, `<input>` + `<label>`, `<fieldset>`/`<legend>` for grouped choices; no click handlers on `div`/`span`.
- Colour is never the only signal: dasha levels also differ by label and bar height; "current" also has a text marker ("You are here", "Now", "Active now"); errors also have text.
- Every chart has a text alternative; decorative SVG is `aria-hidden`.
- Reduced motion respected (§2). Pop-ups, sheets and the phone menu manage focus and close with Esc.
- Keep the page-width test (D-120) and extend it to every new page at 360 and 390 px.

## 16. Which step builds what

| Step | Builds | Spec sections |
|---|---|---|
| 0.4.5 App shell | Tokens + fonts + theme (incl. Match device) + star recolour, header, phone menu, footer, Beta band, layout grid, Button/Chip/Toggle/Field/Card/Divider/Tag/Notice components, page shells with titles (SEO groundwork); restyle the existing home and lists to the new tokens without rearranging them | §1–§4, §15 |
| 0.4.6 Full form | Home layout (§5.1 incl. the 1024 px rule) and the full form with "Which clock?", Advanced settings, errors | §5, §6.12 B–E |
| 0.4.7 Profiles | Saved profiles page, delete check, empty state | §11, §6.12 A |
| 0.5.1 Chart page | `/chart` with details bar, SectionNav, the section order, Right now, Dasha periods, Life areas list, Sade Sati, Transits, planet table; Opener, Progress, InfoPopup (terms) | §3.7–§3.10, §6 |
| 0.5.2 Charts | South/North × D1/D9 SVG with index, chart-type chips, style toggle | §7 |
| 0.5.3 Planets | Planet detail pages | §8 |
| 0.6.1 / 0.6.2 | Timeline page; Sade Sati/transit layer and any remaining transit details | §9, §6.7–§6.8 |
| 0.7.5 | Life-area pages, "why" pop-ups, readings in their slots, Sources | §10, §3.8 |
| 0.8.2 / 0.8.4 | Settings; downloads | §12, §13 |
| 0.9.3 / 0.9.5 | Panchanga card; About, FAQ, legal pages | §6.11, §14 |

## 17. Left open on purpose (decide in the named step)
- English vs Sanskrit names on screens (D-063): the mockups use English planet and sign names with Sanskrit terms for periods (Mahadasha etc.) and the Sanskrit planet name on the planet page only. Confirm in 0.5.1.
- How far ahead a life-area page lists periods (0.7.5).
- Panchanga card position (0.9.3).
- Exact one-liner and FAQ wording (content steps 0.7.x, 0.9.2, 0.9.4).
- UI library: D-042 listed shadcn/ui, but it was never installed and the ten components above do not need it. If a step would benefit from it (or from any new dependency), Claude Code proposes it in its plan instead of adding it silently.
