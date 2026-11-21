// The UTC offset shown under the place search ("Time zone: Asia/Kolkata (UTC+5:30)", D-094 item 6),
// worked out in the browser.
//
// - Birth date in a "Which clock?" window → the offset of the DEFAULT clock the chart will use
//   (clockQuestion from the API's own rule), e.g. 1890 New Delhi → UTC+5:30, 1943 → UTC+6:30.
//   Never the time zone database's own value for those dates (before 1906 that is Madras time,
//   +5:21:10, D-091), so the number shown never contradicts the chart.
// - Otherwise → the place's IANA time zone on the birth date (at the birth time if it is chosen,
//   else at noon), e.g. a New York summer date → UTC−4:00. This is what the chart API uses too.
// - No full date yet → today's offset.

import { clockQuestion, type ClockPlace } from "./clock-rule";
import { isUsableDate } from "./birth-date";

const fmtCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    fmtCache.set(timeZone, f);
  }
  return f;
}

/** Offset (seconds east of UTC) of an IANA time zone at one moment. */
export function offsetAtInstant(timeZone: string, ms: number): number {
  const t = Math.floor(ms / 1000) * 1000;
  const parts: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(t))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!);
  return Math.round((asUtc - t) / 1000);
}

/** Offset of an IANA time zone at a local wall-clock time ("YYYY-MM-DD", "HH:MM"). */
export function offsetAtLocalTime(timeZone: string, date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  let off = offsetAtInstant(timeZone, wall);
  // Two rounds settle it, also on the day the clocks change.
  for (let i = 0; i < 2; i++) {
    const next = offsetAtInstant(timeZone, wall - off * 1000);
    if (next === off) break;
    off = next;
  }
  return off;
}

export interface OffsetPlace extends ClockPlace {
  timeZone: string;
}

/**
 * The offset to show for this place: default clock in a "Which clock?" window, else the IANA zone
 * on the birth date; today's offset before a full date is entered. `time` is "HH:MM" or null.
 */
export function shownOffsetSeconds(place: OffsetPlace, date: string | null, time: string | null, now: number = Date.now()): number {
  if (!date || !isUsableDate(date)) return offsetAtInstant(place.timeZone, now);
  const q = clockQuestion(place, date);
  if (q.applies) return q.options.find((o) => o.id === q.defaultClock)!.utcOffsetSeconds;
  return offsetAtLocalTime(place.timeZone, date, time ?? "12:00");
}
