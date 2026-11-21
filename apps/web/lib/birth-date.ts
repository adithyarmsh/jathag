// The date fields (day, month, year) → "YYYY-MM-DD" for the API, plus the calendar facts the form
// needs for its Day list and live checks (D-094 item 3). The API still checks every date itself
// (INVALID_DATE / DATE_OUT_OF_RANGE); these only help the form catch problems early.

const pad = (s: string, n: number) => s.padStart(n, "0");

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;

/** "YYYY-MM-DD", or null while a field is still empty. */
export function birthDate(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Gregorian leap year: every 4th year, except centuries not divisible by 400 (1900 no, 2000 yes). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Days in a month (1–12). Without a year, February has 29 (it might be a leap year); without a
 * month, 31.
 */
export function daysInMonth(month: number | null, year: number | null): number {
  if (!month) return 31;
  if (month === 2) return year === null ? 29 : isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** A full four-digit year in range, as a number; null otherwise. */
export function usableYear(year: string): number | null {
  if (!/^\d{4}$/.test(year)) return null;
  const y = Number(year);
  return y >= MIN_YEAR && y <= MAX_YEAR ? y : null;
}

/** A real calendar date between 1800-01-01 and 2100-12-31 (FR-IN-02). */
export function isUsableDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < MIN_YEAR || y > MAX_YEAR || mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(mo, y);
}
