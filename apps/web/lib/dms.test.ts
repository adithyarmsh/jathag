// Coordinates in DMS or DD (step 0.5.2, D-142, D-143 items 10–11): conversion both ways, the checks,
// switching formats without losing anything, the same decimal request from either format, and saved
// profiles (version 1 kept: old decimal profiles open in DD with a byte-identical request; DMS ones
// reopen in DMS). Also the "Near" label in profiles (D-144 item 5).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { AdvancedSettings } from "../app/advanced-settings";
import { decimalText, decimalToDms, dmsToDecimal, EMPTY_DMS, switchFormat, type DmsParts } from "./coordinates";
import { birthFromForm, EMPTY_FORM, formFromBirth, requestFromForm, typedCoordinates, type FormValues } from "./form-values";
import { parseProfiles, sameBirth, saveCalculated, serializeProfiles, setNear, type BirthInputs, type Profile } from "./profiles";
import { requestFromBirth, SAMPLE_BIRTH, shownPlace, birthPlaceLabel, detailsLine } from "./chart-page";

const P = (d: string, m: string, s: string, h: DmsParts["h"]): DmsParts => ({ d, m, s, h });
const value = (p: DmsParts, axis: "lat" | "lng") => {
  const r = dmsToDecimal(p, axis);
  if (!("value" in r)) throw new Error(`not valid: ${JSON.stringify(r)}`);
  return r.value;
};

describe("DMS ↔ decimal", () => {
  it("28°37′00″ N, 77°13′00″ E = 28.616667, 77.216667 (the founder's reference, D-142)", () => {
    expect(value(P("28", "37", "00", "N"), "lat")).toBe(28.616667);
    expect(value(P("77", "13", "00", "E"), "lng")).toBe(77.216667);
  });

  it("13°05′16″ N 80°16′42″ E is R01's Chennai within 1″", () => {
    const lat = value(P("13", "05", "16", "N"), "lat");
    const lng = value(P("80", "16", "42", "E"), "lng");
    const chennai = SAMPLE_BIRTH.where.kind === "place" ? SAMPLE_BIRTH.where.place : null;
    expect(Math.abs(lat - chennai!.lat) * 3600).toBeLessThanOrEqual(1);
    expect(Math.abs(lng - chennai!.lng) * 3600).toBeLessThanOrEqual(1);
  });

  it("empty minutes or seconds count as 00", () => {
    expect(value(P("13", "", "", "N"), "lat")).toBe(13);
    expect(value(P("13", "30", "", "N"), "lat")).toBe(13.5);
    expect(value(P("13", "", "36", "N"), "lat")).toBe(13.01);
  });

  it("S and W give negative values", () => {
    expect(value(P("33", "52", "04", "S"), "lat")).toBe(-33.867778);
    expect(value(P("74", "00", "22", "W"), "lng")).toBe(-74.006111);
    expect(value(P("0", "0", "0", "S"), "lat")).toBe(0); // never "-0"
  });

  it("every error case, with the box to fix", () => {
    expect(dmsToDecimal(P("", "05", "16", "N"), "lat")).toEqual({ problem: "degrees", part: "d" });
    expect(dmsToDecimal(P("91", "", "", "N"), "lat")).toEqual({ problem: "degrees", part: "d" });
    expect(dmsToDecimal(P("181", "", "", "E"), "lng")).toEqual({ problem: "degrees", part: "d" });
    expect(value(P("180", "", "", "W"), "lng")).toBe(-180);
    expect(dmsToDecimal(P("13", "60", "", "N"), "lat")).toEqual({ problem: "minutes", part: "m" });
    expect(dmsToDecimal(P("13", "05", "60", "N"), "lat")).toEqual({ problem: "seconds", part: "s" });
    expect(dmsToDecimal(P("90", "01", "", "N"), "lat")).toEqual({ problem: "pole", part: "m" });
    expect(dmsToDecimal(P("90", "", "01", "S"), "lat")).toEqual({ problem: "pole", part: "s" });
    expect(dmsToDecimal(P("180", "00", "30", "E"), "lng")).toEqual({ problem: "pole", part: "s" });
    expect(value(P("90", "00", "00", "N"), "lat")).toBe(90);
    expect(dmsToDecimal(P("1a", "", "", "N"), "lat")).toEqual({ problem: "degrees", part: "d" });
  });

  it("decimal → DMS rounds to the nearest whole second; DD text has up to 6 decimals, trimmed", () => {
    expect(decimalToDms(13.08784, "lat")).toEqual(P("13", "05", "16", "N"));
    expect(decimalToDms(80.27847, "lng")).toEqual(P("80", "16", "42", "E")); // 80.27847 × 3600 = 289002.49″ → 80° 16′ 42″
    expect(decimalToDms(-74.00597, "lng")).toEqual(P("74", "00", "21", "W"));
    expect(decimalToDms(28.616667, "lat")).toEqual(P("28", "37", "00", "N"));
    expect(decimalToDms(12.99999, "lat")).toEqual(P("13", "00", "00", "N")); // carries over
    expect(decimalText(28.6166666666)).toBe("28.616667");
    expect(decimalText(13.5)).toBe("13.5");
    expect(decimalText(80)).toBe("80");
  });
});

describe("switching DMS ↔ DD converts what is typed and never loses anything", () => {
  it("DD → DMS → DD", () => {
    const dms = switchFormat("dms", { dd: { lat: "28.616667", lng: "-77.216667" }, dms: EMPTY_DMS });
    expect(dms.dms).toEqual({ lat: P("28", "37", "00", "N"), lng: P("77", "13", "00", "W") });
    const back = switchFormat("dd", dms);
    expect(back.dd).toEqual({ lat: "28.616667", lng: "-77.216667" });
  });

  it("an invalid coordinate stays as typed in its own format; the other format keeps what it had", () => {
    const start = { dd: { lat: "95", lng: "80.2785" }, dms: EMPTY_DMS };
    const dms = switchFormat("dms", start);
    expect(dms.dd.lat).toBe("95"); // kept
    expect(dms.dms.lat).toEqual(EMPTY_DMS.lat); // nothing converted
    expect(dms.dms.lng.d).toBe("80");
    expect(switchFormat("dd", dms).dd.lat).toBe("95"); // back: shown again exactly
    // The same the other way round: 13° 75′ is kept in the DMS boxes
    const bad = { dd: { lat: "", lng: "" }, dms: { lat: P("13", "75", "", "N"), lng: P("80", "16", "42", "E") } };
    const dd = switchFormat("dd", bad);
    expect(dd.dd).toEqual({ lat: "", lng: "80.278333" });
    expect(switchFormat("dms", dd).dms.lat).toEqual(P("13", "75", "", "N"));
  });

  it("an emptied coordinate empties the other format too (the hemisphere stays)", () => {
    const r = switchFormat("dms", { dd: { lat: "", lng: "" }, dms: { lat: P("13", "5", "", "S"), lng: P("", "", "", "W") } });
    expect(r.dms).toEqual({ lat: P("", "", "", "S"), lng: P("", "", "", "W") });
  });
});

const BASE: FormValues = { ...EMPTY_FORM, day: "14", month: "8", year: "1992", hour: "6", minute: "45", period: "am", manualOn: true, utcOffset: 19800 };

describe("both formats send the same decimal coordinates", () => {
  it("DMS 28°37′00″ N 77°13′00″ E sends exactly what DD 28.616667, 77.216667 sends", () => {
    const viaDms = requestFromForm({ ...BASE, coordFormat: "dms", dms: { lat: P("28", "37", "00", "N"), lng: P("77", "13", "", "E") } }, null, null);
    const viaDd = requestFromForm({ ...BASE, coordFormat: "dd", lat: "28.616667", lng: "77.216667" }, null, null);
    expect(JSON.stringify(viaDms)).toBe(JSON.stringify(viaDd));
    expect(JSON.stringify(viaDms)).toBe('{"date":"1992-08-14","time":"06:45","manual":{"lat":28.616667,"lng":77.216667,"utcOffsetSeconds":19800}}');
  });

  it("DMS is the default for typed coordinates; N and E pre-selected", () => {
    expect(EMPTY_FORM.coordFormat).toBe("dms");
    expect(EMPTY_FORM.dms).toEqual({ lat: P("", "", "", "N"), lng: P("", "", "", "E") });
  });

  it("an invalid DMS box gives no request", () => {
    expect(requestFromForm({ ...BASE, dms: { lat: P("13", "61", "", "N"), lng: P("80", "", "", "E") } }, null, null)).toBeNull();
    expect(typedCoordinates({ ...BASE, dms: { lat: P("", "", "", "N"), lng: P("80", "", "", "E") } })).toEqual({ lat: null, lng: 80 });
  });
});

describe("profiles keep the format (version 1, nothing dropped)", () => {
  // A stored file exactly as 0.4.7 / 0.5.1 wrote it: decimal strings, no format.
  const V1 = JSON.stringify({
    version: 1,
    profiles: [
      {
        id: "a1", name: "Old one", createdAt: "2026-11-27T10:00:00.000Z", lastUsedAt: "2026-11-27T10:00:00.000Z",
        birth: { date: "1992-08-14", time: { hour: "6", minute: "45", period: "am", second: null }, where: { kind: "manual", manual: { lat: "13.0878", lng: "80.2785", utcOffsetSeconds: 19800 } } },
      },
    ],
  });

  it("a version-1 decimal profile opens in DD with its values unchanged and sends a byte-identical request", () => {
    const [p] = parseProfiles(V1);
    expect(p!.birth.where).toEqual({ kind: "manual", manual: { lat: "13.0878", lng: "80.2785", utcOffsetSeconds: 19800 } });
    const { values } = formFromBirth(p!.birth, p!.name);
    expect([values.coordFormat, values.lat, values.lng]).toEqual(["dd", "13.0878", "80.2785"]);
    // Same request as 0.5.1 sent for it
    expect(JSON.stringify(requestFromBirth(p!.birth, en))).toBe('{"date":"1992-08-14","time":"06:45","manual":{"lat":13.0878,"lng":80.2785,"utcOffsetSeconds":19800}}');
    // Saving it again writes the same file (still version 1)
    expect(serializeProfiles(parseProfiles(V1))).toBe(V1);
  });

  it("a DMS-typed profile reopens in DMS with the same boxes, and its request is unchanged", () => {
    const v: FormValues = { ...BASE, coordFormat: "dms", dms: { lat: P("13", "05", "16", "N"), lng: P("80", "16", "42", "E") } };
    const birth = birthFromForm(v, null, null)!;
    expect(birth.where).toEqual({
      kind: "manual",
      manual: { lat: "13.087778", lng: "80.278333", utcOffsetSeconds: 19800, format: "dms", dms: v.dms },
    });
    const stored = serializeProfiles([{ id: "b", name: "x", createdAt: "t", lastUsedAt: "t", birth }]);
    expect(JSON.parse(stored).version).toBe(1);
    const back = parseProfiles(stored)[0]!;
    const { values } = formFromBirth(back.birth, "x");
    expect(values.coordFormat).toBe("dms");
    expect(values.dms).toEqual(v.dms);
    expect(JSON.stringify(requestFromBirth(back.birth, en))).toBe(JSON.stringify(requestFromForm(v, null, null)));
    // An older copy of the code (0.5.1) would read only lat / lng: the same request, in DD.
    const asOld = { ...back.birth, where: { kind: "manual" as const, manual: { lat: "13.087778", lng: "80.278333", utcOffsetSeconds: 19800 } } };
    expect(JSON.stringify(requestFromBirth(asOld, en))).toBe(JSON.stringify(requestFromForm(v, null, null)));
  });

  it("broken DMS boxes in storage → the profile still opens, in DD", () => {
    const raw = JSON.parse(V1);
    raw.profiles[0].birth.where.manual.format = "dms";
    raw.profiles[0].birth.where.manual.dms = { lat: { d: "13", m: "x", s: "", h: "N" } };
    const [p] = parseProfiles(JSON.stringify(raw));
    expect(p!.birth.where.kind === "manual" && p!.birth.where.manual.format).toBeUndefined();
    expect(formFromBirth(p!.birth, "").values.coordFormat).toBe("dd");
  });

  it("dedupe compares the decimal values: DMS and the same DD are one profile", () => {
    const dms = birthFromForm({ ...BASE, coordFormat: "dms", dms: { lat: P("28", "37", "", "N"), lng: P("77", "13", "", "E") } }, null, null)!;
    const dd = birthFromForm({ ...BASE, coordFormat: "dd", lat: "28.616667", lng: "77.216667" }, null, null)!;
    expect(sameBirth(dms, dd)).toBe(true);
  });

  it("R01 by place search: unchanged request", () => {
    expect(JSON.stringify(requestFromBirth(SAMPLE_BIRTH, en))).toBe(
      '{"date":"1992-08-14","time":"06:45","place":{"geonameId":1264527,"lat":13.08784,"lng":80.27847,"timeZone":"Asia/Kolkata","countryCode":"IN","admin1Code":"25","admin2Code":"603"}}',
    );
  });
});

describe("the nearest place in profiles and on the page (D-144)", () => {
  const manual = (near?: string | null): BirthInputs => ({
    date: "1992-08-14",
    time: { hour: "6", minute: "45", period: "am", second: null },
    where: { kind: "manual", manual: { lat: "13.087778", lng: "80.278333", utcOffsetSeconds: 19800, ...(near !== undefined ? { near } : {}) } },
  });
  const prof = (birth: BirthInputs): Profile => ({ id: "p", name: "Meera", createdAt: "t", lastUsedAt: "t", birth });

  it("is saved once with the coordinates, and read back (label or null)", () => {
    const saved = setNear([prof(manual())], "p", { lat: 13.087778, lng: 80.278333 }, "Chennai, Tamil Nadu, India");
    const back = parseProfiles(serializeProfiles(saved))[0]!;
    expect(back.birth.where.kind === "manual" && back.birth.where.manual.near).toBe("Chennai, Tamil Nadu, India");
    const none = parseProfiles(serializeProfiles(setNear([prof(manual())], "p", { lat: 13.087778, lng: 80.278333 }, null)))[0]!;
    expect(none.birth.where.kind === "manual" && none.birth.where.manual.near).toBeNull();
    // Not for other coordinates (the profile changed meanwhile), not for another id
    const list = [prof(manual())];
    expect(setNear(list, "p", { lat: 1, lng: 2 }, "X")).toEqual(list);
    expect(setNear(list, "q", { lat: 13.087778, lng: 80.278333 }, "X")).toEqual(list);
  });

  it("a recalculation with the same coordinates keeps the label (no second lookup)", () => {
    const before = [prof(manual("Chennai, Tamil Nadu, India"))];
    const r = saveCalculated(before, { birth: manual(), name: "", now: "n", newId: () => "x", defaultName: "My chart" });
    expect(r.profiles[0]!.birth.where.kind === "manual" && r.profiles[0]!.birth.where.manual.near).toBe("Chennai, Tamil Nadu, India");
    const moved: BirthInputs = { ...manual(), where: { kind: "manual", manual: { lat: "13.1", lng: "80.278333", utcOffsetSeconds: 19800 } } };
    const r2 = saveCalculated(before, { birth: moved, name: "", editingId: "p", now: "n", newId: () => "x", defaultName: "My chart" });
    expect(r2.profiles[0]!.birth.where.kind === "manual" && r2.profiles[0]!.birth.where.manual.near).toBeUndefined();
  });

  it('"Near <label>" only in the details line and the chart centre; elsewhere the coordinates stay', () => {
    const b = manual("Chennai, Tamil Nadu, India");
    expect(shownPlace(b, en)).toBe("Near Chennai, Tamil Nadu, India");
    expect(detailsLine(b, en)).toBe("14 Aug 1992 · 6:45 AM · Near Chennai, Tamil Nadu, India");
    // The one-liner, the profile cards and the planet table's settings line use the coordinates
    expect(birthPlaceLabel(b, en)).toBe("13° 05′ N · 80° 17′ E");
    // No label (none within 50 km, or not looked up yet): the coordinates, no warning
    expect(shownPlace(manual(null), en)).toBe("13° 05′ N · 80° 17′ E");
    expect(shownPlace(manual(), en)).toBe("13° 05′ N · 80° 17′ E");
    // The label never changes the request
    expect(JSON.stringify(requestFromBirth(b, en))).toBe(JSON.stringify(requestFromBirth(manual(), en)));
  });
});

describe("Advanced settings: the DMS boxes (spec §3.3, §3.4)", () => {
  const IDS = { panel: "adv", manual: "man", lat: "lat", lng: "lng", offset: "off", latError: "late", lngError: "lnge", clockLegend: "clk", clockPrefix: "clk-opt", seconds: "sec" };
  const noop = () => {};
  const render = (over: Partial<Parameters<typeof AdvancedSettings>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(AdvancedSettings, {
        t: en.form.advanced, comingSoon: en.hero.comingSoon, ids: IDS, open: true, manualOn: true, onManual: noop,
        lat: "", lng: "", offset: 19800, onLat: noop, onLng: noop, onOffset: noop, onCoordLeave: noop,
        clock: null, clockChoice: null, onClock: noop, secondsOn: false, onSeconds: noop, ...over,
      }),
    );

  it("DMS by default: a DMS | DD toggle, degrees / minutes / seconds boxes with the number keypad, N and E selected", () => {
    const html = render();
    expect(html).toMatch(/role="radiogroup" aria-label="Coordinate format"/);
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>DMS</);
    for (const id of ["lat-d", "lat-m", "lat-s", "lng-d", "lng-m", "lng-s"]) expect(html).toMatch(new RegExp(`<input id="${id}" inputMode="numeric"`));
    expect(html).toMatch(/<select id="lat-h"[\s\S]*?<option value="N" selected="">N<\/option><option value="S">S<\/option>/);
    expect(html).toMatch(/<select id="lng-h"[\s\S]*?<option value="E" selected="">E<\/option><option value="W">W<\/option>/);
    expect(html).toContain("Latitude, Degrees");
    expect(html).not.toMatch(/optional/i); // empty minutes / seconds are not labelled optional
    expect(html).not.toContain('id="lat" '); // the DD box is not there
    for (const mark of ["°", "′", "″"]) expect(html).toContain(mark);
  });

  it("an error outlines the box to fix and is linked to it", () => {
    const html = render({ dms: { lat: P("13", "75", "", "N"), lng: P("80", "", "", "E") }, latDmsError: { message: en.missing.dmsMinutes, part: "m" } });
    expect(html.match(/<input id="lat-m"[^>]*>/)![0]).toContain('aria-invalid="true"');
    expect(html.match(/<input id="lat-m"[^>]*>/)![0]).toContain('aria-describedby="late"');
    expect(html.match(/<input id="lat-d"[^>]*>/)![0]).not.toContain("aria-invalid");
    expect(html).toContain(`<p id="late" class="field-error mt-1">${en.missing.dmsMinutes}</p>`);
  });

  it("DD shows today's decimal boxes", () => {
    const html = render({ coordFormat: "dd", lat: "13.0827" });
    expect(html).toMatch(/<input id="lat" type="text" inputMode="decimal"/);
    expect(html).toContain(en.form.advanced.manual.hint);
    expect(html).not.toContain('id="lat-d"');
  });
});
