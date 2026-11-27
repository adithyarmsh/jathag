// The birth form's values as one plain object (step 0.4.7), so the same code builds the chart request
// for the form and for a saved profile, and a profile fills the form back exactly:
// - `requestFromForm` is what "See my chart" sends (lib/chart-request.ts; the name is not an input);
// - `birthFromForm` is what a profile keeps (lib/profiles.ts: the inputs, never the results);
// - `formFromBirth` turns a profile back into form values.
// Round trip: formFromBirth(birthFromForm(v)) gives the same request body as v, byte for byte
// (tested in profiles.test.ts).

import type { PlaceSuggestion } from "@jathag/api";
import { birthDate, isUsableDate } from "./birth-date";
import { buildChartRequest, type ChartRequestBody, type RepeatedTime } from "./chart-request";
import { clockToSend, type ClockChoiceView } from "./clock-choice";
import type { ClockId } from "./clock-rule";
import { parseCoordinate } from "./coordinates";
import type { BirthInputs } from "./profiles";
import { to24h, withSeconds, type Period } from "./time-12h";
import { DEFAULT_UTC_OFFSET } from "./utc-offsets";

export interface FormValues {
  name: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  second: string;
  period: Period | null;
  secondsOn: boolean;
  place: PlaceSuggestion | null;
  manualOn: boolean;
  lat: string;
  lng: string;
  utcOffset: number;
  clockChoice: ClockId | null;
}

export const EMPTY_FORM: FormValues = {
  name: "", day: "", month: "", year: "", hour: "", minute: "", second: "0", period: null, secondsOn: false,
  place: null, manualOn: false, lat: "", lng: "", utcOffset: DEFAULT_UTC_OFFSET, clockChoice: null,
};

/** The usable date "YYYY-MM-DD", or null. */
export function formDate(v: FormValues): string | null {
  const d = birthDate(v.day, v.month, v.year);
  return d && isUsableDate(d) ? d : null;
}

/**
 * The POST /api/chart body for these values, or null when something needed is missing. `clockView` is
 * the "Which clock?" section for this place and date (null when it does not apply).
 */
export function requestFromForm(v: FormValues, clockView: ClockChoiceView | null, repeatedTime: RepeatedTime | null): ChartRequestBody | null {
  const date = formDate(v);
  const time = to24h(v.hour, v.minute, v.period);
  if (!date || !time) return null;
  const fullTime = withSeconds(time, v.secondsOn ? v.second : null);
  if (v.manualOn) {
    const lat = parseCoordinate(v.lat, "lat");
    const lng = parseCoordinate(v.lng, "lng");
    if (lat === null || lng === null) return null;
    return buildChartRequest({ date, time: fullTime, where: { kind: "manual", manual: { lat, lng, utcOffsetSeconds: v.utcOffset } }, repeatedTime });
  }
  if (!v.place) return null;
  return buildChartRequest({ date, time: fullTime, where: { kind: "place", place: v.place }, clock: clockToSend(clockView, v.clockChoice), repeatedTime });
}

/** What a profile keeps of a successful calculation (the same inputs that made the request). */
export function birthFromForm(v: FormValues, clockView: ClockChoiceView | null, repeatedTime: RepeatedTime | null): BirthInputs | null {
  const date = formDate(v);
  if (!date || !v.period || !to24h(v.hour, v.minute, v.period)) return null;
  const time = { hour: v.hour, minute: v.minute, period: v.period, second: v.secondsOn ? v.second : null };
  let birth: BirthInputs;
  if (v.manualOn) {
    birth = { date, time, where: { kind: "manual", manual: { lat: v.lat.trim(), lng: v.lng.trim(), utcOffsetSeconds: v.utcOffset } } };
  } else if (v.place) {
    const p = v.place;
    birth = {
      date,
      time,
      where: {
        kind: "place",
        place: {
          label: p.label, ...(p.matchedName ? { matchedName: p.matchedName } : {}), geonameId: p.geonameId, lat: p.lat, lng: p.lng,
          timeZone: p.timeZone, countryCode: p.countryCode, admin1Code: p.admin1Code, admin2Code: p.admin2Code,
        },
      },
    };
    const clock = clockToSend(clockView, v.clockChoice);
    if (clock) birth.clock = clock;
  } else return null;
  if (repeatedTime) birth.repeatedTime = repeatedTime;
  return birth;
}

/** A saved profile's inputs → form values (and the repeated-time answer to send with them). */
export function formFromBirth(birth: BirthInputs, name: string): { values: FormValues; repeatedTime: RepeatedTime | null } {
  const [y, m, d] = birth.date.split("-");
  const values: FormValues = {
    ...EMPTY_FORM,
    name,
    day: String(Number(d)),
    month: String(Number(m)),
    year: y!,
    hour: birth.time.hour,
    minute: birth.time.minute,
    period: birth.time.period,
    secondsOn: birth.time.second !== null,
    second: birth.time.second ?? "0",
  };
  if (birth.where.kind === "manual") {
    const mm = birth.where.manual;
    Object.assign(values, { manualOn: true, lat: mm.lat, lng: mm.lng, utcOffset: mm.utcOffsetSeconds });
  } else {
    // The search result again, as the form had it (featureCode is not used by the form or the request).
    values.place = { ...birth.where.place, featureCode: "" };
    values.clockChoice = birth.clock ?? null;
  }
  return { values, repeatedTime: birth.repeatedTime ?? null };
}
