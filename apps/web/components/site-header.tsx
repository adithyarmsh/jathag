"use client";

// Header (design spec §4, FR-UI-03, FR-UI-07): one line, sticky, on every page. Wordmark + "Beta"
// linked to the home page. Desktop (≥ 1024 px): New chart · Saved profiles · About · FAQ (current page
// underlined, aria-current), a round Settings button and a round theme button. Phones and tablets: the
// theme button and a menu button that opens the full-screen phone menu under the header.
//
// While the menu is open: focus moves into it and stays inside the header + menu (Tab wraps), Esc and
// Close shut it and give focus back to the menu button, and the page behind does not scroll.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import type { Messages } from "@/lib/i18n";
import { currentPage, DESKTOP_LINKS, FOOTER_HREF, MENU_FOOT_LINKS, MENU_ROWS, SHELL_HREF, trapFocusIndex, type ShellPage } from "@/lib/shell";
import { profilesMenuSub } from "@/lib/profiles-view";
import { CloseIcon, MenuIcon, SettingsIcon } from "./icons";
import { useProfileCount } from "./profiles-store";
import { ThemeButton } from "./theme-button";
import { setThemeChoice, useThemeChoice } from "./theme-store";
import { Toggle } from "./toggle";

export interface ShellText {
  header: Messages["header"];
  menu: Messages["menu"];
  footer: Messages["footer"];
}

const MENU_ID = "site-menu";
const DESKTOP = "(min-width: 64rem)";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function SiteHeader({ t }: { t: ShellText }) {
  const current = currentPage(usePathname());
  const [open, setOpen] = useState(false);
  // A new page (a menu link, Back or Forward): the menu closes. Done while rendering, as React
  // recommends for state that follows a prop; focus then belongs to the new page.
  const [openedOn, setOpenedOn] = useState(current);
  if (openedOn !== current) {
    setOpenedOn(current);
    setOpen(false);
  }
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((giveFocusBack: boolean) => {
    setOpen(false);
    if (giveFocusBack) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const header = headerRef.current;
    // Focus moves to the first row of the menu.
    header?.querySelector<HTMLElement>(`#${MENU_ID} a[href]`)?.focus();

    // The page behind does not scroll.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== "Tab" || !header) return;
      const items = [...header.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      const to = trapFocusIndex(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey);
      if (to !== null) {
        e.preventDefault();
        items[to]?.focus();
      }
    }
    // Wider than a tablet: the menu does not exist there, so it closes.
    const mq = window.matchMedia(DESKTOP);
    const onWide = () => mq.matches && close(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open, close]);

  return (
    <header ref={headerRef} className="site-header sticky top-0 z-40 border-b border-line">
      <HeaderBar t={t} current={current} open={open} buttonRef={buttonRef} onMenu={() => (open ? close(true) : setOpen(true))} />
      {open && <PhoneMenu t={t} current={current} onNavigate={() => close(false)} />}
    </header>
  );
}

/** The one-line bar (exported for the render tests). */
export function HeaderBar({
  t,
  current,
  open,
  onMenu,
  buttonRef,
}: {
  t: ShellText;
  current: ShellPage | null;
  open: boolean;
  onMenu?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const h = t.header;
  return (
    <div className="page-frame flex h-[60px] max-w-[1168px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[68px]">
      <Link href="/" className="flex min-h-11 items-center gap-2 text-ink no-underline lg:gap-2.5">
        <span className="font-display text-[24px] leading-7 lg:text-[26px] lg:leading-[30px]">{h.wordmark}</span>
        <span className="tag tag-beta uppercase">{h.beta}</span>
        <span className="sr-only"> {h.homeLabel}</span>
      </Link>

      <nav aria-label={h.navLabel} className="hidden items-center gap-1 lg:flex">
        {DESKTOP_LINKS.map((p) => (
          <Link key={p} href={SHELL_HREF[p]} aria-current={current === p ? "page" : undefined} className="nav-link">
            {h.links[p]}
          </Link>
        ))}
        <Link
          href={SHELL_HREF.settings}
          aria-label={h.links.settings}
          aria-current={current === "settings" ? "page" : undefined}
          className="icon-button icon-button-round ml-2"
        >
          <SettingsIcon />
        </Link>
        <ThemeButton t={h.theme} round />
      </nav>

      <div className="flex items-center gap-1 lg:hidden">
        <ThemeButton t={h.theme} />
        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? t.menu.close : t.menu.open}
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={onMenu}
          className="icon-button"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
    </div>
  );
}

/**
 * The full-screen phone menu (exported for the render tests). A followed link closes it. The "Saved
 * profiles" row says how many are kept in this browser (0.4.7); `profileCount` is for the tests.
 */
export function PhoneMenu({
  t,
  current,
  onNavigate,
  profileCount,
}: {
  t: ShellText;
  current: ShellPage | null;
  onNavigate?: () => void;
  profileCount?: number | null;
}) {
  const choice = useThemeChoice();
  const storedCount = useProfileCount();
  const count = profileCount === undefined ? storedCount : profileCount;
  const th = t.header.theme;
  return (
    <div id={MENU_ID} className="site-menu lg:hidden">
      <nav aria-label={t.menu.label} className="flex flex-col gap-1 p-4">
        {MENU_ROWS.map((p) => (
          <Link key={p} href={SHELL_HREF[p]} aria-current={current === p ? "page" : undefined} onClick={onNavigate} className="menu-row">
            <span>{t.header.links[p]}</span>
            <span className="menu-row-sub">{p === "profiles" ? profilesMenuSub(count, t.menu) : t.menu.subs[p]}</span>
          </Link>
        ))}
      </nav>

      <div className="mx-4 mt-2 flex flex-col gap-2.5 border-t border-line pt-5">
        <span aria-hidden="true" className="field-label">
          {th.label}
        </span>
        <Toggle
          label={th.label}
          value={choice}
          onChange={setThemeChoice}
          options={[
            { value: "light", label: th.light },
            { value: "dark", label: th.dark },
            { value: "system", label: th.system },
          ]}
        />
      </div>

      <div className="type-small mt-auto flex flex-col gap-2 px-4 pt-8 pb-7 text-muted">
        <nav aria-label={t.menu.moreLabel}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {MENU_FOOT_LINKS.map((l) => (
              <li key={l}>
                <a href={FOOTER_HREF[l]} onClick={onNavigate} className="footer-link inline-block py-1">
                  {t.footer.links[l]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p>{t.footer.licence}</p>
      </div>
    </div>
  );
}
