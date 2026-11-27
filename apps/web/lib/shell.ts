// App shell rules that are plain logic (no React), so they can be tested without a browser.

/** The header's places (design spec §4). Learn stays hidden until v1.4 (FR-UI-07). */
export type ShellPage = "newChart" | "profiles" | "settings" | "about" | "faq";

export const SHELL_HREF: Record<ShellPage, string> = {
  newChart: "/",
  profiles: "/profiles",
  settings: "/settings",
  about: "/about",
  faq: "/faq",
};

/** Desktop nav links (Settings is the round icon button after them) and the phone menu rows. */
export const DESKTOP_LINKS: readonly ShellPage[] = ["newChart", "profiles", "about", "faq"];
export const MENU_ROWS: readonly ShellPage[] = ["newChart", "profiles", "settings", "about", "faq"];

/** Footer links, in order (FR-UI-04). Source code is the AGPL source on GitHub. */
export const SOURCE_URL = "https://github.com/adithyarmsh/jathag";
export const AUTHOR_URL = "https://yoloadithya.com";
export type FooterLink = "about" | "faq" | "disclaimer" | "privacy" | "sources" | "sourceCode";
export const FOOTER_HREF: Record<FooterLink, string> = {
  about: "/about",
  faq: "/faq",
  disclaimer: "/disclaimer",
  privacy: "/privacy",
  sources: "/sources",
  sourceCode: SOURCE_URL,
};
export const FOOTER_LINKS: readonly FooterLink[] = ["about", "faq", "disclaimer", "privacy", "sources", "sourceCode"];
/** The smaller set at the bottom of the phone menu (About and FAQ are rows above it). */
export const MENU_FOOT_LINKS: readonly FooterLink[] = ["disclaimer", "privacy", "sources", "sourceCode"];

/** Which header place a URL path belongs to (null = none, e.g. the 404 page). */
export function currentPage(pathname: string | null | undefined): ShellPage | null {
  if (!pathname) return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const [page, href] of Object.entries(SHELL_HREF) as [ShellPage, string][]) {
    if (path === href) return page;
  }
  return null;
}

/**
 * Focus trap for the open phone menu: given the focused element's index among the focusable elements
 * (-1 = none of them), how many there are and whether Shift+Tab was pressed, the index to move focus
 * to, or null to let the browser move it normally (focus stays inside without help).
 */
export function trapFocusIndex(active: number, count: number, backwards: boolean): number | null {
  if (count === 0) return null;
  if (active < 0) return backwards ? count - 1 : 0;
  if (backwards && active === 0) return count - 1;
  if (!backwards && active === count - 1) return 0;
  return null;
}
