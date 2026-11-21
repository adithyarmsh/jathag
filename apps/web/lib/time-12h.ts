// The time of birth as the form asks it (D-094 item 2): Hour 1–12, Minute 00–59 and AM or PM, with
// no default for AM/PM. The API takes "HH:MM" on the 24-hour clock.

export type Period = "am" | "pm";

export const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1 … 12
export const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0 … 59

const two = (n: number) => String(n).padStart(2, "0");

/**
 * 12-hour time → "HH:MM" (24-hour). 12 AM is midnight (00), 12 PM is noon (12).
 * Returns null if any part is missing or out of range.
 */
export function to24h(hour: string, minute: string, period: Period | null): string | null {
  if (!hour || !minute || !period) return null;
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 1 || h > 12 || m < 0 || m > 59) return null;
  const h24 = (h % 12) + (period === "pm" ? 12 : 0);
  return `${two(h24)}:${two(m)}`;
}

/** "HH:MM" (24-hour) → "12:30 AM" style, for showing the time back to the user. */
export function to12hText(time24: string, am: string, pm: string): string {
  const [h, m] = time24.split(":").map(Number);
  const hour = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour}:${two(m!)} ${h! < 12 ? am : pm}`;
}
