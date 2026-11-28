// The chart page /chart (step 0.5.1, D-138): which birth it shows, the request it sends, and the words
// of its details bar and title. Pure functions, tested in chart-page.test.ts.
//
// The address only ever carries the profile's random id ("/chart?profile=<id>") or "sample" (the
// made-up reference birth R01), never a birth detail (D-138). "&edit" opens the edit panel once (Edit on
// /profiles); the page takes it out of the address again.

import type { ChartResponse } from "@jathag/api";
import { fill } from "./chart-format";
import type { ChartRequestBody } from "./chart-request";
import { clockChoiceView } from "./clock-choice";
import { formatCoordinateShort, parseCoordinate } from "./coordinates";
import { formDate, formFromBirth, requestFromForm } from "./form-values";
import type { Messages } from "./i18n";
import type { BirthInputs, Profile } from "./profiles";
import { to12hText, to24h, withSeconds } from "./time-12h";

/** A profile id is made by crypto.randomUUID (or the fallback): letters, digits and dashes only. */
const ID = /^[A-Za-z0-9-]{1,64}$/;

export type ChartSource = { kind: "sample" } | { kind: "profile"; id: string; edit: boolean };

/** What "/chart?…" asks for; null = nothing usable (the page then goes home). */
export function chartSourceFromUrl(search: string): ChartSource | null {
  const q = new URLSearchParams(search);
  if (q.has("sample")) return { kind: "sample" };
  const id = q.get("profile");
  if (id && ID.test(id)) return { kind: "profile", id, edit: q.has("edit") };
  return null;
}

export const SAMPLE_HREF = "/chart?sample";

/** The chart page of one profile (only its id); `edit` opens the edit panel. */
export function chartHref(id: string, edit = false): string {
  return `/chart?profile=${encodeURIComponent(id)}${edit ? "&edit" : ""}`;
}

/**
 * The sample chart (D-138 Q7): the made-up reference birth R01, Chennai, 14 Aug 1992, 6:45 AM, as the
 * place search returns Chennai. Never saved as a profile.
 */
export const SAMPLE_BIRTH: BirthInputs = {
  date: "1992-08-14",
  time: { hour: "6", minute: "45", period: "am", second: null },
  where: {
    kind: "place",
    place: {
      label: "Chennai, Tamil Nadu, India",
      geonameId: 1264527,
      lat: 13.08784,
      lng: 80.27847,
      timeZone: "Asia/Kolkata",
      countryCode: "IN",
      admin1Code: "25",
      admin2Code: "603",
    },
  },
};

/** What the home form leaves in memory for /chart (components/chart-handoff.ts). */
export interface HandoffLike {
  id: string;
  name: string;
  birth: BirthInputs;
  result: ChartResponse | null;
}

export interface PickedBirth {
  /** The profile id (null for the sample). */
  id: string | null;
  name: string;
  birth: BirthInputs;
  /** A result the form already has (no request needed), or null. */
  result: ChartResponse | null;
  /** Read from the saved profiles (then it moves to the top of "Your charts"); never for the sample. */
  fromStorage: boolean;
}

/**
 * Which birth /chart shows (D-138): the sample; else the form's in-memory hand-off for that id (works when
 * storage is blocked); else the saved profile; else nothing (the page goes home). Nothing here writes.
 */
export function pickBirth(
  source: ChartSource | null,
  find: { handoff: (id: string) => HandoffLike | null; profile: (id: string) => Profile | null },
): PickedBirth | null {
  if (!source) return null;
  if (source.kind === "sample") return { id: null, name: "", birth: SAMPLE_BIRTH, result: null, fromStorage: false };
  const h = find.handoff(source.id);
  if (h) return { id: h.id, name: h.name, birth: h.birth, result: h.result, fromStorage: false };
  const p = find.profile(source.id);
  return p ? { id: p.id, name: p.name, birth: p.birth, result: null, fromStorage: true } : null;
}

/**
 * The POST /api/chart body for a saved birth: exactly what the form sends for the same inputs (the form
 * and this go through the same requestFromForm, with the same "Which clock?" view).
 */
export function requestFromBirth(birth: BirthInputs, t: Pick<Messages, "form" | "clockNote">): ChartRequestBody | null {
  const { values, repeatedTime } = formFromBirth(birth, "");
  const view = values.manualOn ? null : clockChoiceView(values.place, formDate(values), t.form.advanced.clock, t.clockNote);
  return requestFromForm(values, view, repeatedTime);
}

/** "HH:MM" / "HH:MM:SS" on the 24-hour clock, as sent. */
export function birthTime24(birth: BirthInputs): string {
  const tm = birth.time;
  return withSeconds(to24h(tm.hour, tm.minute, tm.period) ?? "00:00", tm.second);
}

/** The place as shown: the label of the searched place, or the typed coordinates ("13° 05′ N · 80° 17′ E"). */
export function birthPlaceLabel(birth: BirthInputs, t: Pick<Messages, "chart">): string {
  if (birth.where.kind === "place") return birth.where.place.label;
  const lat = parseCoordinate(birth.where.manual.lat, "lat");
  const lng = parseCoordinate(birth.where.manual.lng, "lng");
  if (lat === null || lng === null) return `${birth.where.manual.lat}, ${birth.where.manual.lng}`;
  return fill(t.chart.manualPlace, { lat: formatCoordinateShort(lat, "lat"), lng: formatCoordinateShort(lng, "lng") });
}

/** Which kind of name the page shows: a person's, "Your chart" (the default "My chart") or the sample. */
export type ChartOwner = { kind: "sample" } | { kind: "own" } | { kind: "named"; name: string };

export function chartOwner(source: ChartSource, name: string, defaultName: string): ChartOwner {
  if (source.kind === "sample") return { kind: "sample" };
  const n = name.trim();
  return !n || n === defaultName ? { kind: "own" } : { kind: "named", name: n };
}

/** The page title: "Meera's chart · Jathag", "Your chart · Jathag" or "Sample chart · Jathag" (no birth detail). */
export function chartTitle(owner: ChartOwner, t: Messages["chartPage"]): string {
  if (owner.kind === "sample") return t.titleSample;
  if (owner.kind === "own") return t.titleOwn;
  return fill(t.titleNamed, { name: owner.name });
}

/** The h1 of the birth chart section and the name in the details bar. */
export function chartHeading(owner: ChartOwner, t: Messages["chartPage"]): { heading: string; barName: string } {
  if (owner.kind === "sample") return { heading: t.chart.headingSample, barName: t.details.sampleName };
  if (owner.kind === "own") return { heading: t.chart.headingOwn, barName: t.chart.headingOwn };
  return { heading: fill(t.chart.headingNamed, { name: owner.name }), barName: owner.name };
}

/**
 * The typed coordinates of a birth as numbers (what the chart request sends), or null for a searched
 * place (or unreadable text).
 */
export function typedCoords(birth: BirthInputs): { lat: number; lng: number } | null {
  if (birth.where.kind !== "manual") return null;
  const lat = parseCoordinate(birth.where.manual.lat, "lat");
  const lng = parseCoordinate(birth.where.manual.lng, "lng");
  return lat === null || lng === null ? null : { lat, lng };
}

/**
 * The place shown in the details bar and in the centre of the drawn charts (and ONLY there, D-144 item
 * 1): for typed coordinates with a nearest place, "Near Chennai, Tamil Nadu, India"; otherwise the same
 * as birthPlaceLabel (the searched place's label, or the coordinates).
 */
export function shownPlace(birth: BirthInputs, t: Pick<Messages, "chart">): string {
  if (birth.where.kind === "manual" && birth.where.manual.near) return fill(t.chart.drawing.near, { place: birth.where.manual.near });
  return birthPlaceLabel(birth, t);
}

function shortDate(birth: BirthInputs, t: Pick<Messages, "lists">): string {
  const [y, m, d] = birth.date.split("-").map(Number);
  return `${d} ${t.lists.monthsShort[m! - 1]} ${y}`;
}

/** "14 Aug 1992 · 6:45 AM" for the chart centre (no repeated-time note: the details bar has it). */
export function chartDateTime(birth: BirthInputs, t: Pick<Messages, "chart" | "form" | "lists">): string {
  return fill(t.chart.drawing.dateTime, { date: shortDate(birth, t), time: to12hText(birthTime24(birth), t.form.time.am, t.form.time.pm) });
}

/** "14 Aug 1992 · 6:45 AM · Chennai, Tamil Nadu, India" (+ "(the first time)" after a repeated time). */
export function detailsLine(birth: BirthInputs, t: Pick<Messages, "chart" | "form" | "lists" | "chartPage">): string {
  let time = to12hText(birthTime24(birth), t.form.time.am, t.form.time.pm);
  if (birth.repeatedTime) {
    time += ` (${birth.repeatedTime === "earlier" ? t.form.repeatedTime.summaryEarlier : t.form.repeatedTime.summaryLater})`;
  }
  return fill(t.chartPage.details.line, { date: shortDate(birth, t), time, place: shownPlace(birth, t) });
}

/** "13° 05′ N, 80° 17′ E" from the chart response (shown on desktop). */
export function coordinatesLine(result: ChartResponse, t: Messages["chartPage"]): string {
  return fill(t.details.coordinates, {
    lat: formatCoordinateShort(result.place.lat, "lat"),
    lng: formatCoordinateShort(result.place.lng, "lng"),
  });
}

/** The first word of the place label ("Chennai"), for the chart's one-liner. */
export function shortPlace(label: string): string {
  return label.split(",")[0]!.trim();
}
