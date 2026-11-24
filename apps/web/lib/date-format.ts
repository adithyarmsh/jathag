// Dates on the lists (step 0.3.7, D-097, D-098, D-113 item 6): every date is shown on the clock
// offset used at BIRTH (result.clock.utcOffsetSeconds), the same offset for every date, also dates
// decades later, as Jagannatha Hora does. The data keeps exact UTC times; this only shifts a UTC
// instant by that offset and takes the calendar date it falls on (rounded down to the day).
// Offsets can have seconds (e.g. +5:08:52 for New Delhi local time before 1906). Pure, tested in
// date-format.test.ts.

export interface CalendarDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

/** The calendar date of a UTC instant on a fixed clock offset (seconds east of UTC). */
export function dateOnBirthClock(utc: string, offsetSeconds: number): CalendarDate {
  const ms = Date.parse(utc);
  if (!Number.isFinite(ms) || !Number.isFinite(offsetSeconds)) throw new Error("dateOnBirthClock: bad input");
  // Date's UTC getters take the floor of the day for any instant, also before 1970.
  const d = new Date(ms + offsetSeconds * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** "14 Aug 2031": day, three-letter month (from en.json), year. */
export function formatCalendarDate(d: CalendarDate, monthsShort: readonly string[]): string {
  return `${d.day} ${monthsShort[d.month - 1]} ${d.year}`;
}

/** A formatter for one chart: UTC ISO string → "14 Aug 2031" on the clock at birth. */
export function birthClockFormatter(offsetSeconds: number, monthsShort: readonly string[]): (utc: string) => string {
  return (utc) => formatCalendarDate(dateOnBirthClock(utc, offsetSeconds), monthsShort);
}
