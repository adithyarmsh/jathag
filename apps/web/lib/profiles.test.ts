// Saved profiles (step 0.4.7, D-136): the stored format, saving without duplicates, edit mode, delete,
// order, safe reading, the round trip back into the form (byte-identical request bodies), the link
// between pages (only the id), the card lines and the phone menu's count. All birth details here are
// made up (R01 is a synthetic reference birth).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { calculateChartResponse, parseChartRequest, searchPlaces } from "@jathag/api";
import { PlaceIndex } from "@jathag/places";
import en from "../messages/en.json";
import { tableRows } from "./chart-format";
import { clockChoiceView } from "./clock-choice";
import { birthFromForm, EMPTY_FORM, formDate, formFromBirth, requestFromForm, type FormValues } from "./form-values";
import { profileFromUrl, profileHref } from "./profile-link";
import {
  byLastUsed,
  deleteProfile,
  parseProfiles,
  PROFILES_KEY,
  readProfiles,
  sameBirth,
  saveCalculated,
  serializeProfiles,
  touchProfile,
  writeProfiles,
  type BirthInputs,
  type Profile,
} from "./profiles";
import { focusAfterDelete, profileCardView, profilesMenuSub } from "./profiles-view";

const CHENNAI = {
  label: "Chennai, Tamil Nadu, India", geonameId: 1264527, lat: 13.08784, lng: 80.27847, timeZone: "Asia/Kolkata",
  countryCode: "IN", admin1Code: "25", admin2Code: "603", featureCode: "PPLA",
};
const MAIN_R01 =
  '{"date":"1992-08-14","time":"06:45","place":{"geonameId":1264527,"lat":13.08784,"lng":80.27847,"timeZone":"Asia/Kolkata","countryCode":"IN","admin1Code":"25","admin2Code":"603"}}';

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

const R01_PLACE = { label: CHENNAI.label, geonameId: 1264527, lat: 13.08784, lng: 80.27847, timeZone: "Asia/Kolkata", countryCode: "IN", admin1Code: "25", admin2Code: "603" };
const R01: BirthInputs = { date: "1992-08-14", time: { hour: "6", minute: "45", period: "am", second: null }, where: { kind: "place", place: R01_PLACE } };

let n = 0;
const save = (list: Profile[], birth: BirthInputs, name: string, now: string, editingId: string | null = null) =>
  saveCalculated(list, { birth, name, editingId, now, newId: () => `id-${++n}`, defaultName: en.profiles.defaultName });

describe("saving (D-136 item 1)", () => {
  it("a new chart becomes a profile; an empty name is \"My chart\"", () => {
    const { profiles, id } = save([], R01, "  ", "2026-11-27T10:00:00.000Z");
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toEqual({ id, name: "My chart", createdAt: "2026-11-27T10:00:00.000Z", lastUsedAt: "2026-11-27T10:00:00.000Z", birth: R01 });
  });

  it("the same details twice = one profile: lastUsedAt and a new name updated, an empty name keeps the old one", () => {
    let list = save([], R01, "Meera", "2026-11-27T10:00:00.000Z").profiles;
    list = save(list, R01, "", "2026-11-27T11:00:00.000Z").profiles;
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("Meera");
    expect(list[0]!.lastUsedAt).toBe("2026-11-27T11:00:00.000Z");
    expect(list[0]!.createdAt).toBe("2026-11-27T10:00:00.000Z");
    list = save(list, R01, "Meera K", "2026-11-27T12:00:00.000Z").profiles;
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("Meera K");
    // the place's label does not count (only the GeoNames id)
    const relabelled: BirthInputs = { ...R01, where: { kind: "place", place: { ...R01_PLACE, label: "Madras" } } };
    expect(save(list, relabelled, "", "2026-11-27T13:00:00.000Z").profiles).toHaveLength(1);
  });

  it("a different time, seconds, clock, repeated-time answer or place = two profiles", () => {
    const base = save([], R01, "", "2026-11-27T10:00:00.000Z").profiles;
    const variants: BirthInputs[] = [
      { ...R01, time: { ...R01.time, minute: "46" } },
      { ...R01, time: { ...R01.time, period: "pm" } },
      { ...R01, time: { ...R01.time, second: "30" } },
      { ...R01, time: { ...R01.time, second: "0" } }, // "06:45:00" is sent differently from "06:45"
      { ...R01, clock: "lmt" },
      { ...R01, repeatedTime: "later" },
      { ...R01, date: "1992-08-15" },
      { ...R01, where: { kind: "place", place: { ...R01_PLACE, geonameId: 1 } } },
      { ...R01, where: { kind: "manual", manual: { lat: "13.08784", lng: "80.27847", utcOffsetSeconds: 19800 } } },
    ];
    for (const v of variants) {
      expect(sameBirth(R01, v)).toBe(false);
      expect(save(base, v, "", "2026-11-27T11:00:00.000Z").profiles).toHaveLength(2);
    }
  });

  it("typed coordinates: the same numbers and offset are the same birth, however they were typed", () => {
    const a: BirthInputs = { ...R01, where: { kind: "manual", manual: { lat: "13.0827", lng: "80.2707", utcOffsetSeconds: 19800 } } };
    const b: BirthInputs = { ...R01, where: { kind: "manual", manual: { lat: "13,0827", lng: "80.27070", utcOffsetSeconds: 19800 } } };
    const c: BirthInputs = { ...R01, where: { kind: "manual", manual: { lat: "13.0827", lng: "80.2707", utcOffsetSeconds: 18000 } } };
    expect(sameBirth(a, b)).toBe(true);
    expect(sameBirth(a, c)).toBe(false);
  });
});

describe("edit mode (D-136 item 3)", () => {
  it("updates the edited profile even when the details changed; no new profile", () => {
    let list = save([], R01, "Meera", "2026-11-27T10:00:00.000Z").profiles;
    const other: BirthInputs = { ...R01, date: "1988-03-03" };
    list = save(list, other, "Arjun", "2026-11-27T10:30:00.000Z").profiles;
    const meera = list.find((p) => p.name === "Meera")!;
    const changed: BirthInputs = { ...R01, time: { ...R01.time, minute: "50" } };
    const { profiles, id } = save(list, changed, "", "2026-11-27T11:00:00.000Z", meera.id);
    expect(id).toBe(meera.id);
    expect(profiles).toHaveLength(2);
    const edited = profiles.find((p) => p.id === meera.id)!;
    expect(edited.birth).toEqual(changed);
    expect(edited.name).toBe("Meera"); // emptied name field keeps the name
    expect(edited.lastUsedAt).toBe("2026-11-27T11:00:00.000Z");
  });

  it("an edited profile that is gone (deleted in another tab) is saved like a new chart", () => {
    const list = save([], R01, "Meera", "2026-11-27T10:00:00.000Z").profiles;
    const { profiles } = save(list, { ...R01, date: "2000-01-01" }, "", "2026-11-27T11:00:00.000Z", "missing-id");
    expect(profiles).toHaveLength(2);
  });
});

describe("delete, open and order", () => {
  const a = save([], R01, "A", "2026-11-27T10:00:00.000Z").profiles;
  const b = save(a, { ...R01, date: "1990-01-01" }, "B", "2026-11-27T11:00:00.000Z").profiles;
  const c = save(b, { ...R01, date: "1991-01-01" }, "C", "2026-11-27T12:00:00.000Z").profiles;

  it("most recently used first", () => {
    expect(byLastUsed(c).map((p) => p.name)).toEqual(["C", "B", "A"]);
  });

  it("opening a profile moves it to the top", () => {
    const opened = touchProfile(c, c.find((p) => p.name === "A")!.id, "2026-11-27T13:00:00.000Z");
    expect(byLastUsed(opened).map((p) => p.name)).toEqual(["A", "C", "B"]);
  });

  it("delete removes only that one", () => {
    expect(deleteProfile(c, c.find((p) => p.name === "B")!.id).map((p) => p.name)).toEqual(["A", "C"]);
  });

  it("focus after deleting: the next card, else the one before, else the New chart button", () => {
    expect(focusAfterDelete(["x", "y", "z"], "x")).toBe("y");
    expect(focusAfterDelete(["x", "y", "z"], "y")).toBe("z");
    expect(focusAfterDelete(["x", "y", "z"], "z")).toBe("y");
    expect(focusAfterDelete(["x"], "x")).toBeNull();
  });
});

describe("reading and writing storage", () => {
  it("round trip through localStorage \"profiles\" with a version", () => {
    const s = memory();
    const list = save([], R01, "Meera", "2026-11-27T10:00:00.000Z").profiles;
    expect(writeProfiles(s, list)).toBe(true);
    expect(JSON.parse(s.getItem(PROFILES_KEY)!).version).toBe(1);
    expect(readProfiles(s)).toEqual(list);
  });

  it("a missing key, broken JSON, an unknown version or a throwing storage all read as no profiles", () => {
    const s = memory();
    expect(readProfiles(s)).toEqual([]);
    for (const raw of ["{", "null", "[]", '"x"', '{"version":2,"profiles":[]}', '{"version":1}', '{"version":1,"profiles":{}}']) {
      s.setItem(PROFILES_KEY, raw);
      expect(readProfiles(s), raw).toEqual([]);
    }
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readProfiles(blocked)).toEqual([]);
    expect(readProfiles(null)).toEqual([]);
    expect(() => writeProfiles(blocked, [])).not.toThrow();
    expect(writeProfiles(blocked, [])).toBe(false);
  });

  it("a broken entry is skipped, the others are kept; unknown fields are dropped", () => {
    const good = save([], R01, "Meera", "2026-11-27T10:00:00.000Z").profiles[0]!;
    const raw = JSON.stringify({ version: 1, profiles: [{ id: "bad" }, { ...good, chart: { lagna: 1 } }, good] });
    const read = parseProfiles(raw);
    expect(read).toEqual([good]); // the duplicate id is read once
    expect(read[0]).not.toHaveProperty("chart");
  });

  it("the stored object holds only the inputs, never calculated results", () => {
    const list = save([], R01, "Meera", "2026-11-27T10:00:00.000Z").profiles;
    const stored = serializeProfiles(list);
    for (const word of ["chart", "dashas", "transits", "lifeAreas", "panchanga", "planets", "lagna", "clock\":{"]) expect(stored).not.toContain(word);
    expect(Object.keys(JSON.parse(stored).profiles[0]).sort()).toEqual(["birth", "createdAt", "id", "lastUsedAt", "name"]);
  });
});

describe("round trip into the form: byte-identical request bodies", () => {
  /** Calculate with `v`, keep it as a profile, store it, read it back, fill the form, build the request again. */
  function roundTrip(v: FormValues, repeated: ReturnType<typeof formFromBirth>["repeatedTime"] = null) {
    const view = (x: FormValues) => (x.manualOn ? null : clockChoiceView(x.place, formDate(x), en.form.advanced.clock, en.clockNote));
    const first = JSON.stringify(requestFromForm(v, view(v), repeated));
    const birth = birthFromForm(v, view(v), repeated)!;
    const s = memory();
    writeProfiles(s, save([], birth, v.name, "2026-11-27T10:00:00.000Z").profiles);
    const back = readProfiles(s)[0]!;
    const { values, repeatedTime } = formFromBirth(back.birth, back.name);
    const again = JSON.stringify(requestFromForm(values, view(values), repeatedTime));
    return { first, again, values, back };
  }

  it("R01 with a searched place (named Meera): exactly main's body, and the same again; Lagna Leo 8°31′13″ Magha 3", () => {
    const v: FormValues = { ...EMPTY_FORM, name: "Meera", day: "14", month: "8", year: "1992", hour: "6", minute: "45", period: "am", place: CHENNAI };
    const { first, again, values, back } = roundTrip(v);
    expect(first).toBe(MAIN_R01);
    expect(again).toBe(MAIN_R01);
    expect(again).not.toContain("Meera");
    expect(back.name).toBe("Meera");
    expect(values.place!.label).toBe(CHENNAI.label);
    const res = calculateChartResponse(parseChartRequest(JSON.parse(again)), { asOf: "2026-11-27T12:00:00Z" });
    const lagna = tableRows(res.chart, en.chart)[0]!;
    expect([lagna.sign, lagna.degree, lagna.nakshatra, lagna.pada]).toEqual(["Leo", "8° 31′ 13″", "Magha", "3"]);
  });

  it("typed coordinates with seconds", () => {
    const v: FormValues = {
      ...EMPTY_FORM, day: "14", month: "8", year: "1992", hour: "6", minute: "45", period: "am", secondsOn: true, second: "30",
      manualOn: true, lat: "13.0827", lng: "80.2707", utcOffset: 19800,
    };
    const { first, again, values } = roundTrip(v);
    expect(first).toBe('{"date":"1992-08-14","time":"06:45:30","manual":{"lat":13.0827,"lng":80.2707,"utcOffsetSeconds":19800}}');
    expect(again).toBe(first);
    expect([values.lat, values.lng, values.secondsOn, values.second]).toEqual(["13.0827", "80.2707", true, "30"]);
  });

  it("Mumbai 1940 with Bombay time chosen (found as \"Bombay\")", () => {
    const index = new PlaceIndex(gunzipSync(readFileSync(join(import.meta.dirname, "../../../data/places/index/places.tsv.gz"))).toString("utf8"));
    const mumbai = searchPlaces(index, "bombay").results[0]!;
    expect(mumbai.label).toMatch(/^Mumbai/);
    expect(mumbai.matchedName).toBe("Bombay");
    const v: FormValues = { ...EMPTY_FORM, day: "1", month: "3", year: "1940", hour: "10", minute: "15", period: "pm", place: mumbai, clockChoice: "bombay" };
    const { first, again, values, back } = roundTrip(v);
    expect(JSON.parse(first).clock).toBe("bombay");
    expect(again).toBe(first);
    expect(values.clockChoice).toBe("bombay");
    expect(back.birth.where.kind === "place" && back.birth.where.place.matchedName).toBe("Bombay");
    const res = calculateChartResponse(parseChartRequest(JSON.parse(again)), { asOf: "2026-11-27T12:00:00Z" });
    expect(res.clock.id).toBe("bombay");
  });

  it("the repeated-time answer comes back too", () => {
    const v: FormValues = { ...EMPTY_FORM, day: "3", month: "11", year: "2024", hour: "1", minute: "30", period: "am", place: CHENNAI };
    const { first, again } = roundTrip(v, "later");
    expect(JSON.parse(first).repeatedTime).toBe("later");
    expect(again).toBe(first);
  });
});

describe("between pages: only the id travels, never a birth detail", () => {
  it("Open and Edit links (both to the chart page since 0.5.1; the old home links are still read)", () => {
    expect(profileHref("open", "3f2b8c1e-0000-4000-8000-000000000001")).toBe("/chart?profile=3f2b8c1e-0000-4000-8000-000000000001");
    expect(profileHref("edit", "abc")).toBe("/chart?profile=abc&edit");
    expect(profileFromUrl("?profile=abc")).toEqual({ mode: "open", id: "abc" });
    expect(profileFromUrl("?edit=abc")).toEqual({ mode: "edit", id: "abc" });
    expect(profileFromUrl("")).toBeNull();
    expect(profileFromUrl("?profile=<script>")).toBeNull();
  });

  it("no birth detail or name in any link the page code builds", () => {
    const WEB = join(import.meta.dirname, "..");
    for (const f of ["app/profiles/profile-list.tsx", "app/birth-form.tsx", "app/chart-page.tsx", "lib/profile-link.ts", "lib/chart-page.ts"]) {
      const text = readFileSync(join(WEB, f), "utf8");
      // every href / URL built in these files goes through profileHref / chartHref (id only) or is a fixed path
      for (const m of text.matchAll(/href=\{([^}]*)\}/g)) expect(m[1], f).toMatch(/^(profileHref\("(open|edit)", c\.id\)|SAMPLE_HREF)$/);
      expect(text, f).not.toMatch(/[?&](date|time|name|lat|lng|place)=/);
    }
  });
});

describe("what the card and the phone menu show", () => {
  const p = (birth: BirthInputs, name = "Meera"): Profile => ({ id: "x", name, createdAt: "", lastUsedAt: "", birth });

  it("\"14 Aug 1992 · 6:45 AM\", the place's label", () => {
    expect(profileCardView(p(R01), en)).toEqual({ id: "x", name: "Meera", when: "14 Aug 1992 · 6:45 AM", place: "Chennai, Tamil Nadu, India" });
  });

  it("with seconds, PM, and typed coordinates", () => {
    const b: BirthInputs = { ...R01, time: { hour: "12", minute: "5", period: "pm", second: "7" }, where: { kind: "manual", manual: { lat: "-33.8688", lng: "151.2093", utcOffsetSeconds: 36000 } } };
    expect(profileCardView(p(b), en)).toMatchObject({ when: "14 Aug 1992 · 12:05:07 PM", place: "33° 52′ S · 151° 13′ E" });
  });

  it("menu sub-line: none or not read = \"Kept in this browser\", 1, 3", () => {
    expect(profilesMenuSub(0, en.menu)).toBe("Kept in this browser");
    expect(profilesMenuSub(null, en.menu)).toBe("Kept in this browser");
    expect(profilesMenuSub(1, en.menu)).toBe("1 in this browser");
    expect(profilesMenuSub(3, en.menu)).toBe("3 in this browser");
  });
});
