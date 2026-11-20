# JATHAG – PRODUCT BRIEF

> Original brief from the founder (Claude Project knowledge). Where it differs from `requirements.md` or `decisions-log.md`, those win: they record later decisions (e.g. house system, node type, B2 home design, gold light mode, divisional charts, panchanga, Learn timing).

## 1. What it is
Jathag (short for the Tamil word for a birth chart) is a Vedic astrology app that generates a person's birth chart from simple inputs and explains it in a clear, modern, slightly-deeper-than-usual way. Platforms: web app first; iOS and Android after the web app is finalised.

Market: astrology is a growing market in India. The goal is a premium, holistic, easy-to-use alternative to existing cluttered astrology sites.

## 2. Core experience
- Simple input: name, date, time and place of birth.
- Output: the birth chart, then the analysis behind it.
- A bird's-eye overview of the whole chart first; tap into any area for detail.
- Depth: deeper than typical free sites, but not academic. Readable by a non-astrologer.

Example of desired depth — **Saturn in the 7th House**

> Relationships aren't necessarily something you rush into. With Saturn in your 7th house, commitment, trust and long-term compatibility may carry extra importance. You could find yourself learning a lot about patience and boundaries through partnerships. But don't jump to the conclusion that marriage will be delayed or relationships will be difficult — the rest of your birth chart plays a big role.
>
> **In a nutshell:** Quality over quantity. You'd rather build something that lasts.

Keep the writing short, engaging and easy to scan. Use simple language, relatable expressions and memorable takeaways without sounding childish or overly casual.

## 3. Sections
- Primary charts: Rasi (D1) and Navamsa (D9), in both North and South Indian styles.
- Planetary positions: table of all planets. Each planet opens its own detail page.
- Planetary analysis.
- Life area analysis: health and wellness, family and relationships, career, etc.
- Timing: Vimshottari Mahadasha, Antardasha (Bhukti), timing windows (definition below).
- Current planetary transits.
- Settings, with defaults for beginners and customisation for advanced users.

**Timing (founder's definition):** Provide a complete chronological timeline of past, current and upcoming Vimshottari Mahadasha, Antardasha (Bhukti) and Pratyantardasha periods, with exact start and end dates, significant planetary transits, important transition dates, and relevant short-, medium- and long-term timing windows for each life area. Clearly highlight the current period and upcoming changes.

## 4. Calculations (deterministic: same inputs + same settings = same chart, always)
- Planetary longitudes · Ascendant and houses · Rasi and Navamsa · Nakshatras and Padas · Planetary aspects (Vedic graha drishti) · Vimshottari Dasha and Bhukti · Transits

Accuracy requirement: a set of ~25 reference births verified against Jagannatha Hora, run as automated tests. Any engine change must still pass them.

## 5. Default settings (advanced users can change these)
Vedic / Jyotish · Sidereal · Lahiri (Chitrapaksha) · Rasi D1 · Navamsa D9 · Vimshottari · Mahadasha + Antardasha shown · North and South Indian styles · dasha year length configurable · house system and node type (decided: see decisions log) · IANA time zones with historical offsets (incl. Indian War Time 1942–45) · English only for now.

## 6. Out of scope for now
Tarot · other languages · compatibility matching (porutham) · AI-generated readings (possible later phase).

## 7. Design direction
Premium, minimal, modern, cosmic. Explicitly NOT the traditional astrology-site look (many colours, flashing graphics, ads). Midnight blue / near-black backgrounds · warm gold accents, ivory text · subtle celestial illustrations · elegant typography, thin borders · beautiful chart diagrams · restrained animations, plenty of whitespace · dark and light mode (both required) · mobile apps must feel like real apps, not a website in a wrapper.

References: FateKit (iOS) — works offline, no account needed, one profile feeds many chart types. GitaViśva — restrained typography, painted imagery, an explorable "map" view, private-by-default.

## 8. Proposed tech stack (validated; see decisions log)
React + Next.js + TypeScript · Tailwind CSS + shadcn/ui · calculation engine as a standalone TypeScript package · mobile: decided after web v1 · Supabase deferred until accounts · Vercel hosting.

## 9. Plan
Web app first → refine and finalise → mobile apps.
