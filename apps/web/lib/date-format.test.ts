import { describe, expect, it } from "vitest";
import { birthClockFormatter, dateOnBirthClock, formatCalendarDate } from "./date-format";
import en from "../messages/en.json";

const months = en.lists.monthsShort;
const fmt = (utc: string, off: number) => birthClockFormatter(off, months)(utc);
const H = 3600;

describe("dates on the clock at birth", () => {
  it("formats as day, three-letter month, year", () => {
    expect(formatCalendarDate({ year: 2031, month: 8, day: 14 }, months)).toBe("14 Aug 2031");
    expect(formatCalendarDate({ year: 1800, month: 1, day: 1 }, months)).toBe("1 Jan 1800");
    expect(months).toHaveLength(12);
  });

  it("+5:30 (IST): midnight on the birth clock is the new day", () => {
    expect(fmt("2031-08-13T18:30:00Z", 5.5 * H)).toBe("14 Aug 2031");
    expect(fmt("2031-08-13T18:29:59Z", 5.5 * H)).toBe("13 Aug 2031");
  });

  it("+6:30 (War Time) is used for every date, also decades later (D-098)", () => {
    expect(fmt("1943-07-14T17:30:00Z", 6.5 * H)).toBe("15 Jul 1943");
    expect(fmt("2010-03-01T17:29:59Z", 6.5 * H)).toBe("1 Mar 2010");
    expect(fmt("2010-03-01T17:30:00Z", 6.5 * H)).toBe("2 Mar 2010");
  });

  it("a negative offset (US summer time −4:00) moves late-UTC dates back a day", () => {
    expect(fmt("2001-07-04T03:59:59Z", -4 * H)).toBe("3 Jul 2001");
    expect(fmt("2001-07-04T04:00:00Z", -4 * H)).toBe("4 Jul 2001");
    // The same summer offset for a winter date decades later
    expect(fmt("2040-01-01T02:00:00Z", -4 * H)).toBe("31 Dec 2039");
  });

  it("offsets with seconds (+5:08:52, +5:53:20, +5:21:10)", () => {
    const delhi1895 = 5 * H + 8 * 60 + 52;
    expect(fmt("1895-02-19T18:51:08Z", delhi1895)).toBe("20 Feb 1895");
    expect(fmt("1895-02-19T18:51:07Z", delhi1895)).toBe("19 Feb 1895");
    const calcutta = 5 * H + 53 * 60 + 20;
    expect(fmt("1925-11-02T18:06:40Z", calcutta)).toBe("3 Nov 1925");
    expect(fmt("1925-11-02T18:06:39Z", calcutta)).toBe("2 Nov 1925");
    const madras = 5 * H + 21 * 60 + 10;
    expect(dateOnBirthClock("1901-04-11T18:38:50Z", madras)).toEqual({ year: 1901, month: 4, day: 12 });
  });

  it("years before 1900, a leap day and milliseconds in the input", () => {
    expect(fmt("1853-06-28T12:25:00Z", -5 * H)).toBe("28 Jun 1853");
    expect(fmt("1800-01-01T01:08:07Z", 0)).toBe("1 Jan 1800");
    expect(fmt("1799-12-31T23:00:00Z", 5.5 * H)).toBe("1 Jan 1800");
    expect(fmt("2008-02-28T18:30:00Z", 5.5 * H)).toBe("29 Feb 2008");
    expect(fmt("1900-02-28T18:30:00Z", 5.5 * H)).toBe("1 Mar 1900"); // 1900 was not a leap year
    expect(fmt("2026-11-22T06:00:00.000Z", 5.5 * H)).toBe("22 Nov 2026");
  });

  it("refuses input that is not a time", () => {
    expect(() => dateOnBirthClock("null", 0)).toThrow();
    expect(() => dateOnBirthClock("2020-01-01T00:00:00Z", Number.NaN)).toThrow();
  });
});
