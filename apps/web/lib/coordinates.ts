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

// ---- DMS (degrees, minutes, seconds) and switching formats (step 0.5.2, D-142, D-143 items 10–11) ----

export type CoordFormat = "dms" | "dd";
export type Hemisphere = "N" | "S" | "E" | "W";

/** One coordinate as typed in the DMS boxes (digits only) and its hemisphere dropdown. */
export interface DmsParts {
  d: string;
  m: string;
  s: string;
  h: Hemisphere;
}

export interface DmsValues {
  lat: DmsParts;
  lng: DmsParts;
}

/** N and E pre-selected (founder's choice, D-143 item 10). */
export const EMPTY_DMS: DmsValues = { lat: { d: "", m: "", s: "", h: "N" }, lng: { d: "", m: "", s: "", h: "E" } };

export type DmsProblem = "degrees" | "minutes" | "seconds" | "pole";
export type DmsPart = "d" | "m" | "s";

/** Decimals sent for a DMS coordinate (≈ 0.1 m): the same number as typing its DD form (D-143 item 11). */
export const DD_DECIMALS = 6;

const round6 = (v: number) => Number(v.toFixed(DD_DECIMALS));

/**
 * DMS boxes → decimal degrees (negative for S / W), rounded to 6 decimals, or the problem and the box
 * to fix. Degrees: required, 0–90 (latitude) / 0–180 (longitude). Minutes and seconds: an EMPTY box
 * counts as 0; otherwise 0–59. At 90° / 180° minutes and seconds must be 0.
 */
export function dmsToDecimal(p: DmsParts, axis: "lat" | "lng"): { value: number } | { problem: DmsProblem; part: DmsPart } {
  const max = axis === "lat" ? 90 : 180;
  const num = (s: string) => (/^\d{1,3}$/.test(s.trim()) ? Number(s.trim()) : null);
  const d = num(p.d);
  if (d === null || d > max) return { problem: "degrees", part: "d" };
  const m = p.m.trim() === "" ? 0 : num(p.m);
  if (m === null || m > 59) return { problem: "minutes", part: "m" };
  const s = p.s.trim() === "" ? 0 : num(p.s);
  if (s === null || s > 59) return { problem: "seconds", part: "s" };
  if (d === max && (m > 0 || s > 0)) return { problem: "pole", part: m > 0 ? "m" : "s" };
  const value = round6(d + m / 60 + s / 3600);
  const negative = p.h === "S" || p.h === "W";
  return { value: negative && value !== 0 ? -value : value };
}

/** Decimal degrees → DMS boxes, rounded to the nearest whole second (minutes and seconds two digits). */
export function decimalToDms(value: number, axis: "lat" | "lng"): DmsParts {
  const total = Math.round(Math.abs(value) * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const h: Hemisphere = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  return { d: String(d), m: two(m), s: two(s), h };
}

/** Decimal degrees → the DD box text: up to 6 decimals, trailing zeros trimmed ("28.616667", "13.5", "80"). */
export function decimalText(value: number): string {
  return String(round6(value));
}

const dmsInvalid = (p: DmsParts, axis: "lat" | "lng") => !dmsEmpty(p) && !("value" in dmsToDecimal(p, axis));
const ddInvalid = (text: string, axis: "lat" | "lng") => text.trim() !== "" && parseCoordinate(text, axis) === null;

/** Nothing typed in this coordinate's DMS boxes. */
export const dmsEmpty = (p: DmsParts) => !p.d.trim() && !p.m.trim() && !p.s.trim();

/**
 * Switching DMS ↔ DD (D-143 item 11), one coordinate at a time:
 * - valid in the format being left → converted into the other format;
 * - empty → the other format's boxes are emptied too (the DMS hemisphere is kept), unless they hold
 *   text that could not be converted earlier: that stays;
 * - not valid (e.g. 95° latitude) → nothing is converted: the typed text stays exactly as it is in its
 *   own format (shown again on switching back) and the other format keeps what it had.
 */
export function switchFormat(
  to: CoordFormat,
  current: { dd: { lat: string; lng: string }; dms: DmsValues },
): { dd: { lat: string; lng: string }; dms: DmsValues } {
  if (to === "dms") {
    const conv = (axis: "lat" | "lng"): DmsParts => {
      const text = current.dd[axis];
      if (!text.trim()) return dmsInvalid(current.dms[axis], axis) ? current.dms[axis] : { ...EMPTY_DMS[axis], h: current.dms[axis].h };
      const v = parseCoordinate(text, axis);
      return v === null ? current.dms[axis] : decimalToDms(v, axis);
    };
    return { dd: current.dd, dms: { lat: conv("lat"), lng: conv("lng") } };
  }
  const conv = (axis: "lat" | "lng"): string => {
    const parts = current.dms[axis];
    if (dmsEmpty(parts)) return ddInvalid(current.dd[axis], axis) ? current.dd[axis] : "";
    const r = dmsToDecimal(parts, axis);
    return "value" in r ? decimalText(r.value) : current.dd[axis];
  };
  return { dd: { lat: conv("lat"), lng: conv("lng") }, dms: current.dms };
}
