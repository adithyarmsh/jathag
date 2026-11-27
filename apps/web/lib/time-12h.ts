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

/** "HH:MM" or "HH:MM:SS" (24-hour) → "12:30 AM" / "12:30:15 AM" style, for showing the time back to the user. */
export function to12hText(time24: string, am: string, pm: string): string {
  const [h, m, s] = time24.split(":").map(Number);
  const hour = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour}:${two(m!)}${s === undefined ? "" : `:${two(s)}`} ${h! < 12 ? am : pm}`;
}

export const SECONDS = MINUTES; // 0 … 59 (Advanced settings → "Add seconds to the time", D-134)

/** "HH:MM" + seconds "0"–"59" → "HH:MM:SS"; null seconds (not asked for) → "HH:MM" unchanged. */
export function withSeconds(time24: string, seconds: string | null): string {
  if (seconds === null) return time24;
  const s = Number(seconds);
  return Number.isInteger(s) && s >= 0 && s <= 59 ? `${time24}:${two(s)}` : time24;
}
