// "Which clock was the time written on?" inside Advanced settings (FR-IN-09; D-082, D-086, D-090,
// D-134 item 5). Pure functions over the API's own rule (clock-rule.ts), so the choices shown here
// are exactly the ones the chart endpoint accepts:
// - the section exists only when the date and the chosen place fall in a window (never for manual
//   coordinates: the typed offset is the clock);
// - options in the rule's order (default first), each with its UTC offset and the difference from IST;
// - the default is marked "(or not sure)" and is pre-selected;
// - `clockToSend` gives the `clock` field of POST /api/chart: only a choice that differs from the
//   default is sent, so a request that keeps the default stays byte-for-byte what it was before 0.4.6
//   (the server applies the same default itself).

import { clockQuestion, IST_SECONDS, type ClockId, type ClockPlace, type ClockQuestion } from "./clock-rule";
import { clockNote, type ClockNote } from "./clock-note";
import { fill, formatUtcOffset } from "./chart-format";
import type { Messages } from "./i18n";

type ClockText = Messages["form"]["advanced"]["clock"];
export type ClockSentenceKey = keyof ClockText["sentences"];

export interface ClockOptionView {
  id: ClockId;
  /** e.g. "IST (or not sure)", "Bombay local time" */
  label: string;
  /** e.g. "UTC+5:30", "UTC+4:51 · 39 minutes behind IST" */
  detail: string;
  utcOffsetSeconds: number;
}

export interface ClockChoiceView {
  question: ClockQuestion;
  /** Which situation the sentence describes (same keys as the "i" note). */
  key: ClockSentenceKey;
  sentence: string;
  defaultClock: ClockId;
  options: ClockOptionView[];
}

/** "39 minutes", "23 minutes 20 seconds", "1 hour" (exact; from a whole number of seconds). */
export function durationText(seconds: number, t: ClockText): string {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const parts: string[] = [];
  if (h) parts.push(h === 1 ? t.hour : fill(t.hours, { n: h }));
  if (m) parts.push(m === 1 ? t.minute : fill(t.minutes, { n: m }));
  if (s) parts.push(s === 1 ? t.second : fill(t.seconds, { n: s }));
  return parts.join(" ");
}

/** The difference from IST for one option, in words ("" for IST itself). */
function differenceText(id: ClockId, offset: number, t: ClockText): string {
  if (id === "ist") return "";
  const diff = offset - IST_SECONDS;
  const direction = diff < 0 ? t.behind : t.ahead;
  if (id === "lmt") {
    // The town's own time depends on its longitude: rounded to the minute, as in the "i" note (D-092).
    const minutes = Math.round(diff / 60);
    if (minutes === 0) return t.withinMinute;
    return fill(t.differenceAbout, { amount: durationText(Math.abs(minutes) * 60, t), direction });
  }
  return fill(t.difference, { amount: durationText(diff, t), direction });
}

/**
 * The clock section for this birth, or null when it is not shown: no place (or manual coordinates),
 * no full date yet, or the birth is outside every window.
 */
export function clockChoiceView(
  place: ClockPlace | null,
  date: string | null,
  t: ClockText,
  noteText: Messages["clockNote"],
): ClockChoiceView | null {
  if (!place || !date) return null;
  const question = clockQuestion(place, date);
  if (!question.applies || !question.defaultClock) return null;
  const note: ClockNote | null = clockNote(question, noteText);
  if (!note || !(note.key in t.sentences)) return null;
  const key = note.key as ClockSentenceKey;

  // The minutes for "before 1906" come from the town's own local time, as in the "i" note.
  const lmt = question.options.find((o) => o.id === "lmt");
  const minutes = lmt ? Math.round((lmt.utcOffsetSeconds - IST_SECONDS) / 60) : 0;
  const sentence = fill(t.sentences[key], { minutes: Math.abs(minutes), direction: minutes < 0 ? t.behind : t.ahead });

  const options = question.options.map((o): ClockOptionView => {
    const name = t.labels[o.id];
    const label = o.id === question.defaultClock ? fill(t.notSure, { label: name }) : name;
    const offset = formatUtcOffset(o.utcOffsetSeconds);
    const difference = differenceText(o.id, o.utcOffsetSeconds, t);
    return { id: o.id, label, detail: difference ? fill(t.offsetLine, { offset, difference }) : offset, utcOffsetSeconds: o.utcOffsetSeconds };
  });
  return { question, key, sentence, defaultClock: question.defaultClock, options };
}

/** The clock the chart will use: the user's choice when it is one of the options, else the default. */
export function effectiveClock(view: ClockChoiceView | null, choice: ClockId | null): ClockOptionView | null {
  if (!view) return null;
  return view.options.find((o) => o.id === choice) ?? view.options.find((o) => o.id === view.defaultClock)!;
}

/** The `clock` field to send: only a valid choice that differs from the default (see the top). */
export function clockToSend(view: ClockChoiceView | null, choice: ClockId | null): ClockId | undefined {
  if (!view || !choice || choice === view.defaultClock) return undefined;
  return view.options.some((o) => o.id === choice) ? choice : undefined;
}

/**
 * The "i" note when the user picked another clock in Advanced settings: it says which clock the chart
 * will now use (D-134 item 5). Null when the default is kept (the usual note is shown).
 */
export function chosenClockNote(view: ClockChoiceView | null, choice: ClockId | null, t: Messages["clockNote"], labels: ClockText["labels"]): string | null {
  const sent = clockToSend(view, choice);
  if (!sent) return null;
  const o = view!.options.find((x) => x.id === sent)!;
  return fill(t.chosen, { clock: labels[sent], offset: formatUtcOffset(o.utcOffsetSeconds) });
}
