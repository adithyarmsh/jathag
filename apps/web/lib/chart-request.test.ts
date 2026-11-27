// The body of POST /api/chart (step 0.4.6): byte-for-byte the same as before for an ordinary chart,
// the name never in it, seconds, typed coordinates, and a clock choice end to end.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { calculateChartResponse, parseChartRequest, searchPlaces } from "@jathag/api";
import { PlaceIndex } from "@jathag/places";
import en from "../messages/en.json";
import { birthSummary } from "./birth-summary";
import { buildChartRequest } from "./chart-request";
import { tableRows } from "./chart-format";
import { withSeconds, to24h } from "./time-12h";

// The Chennai suggestion as POST /api/places/search returns it (R01, made-up reference birth).
const CHENNAI = {
  label: "Chennai, Tamil Nadu, India", geonameId: 1264527, lat: 13.08784, lng: 80.27847, timeZone: "Asia/Kolkata",
  countryCode: "IN", admin1Code: "25", admin2Code: "603", featureCode: "PPLA",
};

/** What main (0.4.5) sent for R01: the request body of the old form, as a string. */
const MAIN_R01 =
  '{"date":"1992-08-14","time":"06:45","place":{"geonameId":1264527,"lat":13.08784,"lng":80.27847,"timeZone":"Asia/Kolkata","countryCode":"IN","admin1Code":"25","admin2Code":"603"}}';

describe("request body", () => {
  it("R01 (Chennai, 14 Aug 1992, 6:45 AM, no name): exactly what main sent", () => {
    const time = withSeconds(to24h("6", "45", "am")!, null);
    const body = buildChartRequest({ date: "1992-08-14", time, where: { kind: "place", place: CHENNAI } });
    expect(JSON.stringify(body)).toBe(MAIN_R01);
  });

  it("a typed name changes nothing in the body (it is never sent)", () => {
    const form = { name: "Meera", date: "1992-08-14", time: "06:45" };
    // Even a place object that carries the name (it never should) does not get it into the body.
    const placeWithName = { ...CHENNAI, name: form.name };
    const body = buildChartRequest({ date: form.date, time: form.time, where: { kind: "place", place: placeWithName } });
    expect(JSON.stringify(body)).toBe(MAIN_R01);
    expect(JSON.stringify(body)).not.toContain("Meera");
    // …but it is shown in the details line of the result cards.
    expect(birthSummary({ ...form, place: CHENNAI.label, repeatedTime: null }, en).summary).toBe(
      "Meera · 14 August 1992 · 6:45 AM (06:45) · Chennai, Tamil Nadu, India",
    );
    expect(birthSummary({ ...form, name: "  ", place: CHENNAI.label, repeatedTime: null }, en).summary).toBe(
      "14 August 1992 · 6:45 AM (06:45) · Chennai, Tamil Nadu, India",
    );
  });

  it("with seconds: \"06:45:30\"", () => {
    const body = buildChartRequest({ date: "1992-08-14", time: withSeconds("06:45", "30"), where: { kind: "place", place: CHENNAI } });
    expect(body.time).toBe("06:45:30");
    expect(withSeconds("06:45", "5")).toBe("06:45:05");
  });

  it("with coordinates: manual { lat, lng, utcOffsetSeconds } and no place, no clock", () => {
    const body = buildChartRequest({
      date: "1992-08-14",
      time: "06:45",
      where: { kind: "manual", manual: { lat: 13.0827, lng: 80.2707, utcOffsetSeconds: 19800 } },
      clock: "ist",
    });
    expect(body).toEqual({ date: "1992-08-14", time: "06:45", manual: { lat: 13.0827, lng: 80.2707, utcOffsetSeconds: 19800 } });
    expect(body).not.toHaveProperty("place");
    // The server accepts it and uses the typed offset.
    const res = calculateChartResponse(parseChartRequest(body), { asOf: "2026-11-27T12:00:00Z" });
    expect(res.clock.source).toBe("manual");
    expect(res.clock.utcOffsetSeconds).toBe(19800);
  });

  it("the repeated-time answer comes last, as before", () => {
    const body = buildChartRequest({ date: "2024-11-03", time: "01:30", where: { kind: "place", place: CHENNAI }, repeatedTime: "later" });
    expect(Object.keys(body)).toEqual(["date", "time", "place", "repeatedTime"]);
  });

  it("R01's result through the built body: Lagna Leo 8°31′13″ Magha 3 (site's Chennai coordinates)", () => {
    const res = calculateChartResponse(parseChartRequest(JSON.parse(MAIN_R01)), { asOf: "2026-11-27T12:00:00Z" });
    const lagna = tableRows(res.chart, en.chart)[0]!;
    expect([lagna.sign, lagna.degree, lagna.nakshatra, lagna.pada]).toEqual(["Leo", "8° 31′ 13″", "Magha", "3"]);
  });
});

describe("Kolkata, 3 Nov 1925, 4:40:20 PM on Calcutta local time (end to end)", () => {
  const index = new PlaceIndex(gunzipSync(readFileSync(join(import.meta.dirname, "../../../data/places/index/places.tsv.gz"))).toString("utf8"));
  const kolkata = searchPlaces(index, "kolkata").results[0]!;

  it("sends 16:40:20 and the Calcutta clock id; the server uses UTC+5:53:20", () => {
    expect(kolkata.label).toMatch(/^Kolkata, West Bengal/);
    const body = buildChartRequest({
      date: "1925-11-03",
      time: withSeconds(to24h("4", "40", "pm")!, "20"),
      where: { kind: "place", place: kolkata },
      clock: "calcutta",
    });
    expect(body.time).toBe("16:40:20");
    expect(body.clock).toBe("calcutta");
    const res = calculateChartResponse(parseChartRequest(body), { asOf: "2026-11-27T12:00:00Z" });
    expect(res.clock.source).toBe("clockRule");
    expect(res.clock.id).toBe("calcutta");
    expect(res.clock.utcOffsetSeconds).toBe(21_200); // UTC+5:53:20
  });
});
