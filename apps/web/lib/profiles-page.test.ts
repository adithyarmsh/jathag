// The /profiles page (step 0.4.7, design spec §11, §6.12 A, the Profiles board) as rendered: the
// server shell (no flash of the empty state), state A, three cards in last-used order, the delete check
// inside a card (role="alertdialog", Keep it first; Esc and the buttons call the right handlers), every
// control named and at least 44 px high, the phone menu's count, and the page width on a 360 px phone.
// Real focus movement and the delete itself were checked in the browser (PR report).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../messages/en.json";
import ProfilesPage, { generateMetadata } from "../app/profiles/page";
import { profileIds, ProfilesBoard, ProfilesEmpty } from "../app/profiles/profile-list";
import { PhoneMenu } from "../components/site-header";
import { byLastUsed, type Profile } from "./profiles";
import { profileCardView } from "./profiles-view";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const birth = (date: string, label: string): Profile["birth"] => ({
  date,
  time: { hour: "6", minute: "45", period: "am", second: null },
  where: { kind: "place", place: { label, geonameId: 1, lat: 13, lng: 80, timeZone: "Asia/Kolkata", countryCode: "IN", admin1Code: "25", admin2Code: "" } },
});
// Made-up people and births.
const PROFILES: Profile[] = [
  { id: "a", name: "Arjun", createdAt: "2026-11-01T00:00:00Z", lastUsedAt: "2026-11-20T00:00:00Z", birth: birth("1988-03-03", "Pune, Maharashtra, India") },
  { id: "m", name: "Meera", createdAt: "2026-11-02T00:00:00Z", lastUsedAt: "2026-11-27T00:00:00Z", birth: birth("1992-08-14", "Chennai, Tamil Nadu, India") },
  { id: "c", name: "My chart", createdAt: "2026-11-03T00:00:00Z", lastUsedAt: "2026-11-25T00:00:00Z", birth: birth("2001-01-21", "London, England, United Kingdom") },
];
const cards = byLastUsed(PROFILES).map((p) => profileCardView(p, en));
const noop = () => {};
const board = (confirmId: string | null, handlers: Partial<Record<"onAskDelete" | "onKeep" | "onDelete", (id: string) => void>> = {}) =>
  createElement(ProfilesBoard, { t: en.profiles, cards, confirmId, onAskDelete: noop, onKeep: noop, onDelete: noop, ...handlers });

/** Every button / link in the markup with its accessible name (aria-label, else its text). */
function controls(html: string) {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map((m) => {
    const label = /aria-label="([^"]*)"/.exec(m[2]!)?.[1];
    return { tag: m[1]!, attrs: m[2]!, name: (label ?? text(m[3]!)).trim() };
  });
}

/** Walks a React element tree (components without hooks are called) and returns every element. */
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<Record<string, unknown>>;
  if (typeof el.type === "function") return [el, ...elements((el.type as (p: unknown) => ReactNode)(el.props))];
  return [el, ...elements(el.props.children as ReactNode)];
}

describe("/profiles: the server-rendered page", () => {
  const html = renderToStaticMarkup(createElement(ProfilesPage));

  it("eyebrow, h1, New chart, the exact FR-PROF-03 notice, own title and description", () => {
    expect(text(/class="type-label">([\s\S]*?)<\/p>/.exec(html)![1]!)).toBe("Saved profiles");
    expect(text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)![1]!)).toBe("Your charts");
    expect(html).toContain("Profiles are saved only in this browser. Clearing browser data removes them.");
    const newChart = controls(html).find((c) => c.name === "New chart")!;
    expect(newChart.attrs).toContain('href="/"');
    expect(newChart.attrs).toContain('id="profiles-new-chart"');
    expect(newChart.attrs).toContain("btn-primary");
    const meta = generateMetadata();
    expect(meta.title).toBe(en.pages.profiles.title);
    expect(meta.description).toBe(en.pages.profiles.description);
    expect(meta.description).not.toContain("on its way");
  });

  it("before storage is read: no empty state, no cards (no flash), a quiet loading line for screen readers", () => {
    expect(html).not.toContain("No saved charts yet");
    expect(html).not.toContain("profile-card");
    expect(html).toMatch(/<p aria-live="polite" class="sr-only">Reading your saved charts…<\/p>/);
    expect(html).not.toContain("Coming soon");
  });
});

describe("state A: no saved charts yet", () => {
  const html = renderToStaticMarkup(createElement(ProfilesEmpty, { t: en.profiles }));
  it("gold star, h2, the line and a primary Make a chart", () => {
    expect(html).toMatch(/<svg aria-hidden="true"[^>]*class="profile-empty-star"/);
    expect(text(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html)![1]!)).toBe("No saved charts yet");
    expect(html).toContain("Every chart you make is kept here, in this browser only.");
    expect(controls(html).map((c) => [c.name, /href="([^"]*)"/.exec(c.attrs)?.[1]])).toEqual([["Make a chart", "/"]]);
    expect(controls(html)[0]!.attrs).toContain("btn-primary");
  });
});

describe("three profiles", () => {
  const html = renderToStaticMarkup(board(null));

  it("most recently used first: name, date · time, place", () => {
    const names = [...html.matchAll(/<h2 id="profile-[^"]+-name"[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);
    expect(names).toEqual(["Meera", "My chart", "Arjun"]);
    expect(text(html)).toContain("Meera 14 Aug 1992 · 6:45 AM Chennai, Tamil Nadu, India");
  });

  it("Open (primary, link with only the id) · Edit · Delete (quiet) on every card, each named after the person", () => {
    const c = controls(html);
    expect(c.map((x) => x.name)).toEqual(["Open Meera", "Edit Meera", "Delete Meera", "Open My chart", "Edit My chart", "Delete My chart", "Open Arjun", "Edit Arjun", "Delete Arjun"]);
    expect(c[0]!.attrs).toContain('href="/?profile=m"');
    expect(c[0]!.attrs).toContain("btn-primary");
    expect(c[1]!.attrs).toContain('href="/?edit=m"');
    expect(c[1]!.attrs).toContain("btn-quiet");
    expect(c[2]!.tag).toBe("button");
    expect(c[2]!.attrs).toContain("btn-quiet");
    // the visible word starts the accessible name (WCAG 2.5.3, label in name)
    const visible = [...html.matchAll(/<(?:a|button)\b[^>]*>([^<]*)<\/(?:a|button)>/g)].map((m) => m[1]);
    c.forEach((x, i) => expect(x.name.startsWith(visible[i]!)).toBe(true));
  });
});

describe("the delete check inside the card", () => {
  const onKeep = vi.fn();
  const onDelete = vi.fn();
  const html = renderToStaticMarkup(board("c", { onKeep, onDelete }));

  it("role=alertdialog with the question and the sentence; Keep it (quiet) first, then Delete (ink fill)", () => {
    const dialog = /<div role="alertdialog"[^>]*>([\s\S]*?)<\/div><\/div>/.exec(html)!;
    expect(dialog[0]).toContain(`aria-labelledby="${profileIds.question("c")}"`);
    expect(dialog[0]).toContain(`aria-describedby="${profileIds.text("c")}"`);
    expect(text(dialog[1]!)).toBe("Delete My chart's profile? It is removed from this browser and can't be brought back. Keep it Delete");
    const c = controls(dialog[0]);
    expect(c.map((x) => x.name)).toEqual(["Keep it", "Delete"]);
    expect(c[0]!.attrs).toContain(`id="${profileIds.keep("c")}"`); // focus starts here (profile-list.tsx)
    expect(c[0]!.attrs).toContain("btn-quiet");
    expect(c[1]!.attrs).toContain("btn-destructive");
    // the card's own buttons are replaced by the check; the other cards keep theirs
    expect(html).not.toContain('aria-label="Delete My chart"');
    expect(html).toContain('aria-label="Delete Meera"');
  });

  it("Esc = Keep it; the buttons call Keep it / Delete for that card", () => {
    const all = elements(board("c", { onKeep, onDelete }));
    const dialog = all.find((e) => e.props.role === "alertdialog")!;
    const ev = { key: "Escape", preventDefault: vi.fn(), stopPropagation: vi.fn() };
    (dialog.props.onKeyDown as (e: typeof ev) => void)(ev);
    expect(onKeep).toHaveBeenLastCalledWith("c");
    expect(ev.preventDefault).toHaveBeenCalled();
    (dialog.props.onKeyDown as (e: typeof ev) => void)({ ...ev, key: "Tab" });
    expect(onKeep).toHaveBeenCalledTimes(1);
    const buttons = all.filter((e) => e.type === "button" && typeof e.props.onClick === "function");
    const del = buttons.find((b) => b.props.children === "Delete" && String(b.props.className).includes("btn-destructive"))!;
    (del.props.onClick as () => void)();
    expect(onDelete).toHaveBeenCalledWith("c");
  });

  it("asking to delete is wired to the card's Delete button", () => {
    const onAskDelete = vi.fn();
    const del = elements(board(null, { onAskDelete })).find((e) => e.props["aria-label"] === "Delete Arjun")!;
    (del.props.onClick as () => void)();
    expect(onAskDelete).toHaveBeenCalledWith("a");
  });
});

describe("every control has a name and is at least 44 px high", () => {
  const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
  const minHeight = (cls: string) => Number(new RegExp(`\\n\\.${cls} \\{[^}]*min-height: (\\d+)px`).exec(css)?.[1] ?? 0);

  it.each([
    ["page", renderToStaticMarkup(createElement(ProfilesPage))],
    ["empty", renderToStaticMarkup(createElement(ProfilesEmpty, { t: en.profiles }))],
    ["three cards", renderToStaticMarkup(board(null))],
    ["delete check open", renderToStaticMarkup(board("m"))],
  ])("%s", (_n, html) => {
    const c = controls(html);
    expect(c.length).toBeGreaterThan(0);
    for (const x of c) {
      expect(x.name, x.attrs).not.toBe("");
      const classes = /class="([^"]*)"/.exec(x.attrs)![1]!.split(" ");
      const h = Math.max(...classes.map(minHeight));
      expect(h, x.attrs).toBeGreaterThanOrEqual(44);
    }
  });

  it("the home form's \"Cancel\" (edit mode) is 44 px high too", () => {
    expect(minHeight("editing-cancel")).toBe(44);
  });
});

describe("phone menu: the Saved profiles sub-line counts the profiles", () => {
  const t = { header: en.header, menu: en.menu, footer: en.footer };
  const sub = (profileCount: number | null | undefined) => {
    const html = renderToStaticMarkup(createElement(PhoneMenu, { t, current: null, profileCount }));
    return text(/href="\/profiles"[^>]*>([\s\S]*?)<\/a>/.exec(html)![1]!);
  };
  it.each([
    [0, "Saved profiles Kept in this browser"],
    [1, "Saved profiles 1 in this browser"],
    [3, "Saved profiles 3 in this browser"],
    [null, "Saved profiles Kept in this browser"],
    [undefined, "Saved profiles Kept in this browser"], // the server render: storage not read
  ])("%s profiles", (count, line) => {
    expect(sub(count)).toBe(line);
  });
});

// D-120 / spec §15: /profiles at 360 and 390 px with three profiles and an open delete check. As for the
// other pages: no fixed or minimum width a 360 px phone can't hold, and the card grid's minimum is
// capped at the screen. The width itself was measured in the browser (PR report).
describe("/profiles stays within a 360 / 390 px screen", () => {
  const PHONE_CONTENT = 360 - 2 * 16;
  it.each([
    ["page", renderToStaticMarkup(createElement(ProfilesPage))],
    ["three cards, one delete check open", renderToStaticMarkup(board("m"))],
    ["empty", renderToStaticMarkup(createElement(ProfilesEmpty, { t: en.profiles }))],
  ])("%s: no fixed or minimum width wider than a phone", (_n, html) => {
    const widths = [...html.matchAll(/(?<![\w-])(?:min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\]/g)].map((m) => Number(m[1]) * (m[2] === "rem" ? 16 : 1));
    const inline = [...html.matchAll(/style="[^"]*(?<![\w-])(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of [...widths, ...inline]) expect(w).toBeLessThanOrEqual(PHONE_CONTENT);
  });

  it("the card grid: auto-fill, at least 300 px but never more than the screen", () => {
    const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
    expect(/\n\.profile-grid \{([^}]*)\}/.exec(css)![1]).toContain("repeat(auto-fill, minmax(min(300px, 100%), 1fr))");
    expect(/\n\.profile-btn \{([^}]*)\}/.exec(css)![1]).toContain("min-width: 0");
  });
});
