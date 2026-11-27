// App shell (step 0.4.5, design spec §4, FR-UI-03/04/07): the header, the phone menu, the footer, the
// placeholder pages and the 404, rendered to HTML like page-width.test.ts does. What needs a real
// browser (focus moving, Esc, the scroll lock) is driven by the small rules in lib/shell.ts, tested
// here, and was checked by hand in the browser (0.4.5 PR report).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeaderBar, PhoneMenu, type ShellText } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { PlaceholderPage, placeholderMetadata, type PlaceholderKey } from "../components/placeholder-page";
import NotFound, { metadata as notFoundMetadata } from "../app/not-found";
import en from "../messages/en.json";
import { currentPage, MENU_ROWS, SHELL_HREF, SOURCE_URL, trapFocusIndex, type ShellPage } from "./shell";
import { STEP } from "./version";

const t: ShellText = { header: en.header, menu: en.menu, footer: en.footer };
const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");

const bar = (current: ShellPage | null, open = false) => renderToStaticMarkup(createElement(HeaderBar, { t, current, open }));
const menu = (current: ShellPage | null) => renderToStaticMarkup(createElement(PhoneMenu, { t, current }));

/** Every <a> and <button> in some HTML, with its attributes and visible text. */
function controls(html: string) {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map((m) => {
    const attrs = m[2]!;
    const attr = (n: string) => new RegExp(`\\s${n}="([^"]*)"`).exec(attrs)?.[1];
    const text = m[3]!.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
    return { tag: m[1]!, attrs, attr, text, name: attr("aria-label") ?? text };
  });
}
/** A CSS rule's body from globals.css (first block with that exact selector). */
function rule(selector: string) {
  const i = css.indexOf(`\n${selector} {`);
  expect(i, selector).toBeGreaterThanOrEqual(0);
  return css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
}

describe("header (one line)", () => {
  it("wordmark + Beta, linked to the home page; no tagline line any more", () => {
    const html = bar("newChart");
    const home = controls(html).find((c) => c.attr("href") === "/")!;
    expect(home.text).toContain("Jathag");
    expect(home.text).toContain("Beta");
    expect(html).not.toContain("Vedic birth charts, explained plainly");
  });

  it("desktop links in order, with the right addresses; Learn is hidden", () => {
    const nav = /<nav aria-label="Main"[\s\S]*?<\/nav>/.exec(bar(null))![0];
    const links = controls(nav).filter((c) => c.tag === "a");
    expect(links.map((l) => [l.name, l.attr("href")])).toEqual([
      ["New chart", "/"],
      ["Saved profiles", "/profiles"],
      ["About", "/about"],
      ["FAQ", "/faq"],
      ["Settings", "/settings"],
    ]);
    expect(nav).not.toMatch(/Learn/);
  });

  it.each(["newChart", "profiles", "settings", "about", "faq"] as const)("current page %s has aria-current, the others not", (p) => {
    for (const html of [bar(p), menu(p)]) {
      const current = controls(html).filter((c) => c.attr("aria-current") === "page");
      expect(current.length).toBe(1);
      expect(current[0]!.attr("href")).toBe(SHELL_HREF[p]);
    }
  });

  it("no page is current on the 404", () => {
    expect(bar(null) + menu(null)).not.toContain("aria-current");
  });

  it("menu button: closed and open states", () => {
    const closed = controls(bar(null, false)).find((c) => c.attr("aria-controls") === "site-menu")!;
    expect(closed.attr("aria-expanded")).toBe("false");
    expect(closed.name).toBe("Open menu");
    const open = controls(bar(null, true)).find((c) => c.attr("aria-controls") === "site-menu")!;
    expect(open.attr("aria-expanded")).toBe("true");
    expect(open.name).toBe("Close menu");
  });

  it("two theme buttons (desktop round, phone plain), each with a name, moon and sun drawn by CSS", () => {
    const themes = controls(bar(null)).filter((c) => c.tag === "button" && c.attr("aria-controls") === undefined);
    expect(themes).toHaveLength(2);
    for (const b of themes) expect(b.name).toBe(en.header.theme.switch); // before the browser knows the theme
    expect(bar(null)).toContain("theme-icon-moon");
    expect(bar(null)).toContain("theme-icon-sun");
  });
});

describe("phone menu", () => {
  const html = menu("about");

  it("rows: New chart · Saved profiles · Settings · About · FAQ, each with its sub-line", () => {
    const rows = controls(/<nav aria-label="Menu"[\s\S]*?<\/nav>/.exec(html)![0]);
    expect(rows.map((r) => r.attr("href"))).toEqual(MENU_ROWS.map((p) => SHELL_HREF[p]));
    expect(rows[0]!.text).toBe("New chartYour birth details");
    expect(rows[1]!.text).toBe("Saved profilesKept in this browser");
  });

  it("theme toggle Light / Dark / Match device as a radio group", () => {
    expect(html).toMatch(/role="radiogroup" aria-label="Theme"/);
    const radios = [...html.matchAll(/role="radio"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(radios).toEqual(["Light", "Dark", "Match device"]);
  });

  it("bottom links and the AGPL line", () => {
    const foot = controls(/<nav aria-label="More about Jathag"[\s\S]*?<\/nav>/.exec(html)![0]);
    expect(foot.map((l) => [l.name, l.attr("href")])).toEqual([
      ["Disclaimer", "/disclaimer"],
      ["Privacy", "/privacy"],
      ["Sources & credits", "/sources"],
      ["Source code", SOURCE_URL],
    ]);
    expect(html).toContain(en.footer.licence);
  });
});

describe("footer", () => {
  const html = renderToStaticMarkup(createElement(SiteFooter, { t: en.footer, commit: "7e5a8dc0123" }));

  it("line 1 links, line 2 the licence, then version and Made by Adithya", () => {
    const links = controls(html);
    expect(links.map((l) => l.attr("href"))).toEqual(["/about", "/faq", "/disclaimer", "/privacy", "/sources", SOURCE_URL, "https://yoloadithya.com"]);
    expect(html).toContain("Free and open source (AGPL-3.0). No ads, no account needed.");
    expect(html.replace(/<[^>]+>/g, "")).toContain(`v${STEP} · 7e5a8dc · Made by Adithya`);
  });

  it("Adithya opens in a new tab, safely, and says so to screen readers", () => {
    const a = controls(html).at(-1)!;
    expect(a.attr("target")).toBe("_blank");
    expect(a.attr("rel")).toBe("noopener noreferrer");
    expect(a.text).toContain(en.footer.newTab);
  });
});

describe("every interactive element has an accessible name", () => {
  // /profiles is a real page from 0.4.7 (its controls are checked in profiles-page.test.ts).
  const pages: PlaceholderKey[] = ["settings", "about", "faq", "disclaimer", "privacy", "sources"];
  const all = [
    bar("newChart"),
    bar(null, true),
    menu("newChart"),
    renderToStaticMarkup(createElement(SiteFooter, { t: en.footer, commit: undefined })),
    renderToStaticMarkup(createElement(NotFound)),
    ...pages.map((p) => renderToStaticMarkup(createElement(PlaceholderPage, { page: p }))),
  ];
  it.each(all.map((html, i) => [i, html] as const))("block %i", (_i, html) => {
    for (const c of controls(html)) expect(c.name, c.attrs).not.toBe("");
  });
});

describe("placeholder pages and the 404", () => {
  it.each([
    ["settings", "Settings", "How Jathag looks and calculates"],
    ["about", "About", "A birth chart, explained plainly"],
    ["faq", "FAQ", "Questions people ask first"],
    ["disclaimer", "Disclaimer", "Disclaimer"],
    ["privacy", "Privacy", "Privacy"],
    ["sources", "Sources & credits", "Sources & credits"],
  ] as const)("/%s: eyebrow, h1, line, tag, button home, own title", (page, eyebrow, h1) => {
    const html = renderToStaticMarkup(createElement(PlaceholderPage, { page }));
    const text = (re: RegExp) => re.exec(html)![1]!.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    expect(text(/class="type-label">([\s\S]*?)<\/p>/)).toBe(eyebrow);
    expect(text(/<h1[^>]*>([\s\S]*?)<\/h1>/)).toBe(h1);
    expect(html).toContain("This page is on its way.");
    expect(html).toContain('class="tag tag-soon"');
    expect(controls(html).map((c) => [c.name, c.attr("href")])).toEqual([["Back to the home page", "/"]]);
    const meta = placeholderMetadata(page);
    expect(meta.title).toBe(en.pages[page].title);
    expect(meta.description).toBe(en.pages[page].description);
  });

  it("every page title is different", () => {
    const titles = [en.meta.title, en.pages.notFound.title, ...(["profiles", "settings", "about", "faq", "disclaimer", "privacy", "sources"] as const).map((p) => en.pages[p].title)];
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("404: state G wording and a primary button home", () => {
    const html = renderToStaticMarkup(createElement(NotFound));
    expect(html).toContain("This page isn&#x27;t here");
    expect(html).toContain("The link may be old or mistyped. Your saved charts are safe.");
    const [button] = controls(html);
    expect([button!.name, button!.attr("href")]).toEqual(["Go to the home page", "/"]);
    expect(button!.attr("class")).toContain("btn-primary");
    expect(notFoundMetadata.title).toBe("Page not found · Jathag");
  });

  it("the site stays out of search engines (layout robots + robots.txt)", () => {
    const layout = readFileSync(join(import.meta.dirname, "../app/layout.tsx"), "utf8");
    expect(layout).toContain("robots: { index: false, follow: false }");
    expect(readFileSync(join(import.meta.dirname, "../app/robots.txt"), "utf8")).toMatch(/Disallow: \/\s*$/);
  });
});

describe("touch targets (as far as CSS can tell; real sizes measured in the browser)", () => {
  it("header icon buttons are 44 × 44", () => {
    expect(rule(".icon-button")).toMatch(/width: 44px;[\s\S]*height: 44px;/);
  });
  it("desktop nav links are at least 44 high, menu rows 60", () => {
    expect(rule(".nav-link")).toContain("min-height: 44px");
    expect(rule(".menu-row")).toContain("min-height: 60px");
  });
  it("toggle: 38 px options in a pill with 3 px padding and a 1 px edge = 46 px row (spec §3.3)", () => {
    expect(rule(".toggle-option")).toContain("min-height: 38px");
    expect(rule(".toggle")).toContain("padding: 3px");
  });
  it("buttons 46 (main action 50), chips 44, fields 44", () => {
    expect(rule(".btn")).toContain("min-height: 46px");
    expect(rule(".btn-main")).toContain("min-height: 50px");
    expect(rule(".chip")).toContain("min-height: 44px");
    expect(rule(".form-input")).toContain("min-height: 44px");
  });
  it("2 px focus ring with 2 px offset on every interactive element", () => {
    expect(rule(":focus-visible")).toMatch(/outline: 2px solid var\(--focus\);\s*outline-offset: 2px;/);
  });
});

describe("shell rules", () => {
  it.each([
    ["/", "newChart"],
    ["/profiles", "profiles"],
    ["/profiles/", "profiles"],
    ["/settings", "settings"],
    ["/about", "about"],
    ["/faq", "faq"],
    ["/disclaimer", null],
    ["/nope", null],
    [null, null],
  ] as const)("currentPage(%s) = %s", (path, page) => {
    expect(currentPage(path)).toBe(page);
  });

  it("focus trap: Tab on the last element wraps to the first, Shift+Tab on the first to the last", () => {
    expect(trapFocusIndex(4, 5, false)).toBe(0);
    expect(trapFocusIndex(0, 5, true)).toBe(4);
    expect(trapFocusIndex(2, 5, false)).toBeNull(); // the browser moves on by itself, still inside
    expect(trapFocusIndex(2, 5, true)).toBeNull();
    expect(trapFocusIndex(-1, 5, false)).toBe(0); // focus outside: pulled back in
    expect(trapFocusIndex(-1, 5, true)).toBe(4);
    expect(trapFocusIndex(-1, 0, false)).toBeNull();
  });
});
