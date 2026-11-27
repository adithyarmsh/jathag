// The body of POST /api/chart, built from the form (FR-IN-01…09; D-134). Pure function, so the exact
// bytes can be tested:
// - a searched place sends the seven place fields, in the same order as before 0.4.6, and nothing
//   else (not the label, not the matched old name);
// - "Enter coordinates yourself" sends `manual` { lat, lng, utcOffsetSeconds } instead of `place`
//   (then no clock choice: the typed offset is the clock);
// - `clock` only when the user chose a clock that is not the default (lib/clock-choice.ts);
// - the time is "HH:MM", or "HH:MM:SS" with "Add seconds to the time";
// - the name is NOT an input here: it never leaves the browser (D-134 item 2).

import type { ClockId } from "./clock-rule";

export type RepeatedTime = "earlier" | "later";

/** The place fields the chart endpoint takes (a place search result has these and more). */
export interface RequestPlace {
  geonameId: number;
  lat: number;
  lng: number;
  timeZone: string;
  countryCode: string;
  admin1Code: string;
  admin2Code: string;
}

export interface ManualPlace {
  lat: number;
  lng: number;
  utcOffsetSeconds: number;
}

export interface ChartRequestInput {
  date: string;
  time: string;
  /** Either a searched place or manual coordinates. */
  where: { kind: "place"; place: RequestPlace } | { kind: "manual"; manual: ManualPlace };
  clock?: ClockId;
  repeatedTime?: RepeatedTime | null;
}

export interface ChartRequestBody {
  date: string;
  time: string;
  place?: RequestPlace;
  manual?: ManualPlace;
  clock?: ClockId;
  repeatedTime?: RepeatedTime;
}

export function buildChartRequest(input: ChartRequestInput): ChartRequestBody {
  const body: ChartRequestBody = { date: input.date, time: input.time };
  if (input.where.kind === "place") {
    const p = input.where.place;
    body.place = {
      geonameId: p.geonameId,
      lat: p.lat,
      lng: p.lng,
      timeZone: p.timeZone,
      countryCode: p.countryCode,
      admin1Code: p.admin1Code,
      admin2Code: p.admin2Code,
    };
    if (input.clock) body.clock = input.clock;
  } else {
    const m = input.where.manual;
    body.manual = { lat: m.lat, lng: m.lng, utcOffsetSeconds: m.utcOffsetSeconds };
  }
  if (input.repeatedTime) body.repeatedTime = input.repeatedTime;
  return body;
}
