// The date fields (day, month, year) → "YYYY-MM-DD" for the API. Checking that the date is real and
// in range is the API's job (it answers INVALID_DATE / DATE_OUT_OF_RANGE); isUsableDate only decides
// whether the "i" note may be worked out yet.

const pad = (s: string, n: number) => s.padStart(n, "0");

/** "YYYY-MM-DD", or null while a field is still empty. */
export function birthDate(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** A real calendar date between 1800-01-01 and 2100-12-31 (FR-IN-02). */
export function isUsableDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1800 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}
