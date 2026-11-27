// The "Time zone" dropdown for "Enter coordinates yourself" (FR-IN-07, D-134 item 8): the UTC offsets
// that clocks really use, in their 15 / 30 / 45-minute steps, from UTC−12:00 to UTC+14:00. The chart
// API takes the chosen one as `manual.utcOffsetSeconds`. Default UTC+5:30 (IST).

const two = (n: number) => String(n).padStart(2, "0");

/** Offsets as [hours, minutes] with the sign on both, in the order shown (west to east). */
const STEPS: readonly (readonly [number, number])[] = [
  [-12, 0], [-11, 0], [-10, 0], [-9, -30], [-9, 0], [-8, 0], [-7, 0], [-6, 0], [-5, 0], [-4, 0], [-3, -30], [-3, 0],
  [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [3, 30], [4, 0], [4, 30], [5, 0], [5, 30], [5, 45], [6, 0],
  [6, 30], [7, 0], [8, 0], [8, 45], [9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [12, 0], [12, 45], [13, 0], [14, 0],
];

/** Every offset in the dropdown, in seconds east of UTC. */
export const UTC_OFFSETS: readonly number[] = STEPS.map(([h, m]) => h * 3600 + m * 60);

export const DEFAULT_UTC_OFFSET = 19_800; // UTC+5:30

/** "UTC+5:30", "UTC−3:30", "UTC±0:00" (a real minus sign, as elsewhere on the site). */
export function utcOffsetLabel(seconds: number): string {
  if (seconds === 0) return "UTC±0:00";
  const abs = Math.abs(seconds);
  return `UTC${seconds < 0 ? "−" : "+"}${Math.floor(abs / 3600)}:${two(Math.floor((abs % 3600) / 60))}`;
}
