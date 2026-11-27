// The chart page's contents panel (step 0.5.1, D-138 Q1–Q3; it replaces the SectionNav of spec §3.10):
// the seven sections in the D-129 order, one level only (Q2), and which one is "current" while the page
// scrolls. Pure, tested in chart-page.test.ts; the panel itself is app/contents-panel.tsx.

export const SECTIONS = ["chart", "right-now", "dashas", "life-areas", "sade-sati", "transits", "planets"] as const;
export type SectionId = (typeof SECTIONS)[number];

/** The id of a section's heading (focus moves there when an item is chosen). */
export const headingId = (id: SectionId) => `${id}-title`;

/** How far below the landing line a section may start and still count as current (px). */
export const LINE_TOLERANCE = 16;

/**
 * The line that decides the current section (fix after D-139): where a jump puts a section's top, i.e.
 * the page's scroll-padding-top (on desktop: header + gap + the fixed details bar + 32 px, measured live;
 * on phones: just below the header), plus a small tolerance. A section that has just been jumped to
 * therefore always counts as current, whatever the screen height.
 */
export function readingLine(scrollPaddingTop: number): number {
  return scrollPaddingTop + LINE_TOLERANCE;
}

/**
 * The current section: the last one whose top (its eyebrow and heading, the anchor a jump aligns) is at
 * or above the reading line; the first one before any is; the last one once the page is scrolled to its
 * end, even if its top cannot reach the line. `tops` are the sections' distances from the top of the
 * screen, in SECTIONS order.
 */
export function activeIndex(tops: readonly number[], line: number, atEnd: boolean): number {
  if (tops.length === 0) return 0;
  if (atEnd) return tops.length - 1;
  let current = 0;
  tops.forEach((top, i) => {
    if (top <= line) current = i;
  });
  return current;
}

/** "#right-now" → "right-now" when it is one of the sections, else null. */
export function sectionFromHash(hash: string): SectionId | null {
  const id = hash.replace(/^#/, "");
  return (SECTIONS as readonly string[]).includes(id) ? (id as SectionId) : null;
}
