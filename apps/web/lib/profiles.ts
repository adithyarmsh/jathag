// Saved profiles (step 0.4.7, D-136, FR-PROF-01…04): every chart a person calculates is kept in their
// own browser, never on the server (D-014, NFR-PRIV-01). Pure functions over localStorage "profiles":
//
//   { "version": 1, "profiles": [ { id, name, createdAt, lastUsedAt, birth } ] }
//
// `birth` holds the FORM INPUTS only (date, the 12-hour time as entered, the searched place or the typed
// coordinates, the clock choice when it differs from the default, the repeated-time answer), never the
// calculated results: a profile is recalculated every time it is opened (D-136 item 4).
//
// Reading never throws: a missing key, broken JSON, an unknown version or blocked storage (private
// browsing) all read as "no profiles"; a single broken entry is skipped. Writing failures are ignored
// (the form still works, nothing is kept).

import type { ClockId } from "./clock-rule";
import { parseCoordinate } from "./coordinates";
import type { RepeatedTime } from "./chart-request";
import type { Period } from "./time-12h";

export const PROFILES_KEY = "profiles";
export const PROFILES_VERSION = 1;

/** A searched place: its label, the old name that matched (if any) and the seven fields the chart request needs. */
export interface SavedPlace {
  label: string;
  matchedName?: string;
  geonameId: number;
  lat: number;
  lng: number;
  timeZone: string;
  countryCode: string;
  admin1Code: string;
  admin2Code: string;
}

/** Typed coordinates, as typed (so the form shows them back exactly), and the chosen UTC offset. */
export interface SavedManual {
  lat: string;
  lng: string;
  utcOffsetSeconds: number;
}

export interface BirthInputs {
  /** "YYYY-MM-DD" */
  date: string;
  /** The time as entered: hour "1"–"12", minute "0"–"59", AM/PM, seconds "0"–"59" or null when not added. */
  time: { hour: string; minute: string; period: Period; second: string | null };
  where: { kind: "place"; place: SavedPlace } | { kind: "manual"; manual: SavedManual };
  /** Only a clock the user chose that differs from the default (what is sent, lib/clock-choice.ts). */
  clock?: ClockId;
  /** The answer to "the time happened twice" when it was asked. */
  repeatedTime?: RepeatedTime;
}

export interface Profile {
  id: string;
  name: string;
  /** ISO date-times */
  createdAt: string;
  lastUsedAt: string;
  birth: BirthInputs;
}

type Store = Pick<Storage, "getItem" | "setItem">;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** The clocks the chart endpoint knows (packages/api/src/clock.ts, CLOCK_IDS). */
const CLOCKS = new Set(["ist", "war", "bombay", "calcutta", "lmt"]);

/** One stored entry → a clean Profile (only the known fields), or null when it is not a valid one. */
function cleanProfile(v: unknown): Profile | null {
  if (!isObj(v) || !isStr(v.id) || !v.id || !isStr(v.name) || !isStr(v.createdAt) || !isStr(v.lastUsedAt)) return null;
  const b = v.birth;
  if (!isObj(b) || !isStr(b.date) || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return null;
  const t = b.time;
  if (!isObj(t) || !isStr(t.hour) || !isStr(t.minute) || (t.period !== "am" && t.period !== "pm")) return null;
  if (t.second !== null && !isStr(t.second)) return null;
  const w = b.where;
  let where: BirthInputs["where"];
  if (isObj(w) && w.kind === "place" && isObj(w.place)) {
    const p = w.place;
    if (!isStr(p.label) || !isNum(p.geonameId) || !isNum(p.lat) || !isNum(p.lng) || !isStr(p.timeZone) || !isStr(p.countryCode) || !isStr(p.admin1Code) || !isStr(p.admin2Code)) return null;
    const place: SavedPlace = {
      label: p.label, geonameId: p.geonameId, lat: p.lat, lng: p.lng, timeZone: p.timeZone,
      countryCode: p.countryCode, admin1Code: p.admin1Code, admin2Code: p.admin2Code,
    };
    if (isStr(p.matchedName) && p.matchedName) place.matchedName = p.matchedName;
    where = { kind: "place", place };
  } else if (isObj(w) && w.kind === "manual" && isObj(w.manual)) {
    const m = w.manual;
    if (!isStr(m.lat) || !isStr(m.lng) || !isNum(m.utcOffsetSeconds)) return null;
    where = { kind: "manual", manual: { lat: m.lat, lng: m.lng, utcOffsetSeconds: m.utcOffsetSeconds } };
  } else return null;
  const birth: BirthInputs = { date: b.date, time: { hour: t.hour, minute: t.minute, period: t.period, second: t.second }, where };
  if (isStr(b.clock) && CLOCKS.has(b.clock)) birth.clock = b.clock as ClockId;
  if (b.repeatedTime === "earlier" || b.repeatedTime === "later") birth.repeatedTime = b.repeatedTime;
  return { id: v.id, name: v.name, createdAt: v.createdAt, lastUsedAt: v.lastUsedAt, birth };
}

/** The stored text → profiles (empty for nothing, broken JSON or an unknown version). */
export function parseProfiles(raw: string | null | undefined): Profile[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || data.version !== PROFILES_VERSION || !Array.isArray(data.profiles)) return [];
    const seen = new Set<string>();
    return data.profiles.map(cleanProfile).filter((p): p is Profile => {
      if (!p || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch {
    return [];
  }
}

/** The stored text for a list of profiles. */
export function serializeProfiles(profiles: readonly Profile[]): string {
  return JSON.stringify({ version: PROFILES_VERSION, profiles });
}

/** All saved profiles (empty when storage is blocked or holds something unreadable). */
export function readProfiles(store: Store | null | undefined): Profile[] {
  try {
    return parseProfiles(store?.getItem(PROFILES_KEY));
  } catch {
    return [];
  }
}

/** Stores the list; false when storage is blocked or full (then nothing is kept, nothing breaks). */
export function writeProfiles(store: Store | null | undefined, profiles: readonly Profile[]): boolean {
  try {
    if (!store) return false;
    store.setItem(PROFILES_KEY, serializeProfiles(profiles));
    return true;
  } catch {
    return false;
  }
}

/** Most recently used first (ties: most recently made first). */
export function byLastUsed(profiles: readonly Profile[]): Profile[] {
  return [...profiles].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt) || b.createdAt.localeCompare(a.createdAt));
}

/** The time on the 24-hour clock with seconds when they were added, e.g. "06:45" / "06:45:30" (as sent). */
function time24(t: BirthInputs["time"]): string {
  const h = (Number(t.hour) % 12) + (t.period === "pm" ? 12 : 0);
  const base = `${String(h).padStart(2, "0")}:${t.minute.padStart(2, "0")}`;
  return t.second === null ? base : `${base}:${t.second.padStart(2, "0")}`;
}

/**
 * True when two births are the same (D-136 item 1): same date, same time including seconds, the same
 * searched place (by GeoNames id) or the same typed coordinates and offset, the same clock choice and
 * the same repeated-time answer. Names and the place label do not count.
 */
export function sameBirth(a: BirthInputs, b: BirthInputs): boolean {
  if (a.date !== b.date || time24(a.time) !== time24(b.time)) return false;
  if ((a.clock ?? null) !== (b.clock ?? null) || (a.repeatedTime ?? null) !== (b.repeatedTime ?? null)) return false;
  if (a.where.kind === "place" && b.where.kind === "place") return a.where.place.geonameId === b.where.place.geonameId;
  if (a.where.kind === "manual" && b.where.kind === "manual") {
    const x = a.where.manual;
    const y = b.where.manual;
    const xLat = parseCoordinate(x.lat, "lat");
    const xLng = parseCoordinate(x.lng, "lng");
    return xLat !== null && xLng !== null && xLat === parseCoordinate(y.lat, "lat") && xLng === parseCoordinate(y.lng, "lng") && x.utcOffsetSeconds === y.utcOffsetSeconds;
  }
  return false;
}

export interface SaveInput {
  birth: BirthInputs;
  /** The name typed in the form ("" or spaces when left empty). */
  name: string;
  /** The profile being edited (Edit on /profiles), if any. */
  editingId?: string | null;
  /** ISO date-time of this calculation. */
  now: string;
  /** Makes the id of a new profile. */
  newId: () => string;
  /** The name of a profile made with no name ("My chart", from en.json). */
  defaultName: string;
}

/**
 * After a successful "See my chart" (D-136 items 1 and 3):
 * - in edit mode, the edited profile takes the new details (even when they changed);
 * - otherwise a profile with the same birth is updated instead of a duplicate being made;
 * - otherwise a new profile is added.
 * An updated profile keeps its name unless a new non-empty name was typed; lastUsedAt is now.
 */
export function saveCalculated(profiles: readonly Profile[], input: SaveInput): { profiles: Profile[]; id: string } {
  const typed = input.name.trim();
  const target =
    (input.editingId ? profiles.find((p) => p.id === input.editingId) : undefined) ?? profiles.find((p) => sameBirth(p.birth, input.birth));
  if (target) {
    const updated: Profile = { ...target, name: typed || target.name, lastUsedAt: input.now, birth: input.birth };
    return { profiles: profiles.map((p) => (p.id === target.id ? updated : p)), id: target.id };
  }
  const id = input.newId();
  const made: Profile = { id, name: typed || input.defaultName, createdAt: input.now, lastUsedAt: input.now, birth: input.birth };
  return { profiles: [...profiles, made], id };
}

/** Opening a profile: it moves to the top of the list. */
export function touchProfile(profiles: readonly Profile[], id: string, now: string): Profile[] {
  return profiles.map((p) => (p.id === id ? { ...p, lastUsedAt: now } : p));
}

export function deleteProfile(profiles: readonly Profile[], id: string): Profile[] {
  return profiles.filter((p) => p.id !== id);
}

/** A random id (crypto.randomUUID where the browser has it). */
export function makeProfileId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
