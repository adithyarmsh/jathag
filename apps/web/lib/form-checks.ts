// Live checks for the birth form (D-094 items 3–4). Pure functions: given what is in the fields,
// say what is wrong (in the words of messages/en.json), which control(s) to outline in red, and
// whether to show it straight away. The form decides WHEN to show a message: once the date is
// complete or a field is left, never on every keystroke.

import { fill } from "./chart-format";
import { daysInMonth, MAX_YEAR, MIN_YEAR } from "./birth-date";
import type { Messages } from "./i18n";
import type { Period } from "./time-12h";

export type DatePart = "day" | "month" | "year";
export type TimePart = "hour" | "minute" | "period";

export interface Check<P extends string> {
  message: string;
  /** The controls to outline in red; the first one gets focus when "See my chart" is pressed. */
  parts: P[];
  /** Show at once (the problem is certain, e.g. 31 April), not only after the field is left. */
  immediate: boolean;
}

/** What is wrong with the date, or null when it is a usable date (FR-IN-02). */
export function checkDate(
  day: string,
  month: string,
  year: string,
  t: Pick<Messages, "missing" | "errors"> & { months: readonly string[] },
): Check<DatePart> | null {
  const d = day ? Number(day) : null;
  const m = month ? Number(month) : null;
  const fullYear = /^\d{4}$/.test(year) ? Number(year) : null;

  // The day no longer exists for the chosen month (and year): flag it at once, e.g. "April has 30 days."
  if (d && m) {
    const days = daysInMonth(m, fullYear);
    if (d > days) {
      const message =
        m === 2 && fullYear !== null
          ? fill(t.missing.dayTooLargeFebruary, { year: fullYear, days })
          : fill(t.missing.dayTooLarge, { month: t.months[m - 1]!, days });
      return { message, parts: ["day"], immediate: true };
    }
  }
  if (year && fullYear === null) return { message: t.missing.yearDigits, parts: ["year"], immediate: false };
  if (fullYear !== null && (fullYear < MIN_YEAR || fullYear > MAX_YEAR)) {
    return { message: t.errors.DATE_OUT_OF_RANGE, parts: ["year"], immediate: true };
  }
  const missing = (["day", "month", "year"] as const).filter((p) => !{ day, month, year }[p]);
  if (missing.length) return { message: t.missing.date, parts: [...missing], immediate: false };
  return null;
}

/** What is wrong with the time, or null when hour, minute and AM/PM are all chosen. */
export function checkTime(hour: string, minute: string, period: Period | null, t: Pick<Messages, "missing">): Check<TimePart> | null {
  const missing = (["hour", "minute"] as const).filter((p) => !{ hour, minute }[p]);
  if (missing.length) return { message: t.missing.time, parts: [...missing], immediate: false };
  if (!period) return { message: t.missing.period, parts: ["period"], immediate: false };
  return null;
}
