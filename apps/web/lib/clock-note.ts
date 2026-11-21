// Chooses the text behind the circled "i" next to the date (FR-IN-09, D-092): one note, specific to
// the "Which clock?" window(s) the birth falls in. Pure function; the windows come from the same
// rule the API uses (clock-rule.ts). No note outside the windows or for places outside India.

import { clockQuestion, type ClockPlace, type ClockQuestion } from "./clock-rule";
import { fill } from "./chart-format";
import type { Messages } from "./i18n";

const IST = 19_800;

/** Which message key the note uses, plus the filled-in text. Null when there is no note. */
export interface ClockNote {
  key: keyof Messages["clockNote"];
  text: string;
}

export function clockNote(question: ClockQuestion, t: Messages["clockNote"]): ClockNote | null {
  if (!question.applies) return null;
  const w = new Set(question.windows);
  const war = w.has("war-1942-1945");
  const warEarly = w.has("war-1941-1942");

  let key: ClockNote["key"];
  if (w.has("mumbai-1906-1955")) key = war ? "mumbaiWarTime" : warEarly ? "mumbaiWarTimeEarly" : "mumbai";
  else if (w.has("west-bengal-1906-1948")) key = war ? "westBengalWarTime" : warEarly ? "westBengalWarTimeEarly" : "westBengal";
  else if (war) key = "warTime";
  else if (warEarly) key = "warTimeEarly";
  else if (w.has("india-before-1906")) {
    const lmt = question.options.find((o) => o.id === "lmt");
    if (!lmt) return null;
    // Minutes between the town's own local time and IST (D-092). Never the database's Madras time (D-091).
    const minutes = Math.round((lmt.utcOffsetSeconds - IST) / 60);
    const direction = minutes < 0 ? t.behind : t.ahead;
    if (minutes === 0) key = "before1906Same";
    else if (Math.abs(minutes) === 1) key = "before1906OneMinute";
    else key = "before1906";
    return { key, text: fill(t[key], { minutes: Math.abs(minutes), direction }) };
  } else return null;

  return { key, text: t[key] };
}

/**
 * Any place in India that is neither Mumbai nor West Bengal: used before a place is chosen, so the
 * "i" can say "If born in India: …" for the all-India windows (D-094 item 5). Only the all-India
 * windows can match it (before 1906, the two War Time windows).
 */
const SOMEWHERE_IN_INDIA: ClockPlace = { geonameId: 0, countryCode: "IN", admin1Code: "", admin2Code: "", lng: 82.5 };

function sameWindowsAllYear(place: ClockPlace, year: number): boolean {
  const first = clockQuestion(place, `${year}-01-01`).windows.join();
  if (!first) return false;
  const day = new Date(Date.UTC(year, 0, 1));
  while (day.getUTCFullYear() === year) {
    if (clockQuestion(place, day.toISOString().slice(0, 10)).windows.join() !== first) return false;
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return true;
}

/**
 * The "i" note as early as possible (D-094 item 5), using the API's rule unchanged:
 * - `date` is the full date when day, month and year are all set and real; otherwise null.
 * - `year` is a usable four-digit year, or null.
 * With the full date the exact rule is used; with only a year, a note is shown only if the whole
 * year lies inside the same window(s) (e.g. 1890, 1943, 1944; not 1942 or 1945).
 * Before a place is chosen the note starts "If born in India: "; once a place is chosen the usual
 * note for that place is shown (exact minutes, Mumbai / West Bengal), and none outside India.
 */
export function earlyClockNote(
  place: ClockPlace | null,
  date: string | null,
  year: number | null,
  t: Messages["clockNote"],
): ClockNote | null {
  const where = place ?? SOMEWHERE_IN_INDIA;
  let on: string;
  if (date) on = date;
  else if (year !== null && sameWindowsAllYear(where, year)) on = `${year}-01-01`;
  else return null;

  const question = clockQuestion(where, on);
  if (place) return clockNote(question, t);
  if (!question.applies) return null;
  // No place yet: for before 1906 the minutes depend on the town, so give the range instead.
  const inner =
    question.windows.length === 1 && question.windows[0] === "india-before-1906"
      ? { key: "before1906NoPlace" as const, text: t.before1906NoPlace }
      : clockNote(question, t);
  if (!inner) return null;
  return { key: inner.key, text: fill(t.ifInIndia, { text: inner.text }) };
}
