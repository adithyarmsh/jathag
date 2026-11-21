// Chooses the text behind the circled "i" next to the date (FR-IN-09, D-092): one note, specific to
// the "Which clock?" window(s) the birth falls in. Pure function; the windows come from the same
// rule the API uses (clock-rule.ts). No note outside the windows or for places outside India.

import type { ClockQuestion } from "./clock-rule";
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
