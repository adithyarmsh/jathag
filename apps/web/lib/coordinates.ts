// "Enter coordinates yourself" (FR-IN-07, D-134 item 8): reading what was typed into Latitude and
// Longitude (decimal degrees, negative = South / West), and the short "13° 05′ N" form used under
// the place and in the details line. Pure functions.

const two = (n: number) => String(n).padStart(2, "0");

/**
 * A typed coordinate → number, or null when it is not a usable value. Accepts "13.0827", "-13.08",
 * "−13.08" (a real minus sign) and a comma as the decimal mark ("13,0827"); spaces around are ignored.
 */
export function parseCoordinate(text: string, axis: "lat" | "lng"): number | null {
  const s = text.trim().replace(/^[−–]/, "-").replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const v = Number(s);
  const max = axis === "lat" ? 90 : 180;
  return Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

/** Degrees → "13° 05′ N" (degrees and whole minutes, rounded to the nearest minute). */
export function formatCoordinateShort(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  const total = Math.round(Math.abs(value) * 60);
  return `${Math.floor(total / 60)}° ${two(total % 60)}′ ${hemi}`;
}
