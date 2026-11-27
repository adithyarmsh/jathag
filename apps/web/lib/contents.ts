// The chart page's contents panel (step 0.5.1, D-138 Q1–Q3; it replaces the SectionNav of spec §3.10):
// the seven sections in the D-129 order, one level only (Q2), and which one is "current" while the page
// scrolls. Pure, tested in contents.test.ts; the panel itself is app/contents-panel.tsx.

export const SECTIONS = ["chart", "right-now", "dashas", "life-areas", "sade-sati", "transits", "planets"] as const;
export type SectionId = (typeof SECTIONS)[number];

/** The id of a section's heading (focus moves there when an item is chosen). */
export const headingId = (id: SectionId) => `${id}-title`;

/**
 * The current section: the last one whose top has passed the reading line (a little below the sticky
 * header), the first one before any has, and the last one once the page is scrolled to the bottom.
 * `tops` are the sections' distances from the top of the screen, in SECTIONS order.
 */
export function activeIndex(tops: readonly number[], line: number, atBottom: boolean): number {
  if (tops.length === 0) return 0;
  if (atBottom) return tops.length - 1;
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
