// How far through a period the calculation moment is (0.3.7.1, D-115 item 4): the thin progress bars
// in the "Right now" card. Display arithmetic only on the API's own start, end and asOf (no astrology).
// Pure, tested in progress.test.ts.

export interface Progress {
  /** 0–1, clamped */
  fraction: number;
  /** 0–100, rounded to a whole number */
  percent: number;
}

/**
 * Fraction of [start, end) that has passed at `asOf`, clamped to 0–1 (before the start → 0, at or after
 * the end → 1). null when a date is missing or not a time, or the period has no length.
 */
export function periodProgress(start: string | null, end: string | null, asOf: string): Progress | null {
  if (!start || !end) return null;
  const s = Date.parse(start);
  const e = Date.parse(end);
  const t = Date.parse(asOf);
  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(t) || e <= s) return null;
  const fraction = Math.min(1, Math.max(0, (t - s) / (e - s)));
  return { fraction, percent: Math.round(fraction * 100) };
}
