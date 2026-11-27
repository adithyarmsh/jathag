// "Which clock?" inside Advanced settings (step 0.4.6, D-134 item 5): which options, which default,
// what is sent. Same rule as the server (clock-rule.ts imports packages/api/src/clock.ts unchanged).
import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { chosenClockNote, clockChoiceView, clockToSend, durationText, effectiveClock } from "./clock-choice";
import { earlyClockNote } from "./clock-note";
import type { ClockPlace } from "./clock-rule";

// Real GeoNames ids and admin codes (as in clock-note.test.ts).
const NEW_DELHI: ClockPlace = { geonameId: 1261481, countryCode: "IN", admin1Code: "07", admin2Code: "094", lng: 77.20897 };
const MUMBAI: ClockPlace = { geonameId: 1275339, countryCode: "IN", admin1Code: "16", admin2Code: "", lng: 72.88261 };
const KOLKATA: ClockPlace = { geonameId: 1275004, countryCode: "IN", admin1Code: "28", admin2Code: "342", lng: 88.36304 };
const NEW_YORK: ClockPlace = { geonameId: 5128581, countryCode: "US", admin1Code: "NY", admin2Code: "", lng: -74.00597 };
const LONDON: ClockPlace = { geonameId: 2643743, countryCode: "GB", admin1Code: "ENG", admin2Code: "GLA", lng: -0.12574 };

const c = en.form.advanced.clock;
const view = (p: ClockPlace, date: string) => clockChoiceView(p, date, c, en.clockNote);
const labels = (p: ClockPlace, date: string) => view(p, date)?.options.map((o) => o.label) ?? null;
const selected = (p: ClockPlace, date: string) => effectiveClock(view(p, date), null)?.id ?? null;
/** The "i" shows for a full date with a place chosen. */
const hasI = (p: ClockPlace, date: string) => earlyClockNote(p, date, Number(date.slice(0, 4)), en.clockNote) !== null;

describe('the six handoff cases: "i" + clock section, default selected', () => {
  it.each([
    ["Delhi 1890", NEW_DELHI, "1890-04-02", ["IST (or not sure)", "The town's own local time"], "ist"],
    ["Mumbai 1940", MUMBAI, "1940-06-01", ["IST (or not sure)", "Bombay local time"], "ist"],
    ["Kolkata 1930", KOLKATA, "1930-03-10", ["IST (or not sure)", "Calcutta local time"], "ist"],
    ["Delhi 1942-01-15", NEW_DELHI, "1942-01-15", ["IST (or not sure)", "War Time"], "ist"],
    ["Delhi 1943", NEW_DELHI, "1943-07-15", ["War Time (or not sure)", "IST"], "war"],
    ["Mumbai 1943 (three options)", MUMBAI, "1943-03-01", ["War Time (or not sure)", "IST", "Bombay local time"], "war"],
  ] as const)("%s", (_name, place, date, expected, def) => {
    expect(hasI(place, date)).toBe(true);
    expect(labels(place, date)).toEqual(expected);
    expect(selected(place, date)).toBe(def);
    // Keeping the default sends nothing.
    expect(clockToSend(view(place, date), null)).toBeUndefined();
    expect(clockToSend(view(place, date), def)).toBeUndefined();
  });

  it.each([
    ["Delhi 1950", NEW_DELHI, "1950-01-26"],
    ["Mumbai 1956", MUMBAI, "1956-01-01"],
    ["New York 1890", NEW_YORK, "1890-04-02"],
    ["London 1943", LONDON, "1943-07-15"],
  ] as const)("%s: no \"i\" and no clock section", (_name, place, date) => {
    expect(hasI(place, date)).toBe(false);
    expect(view(place, date)).toBeNull();
  });

  it("no section without a place or a full date", () => {
    expect(clockChoiceView(null, "1940-06-01", c, en.clockNote)).toBeNull();
    expect(clockChoiceView(MUMBAI, null, c, en.clockNote)).toBeNull();
  });
});

describe("offsets and differences shown on the radio cards", () => {
  it("Mumbai 1940", () => {
    expect(view(MUMBAI, "1940-06-01")!.options.map((o) => o.detail)).toEqual(["UTC+5:30", "UTC+4:51 · 39 minutes behind IST"]);
  });
  it("Kolkata 1930 and Delhi 1943", () => {
    expect(view(KOLKATA, "1930-03-10")!.options[1]!.detail).toBe("UTC+5:53:20 · 23 minutes 20 seconds ahead of IST");
    expect(view(NEW_DELHI, "1943-07-15")!.options[0]!.detail).toBe("UTC+6:30 · 1 hour ahead of IST");
  });
  it("Delhi 1890: the town's own time, rounded to the minute like the \"i\" note", () => {
    // New Delhi 77.20897° E → 77.20897 × 240 s = 5:08:50 → 21 minutes behind IST.
    expect(view(NEW_DELHI, "1890-04-02")!.options[1]!.detail).toBe("UTC+5:08:50 · about 21 minutes behind IST");
    expect(view(NEW_DELHI, "1890-04-02")!.sentence).toBe(
      "Before 1906, many towns kept their own local time, here about 21 minutes behind IST. If you're not sure, keep IST.",
    );
  });
  it("one short sentence per situation", () => {
    expect(view(MUMBAI, "1940-06-01")!.sentence).toBe(
      "In Mumbai until the 1950s, many families used Bombay time, 39 minutes behind IST. If you're not sure, keep IST.",
    );
    expect(view(MUMBAI, "1943-03-01")!.key).toBe("mumbaiWarTime");
    expect(view(NEW_DELHI, "1943-07-15")!.sentence).toContain("keep War Time");
  });
  it("durations", () => {
    expect(durationText(3600, c)).toBe("1 hour");
    expect(durationText(-2340, c)).toBe("39 minutes");
    expect(durationText(1400, c)).toBe("23 minutes 20 seconds");
    expect(durationText(61, c)).toBe("1 minute 1 second");
  });
});

describe("the chosen clock: what is sent and what the \"i\" says", () => {
  it("a non-default pick is sent; one that is not offered is not", () => {
    const v = view(MUMBAI, "1940-06-01");
    expect(clockToSend(v, "bombay")).toBe("bombay");
    expect(clockToSend(v, "war")).toBeUndefined(); // not offered in 1940
    expect(clockToSend(null, "bombay")).toBeUndefined();
    expect(clockToSend(view(MUMBAI, "1943-03-01"), "ist")).toBe("ist");
  });
  it("the note says which clock is used once it was changed", () => {
    const v = view(MUMBAI, "1940-06-01");
    expect(chosenClockNote(v, null, en.clockNote, c.labels)).toBeNull();
    expect(chosenClockNote(v, "ist", en.clockNote, c.labels)).toBeNull();
    expect(chosenClockNote(v, "bombay", en.clockNote, c.labels)).toBe(
      "You've chosen Bombay local time (UTC+4:51) in Advanced settings, so your chart will use that clock.",
    );
  });
  it("the effective clock follows the pick, else the default", () => {
    const v = view(MUMBAI, "1943-03-01");
    expect(effectiveClock(v, "bombay")!.utcOffsetSeconds).toBe(17_460);
    expect(effectiveClock(v, null)!.utcOffsetSeconds).toBe(23_400);
    expect(effectiveClock(v, "lmt")!.id).toBe("war"); // not offered → default
  });
});
