// Turns the chart API's stable IDs and numbers into the words and figures shown in the planet table
// (FR-PL-01, D-063, D-092). Display only: no calculation happens here, every position comes from
// the API. Pure functions, tested in apps/web/lib/*.test.ts and tests/reference/web-table.test.ts.

import type { ChartResponse } from "@jathag/api";
import type { Messages } from "./i18n";

type Body = ChartResponse["chart"]["bodies"]["La"];
type BodyCode = keyof ChartResponse["chart"]["bodies"];

/** Row order of the table (FR-PL-01). */
export const TABLE_BODIES: readonly BodyCode[] = ["La", "Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

const ARCSEC_PER_SIGN = 30 * 3600;

export interface DegreeInSign {
  deg: number;
  min: number;
  sec: number;
  /** e.g. "14° 07′ 32″" */
  text: string;
}

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Degree within the sign, to the whole second, TRUNCATED (cut off, never rounded up).
 *
 * JHora prints seconds with two decimals (e.g. 27° 44′ 48.95″ in tests/reference/raw/r01.pdf), so it
 * neither rounds nor truncates to the second. Cutting off the decimals gives exactly the digits JHora
 * shows before its decimal point, which is what you compare by eye. Truncating also means the value
 * can never show 60″ or 60′ and can never move a planet into the next sign.
 *
 * `lon` is the sidereal longitude in degrees (0–360); `sign` is the engine's sign (1–12). The degree
 * is measured from the start of THAT sign, so the display always agrees with the Sign column.
 */
export function degreeInSign(lon: number, sign: number): DegreeInSign {
  // The tiny epsilon stops 1234.9999999 (floating-point noise for an exact 1235″) losing a second.
  const total = Math.floor(lon * 3600 + 1e-7);
  const inSign = Math.min(Math.max(total - (sign - 1) * ARCSEC_PER_SIGN, 0), ARCSEC_PER_SIGN - 1);
  const deg = Math.floor(inSign / 3600);
  const min = Math.floor((inSign % 3600) / 60);
  const sec = inSign % 60;
  return { deg, min, sec, text: `${deg}° ${two(min)}′ ${two(sec)}″` };
}

/** A UTC offset in seconds as "UTC+5:30", "UTC+5:53:20", "UTC−4:00" (seconds only when not zero). */
export function formatUtcOffset(seconds: number): string {
  const sign = seconds < 0 ? "−" : "+";
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `UTC${sign}${h}:${two(m)}${s ? `:${two(s)}` : ""}`;
}

/** Degrees → "13° 05′ 16″ N" (rounded to the nearest second; 59.6″ carries into the minute). */
export function formatCoordinate(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  const total = Math.round(Math.abs(value) * 3600);
  const deg = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${deg}° ${two(min)}′ ${two(sec)}″ ${hemi}`;
}

/** "{name}" placeholders in a message → values. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all));
}

export interface TableRow {
  code: BodyCode;
  name: string;
  sign: string;
  degree: string;
  nakshatra: string;
  pada: string;
  house: string;
  dignity: string;
  /** "R", "" (not retrograde) or "—" (does not apply). */
  retrograde: string;
  /** "Combust", "" (not combust) or "—" (does not apply). */
  combust: string;
}

/**
 * One table row per body, in TABLE_BODIES order, as display strings.
 * - Lagna: dignity, retrograde and combust do not apply ("—").
 * - Rahu/Ketu: dignity "—" (D-076); never combust, so "—" (D-077); retrograde "—": the mean node
 *   always moves backwards, and JHora never marks it (R), so the column stays comparable with JHora.
 * - Sun: combust "—" (it is the reference point, D-077).
 */
export function tableRows(chart: ChartResponse["chart"], t: Messages["chart"]): TableRow[] {
  const na = t.notApplicable;
  return TABLE_BODIES.map((code) => {
    const b: Body = chart.bodies[code];
    const isLagna = code === "La";
    const isNode = code === "Ra" || code === "Ke";
    return {
      code,
      name: t.bodies[code],
      sign: t.signs[b.sign - 1]!,
      degree: degreeInSign(b.lon, b.sign).text,
      nakshatra: t.nakshatras[b.nakshatra - 1]!,
      pada: String(b.pada),
      house: String(b.house),
      dignity: isLagna || isNode || b.dignity === null ? na : t.dignity[b.dignity],
      retrograde: isLagna || isNode ? na : b.retrograde ? t.retrograde : "",
      combust: isLagna || isNode || code === "Su" ? na : b.combust ? t.combust : "",
    };
  });
}

/** The small settings line under the table (FR-SET-03). */
export function settingsLine(settings: ChartResponse["settings"], t: Messages["chart"]): string {
  const s = t.settings as Record<string, Record<string, string>>;
  const word = (group: string, id: string) => s[group]?.[id] ?? id;
  return fill(t.settingsLine, {
    ayanamsa: word("ayanamsa", settings.ayanamsa),
    node: word("node", settings.node),
    houses: word("houseSystem", settings.houseSystem),
  });
}

/** The clock used, e.g. "UTC+5:30 (Asia/Kolkata)" or "UTC+6:30 (War Time)". */
export function clockUsed(clock: ChartResponse["clock"], t: Messages["chart"]): string {
  const offset = formatUtcOffset(clock.utcOffsetSeconds);
  if (clock.source === "clockRule" && clock.id) return `${offset} (${t.clockNames[clock.id]})`;
  if (clock.timeZone) return `${offset} (${clock.timeZone})`;
  return offset;
}
