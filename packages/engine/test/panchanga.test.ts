// Panchanga (step 0.9.1, FR-CALC-11, D-123). The JHora answer key for the 29 reference births is in
// tests/reference/engine.test.ts; these are the hand-made checks: the 60 half-tithi → karana values,
// boundaries (start inclusive, end exclusive), the sunrise rule, the hora count and the polar fallback.
import { describe, expect, it } from 'vitest';
import {
  calculateChart,
  createSwephAdapter,
  horaLordAt,
  HORA_ORDER,
  karanaForHalfTithi,
  lunarParts,
  panchangaForChart,
  PanchangaInputError,
  vedicDay,
  WEEKDAY_LORD,
} from '../src/index.ts';

const eph = createSwephAdapter();
const JD_UNIX_EPOCH = 2_440_587.5;
const msToJd = (ms: number) => ms / 86_400_000 + JD_UNIX_EPOCH;
const jdToMs = (jd: number) => (jd - JD_UNIX_EPOCH) * 86_400_000;
const IST = 19_800; // +5:30 in seconds

/** Local clock time on a fixed offset → ms since 1970 UTC. */
const local = (iso: string, offsetSeconds: number) => Date.parse(`${iso}Z`) - offsetSeconds * 1000;

const CHENNAI = { lat: 13.083333, lng: 80.283333 }; // R01's place
const PUNE = { lat: 18.516667, lng: 73.85 }; // R24's place
const OSLO = { lat: 59.916667, lng: 10.75 }; // R19's place
const TROMSO = { lat: 69.65, lng: 18.96 };

/** The first sunrise after local midnight of `date` (ms), straight from the adapter. */
function sunriseMs(date: string, offsetSeconds: number, place: { lat: number; lng: number }): number {
  const jd = eph.nextSunEvent(msToJd(local(`${date}T00:00:00`, offsetSeconds)), place.lat, place.lng, 'rise');
  if (jd === null) throw new Error('no sunrise');
  return jdToMs(jd);
}

describe('karana: all 60 half-tithis (written out by hand from the rule)', () => {
  // h = 1 Kimstughna (11); h = 2…57 Bava … Vishti (1–7) eight times; h = 58 Shakuni (8), 59 Chatushpada (9), 60 Naga (10).
  const EXPECTED = [
    11,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    1, 2, 3, 4, 5, 6, 7,
    8, 9, 10,
  ];

  it('the hand-written list has 60 values', () => {
    expect(EXPECTED).toHaveLength(60);
  });

  it('karanaForHalfTithi(1…60) gives exactly that list', () => {
    expect(Array.from({ length: 60 }, (_, i) => karanaForHalfTithi(i + 1))).toEqual(EXPECTED);
  });

  it('lunarParts gives the same karana from the Moon − Sun angle, in the middle of every half-tithi', () => {
    for (let h = 1; h <= 60; h++) {
      expect(lunarParts(100, 100 + (h - 1) * 6 + 3).karana, `h = ${h}`).toBe(EXPECTED[h - 1]);
    }
  });

  it('R01 check from the handoff: tithi 16 with 44.04 % left is its second half, h = 32, Kaulava (3)', () => {
    expect(karanaForHalfTithi(32)).toBe(3);
  });

  it('refuses a half-tithi outside 1–60', () => {
    for (const h of [0, 61, 1.5, Number.NaN]) expect(() => karanaForHalfTithi(h)).toThrow(PanchangaInputError);
  });
});

describe('tithi, yoga, karana, nakshatra: a value exactly on a boundary belongs to the NEW one', () => {
  it('Moon on the Sun: tithi 1 (Shukla), 100 % left, Kimstughna; just before: tithi 30, Naga', () => {
    const at = lunarParts(20, 20);
    expect([at.tithi, at.paksha, at.tithiLeftPercent, at.karana]).toEqual([1, 1, 100, 11]);
    const before = lunarParts(20, 19.9999);
    expect([before.tithi, before.paksha, before.karana]).toEqual([30, 2, 10]);
    expect(before.tithiLeftPercent).toBeGreaterThan(0);
    expect(before.tithiLeftPercent).toBeLessThan(0.01);
  });

  it('Moon − Sun = 12° exactly: tithi 2 and karana Balava (h = 3); 11.9999°: tithi 1 and Bava (h = 2)', () => {
    expect([lunarParts(0, 12).tithi, lunarParts(0, 12).karana]).toEqual([2, 2]);
    expect([lunarParts(0, 11.9999).tithi, lunarParts(0, 11.9999).karana]).toEqual([1, 1]);
  });

  it('Moon − Sun = 6° exactly: karana Bava (h = 2), still tithi 1, 50 % left', () => {
    const p = lunarParts(0, 6);
    expect([p.tithi, p.karana, p.tithiLeftPercent]).toEqual([1, 1, 50]);
    expect(lunarParts(0, 5.9999).karana).toBe(11);
  });

  it('Moon − Sun = 180° exactly: tithi 16, Krishna (2); 179.9999°: tithi 15 (Purnima), Shukla (1)', () => {
    expect([lunarParts(0, 180).tithi, lunarParts(0, 180).paksha]).toEqual([16, 2]);
    expect([lunarParts(0, 179.9999).tithi, lunarParts(0, 179.9999).paksha]).toEqual([15, 1]);
  });

  it('the end of the month: 342° Shakuni (h = 58), 348° Chatushpada, 354° Naga; just before 342°: Vishti (h = 57)', () => {
    expect(lunarParts(0, 342).karana).toBe(8);
    expect(lunarParts(0, 348).karana).toBe(9);
    expect(lunarParts(0, 354).karana).toBe(10);
    expect(lunarParts(0, 341.9999).karana).toBe(7);
  });

  it('Sun + Moon = 40° exactly (3 × 13°20′): yoga 4; 39.9999°: yoga 3', () => {
    expect(lunarParts(20, 20).yoga).toBe(4);
    expect(lunarParts(20, 19.9999).yoga).toBe(3);
  });

  it('Moon at 40° exactly: nakshatra 4 with 100 % left; 39.9999°: nakshatra 3', () => {
    const p = lunarParts(0, 40);
    expect([p.nakshatra, p.nakshatraLeftPercent]).toEqual([4, 100]);
    expect(lunarParts(0, 39.9999).nakshatra).toBe(3);
  });

  it('wraps around 0°: Sun 350°, Moon 10° → Moon − Sun 20° (tithi 2), Sun + Moon 0° (yoga 1)', () => {
    const p = lunarParts(350, 10);
    expect([p.tithi, p.yoga]).toEqual([2, 1]);
  });

  it('% left is a share of the tithi (12°) and nakshatra (13°20′): Moon − Sun 3° → 75 %, Moon 10° → 25 %', () => {
    expect(lunarParts(0, 3).tithiLeftPercent).toBe(75);
    expect(lunarParts(0, 10).nakshatraLeftPercent).toBeCloseTo(25, 12);
  });
});

describe('sunrise and sunset through the adapter (upper limb, refraction, 0 m, 1013.25 hPa, 20 °C)', () => {
  it('Chennai, 14 Aug 1992 (R01): sunrise about 05:56 IST, sunset after it, the next sunrise about a day later', () => {
    const rise = sunriseMs('1992-08-14', IST, CHENNAI);
    expect(new Date(rise + IST * 1000).toISOString().slice(11, 16)).toBe('05:56');
    const set = jdToMs(eph.nextSunEvent(msToJd(rise), CHENNAI.lat, CHENNAI.lng, 'set')!);
    expect(set - rise).toBeGreaterThan(12 * 3600_000);
    expect(set - rise).toBeLessThan(13 * 3600_000);
    // Searching from the sunrise itself can return that same sunrise, so search from one minute later.
    const next = jdToMs(eph.nextSunEvent(msToJd(rise + 60_000), CHENNAI.lat, CHENNAI.lng, 'rise')!);
    expect(Math.abs(next - rise - 86_400_000)).toBeLessThan(5 * 60_000);
  });

  it('Pune, 20 and 21 Jun 2018 (R24): sunrise between 05:58 and 06:00 IST (births.json says ≈05:58:50), so 05:54 on the 21st is before it', () => {
    for (const d of ['2018-06-20', '2018-06-21']) {
      const rise = sunriseMs(d, IST, PUNE);
      expect(rise, d).toBeGreaterThan(local(`${d}T05:58:00`, IST));
      expect(rise, d).toBeLessThan(local(`${d}T06:00:00`, IST));
    }
    expect(local('2018-06-21T05:54:00', IST)).toBeLessThan(sunriseMs('2018-06-21', IST, PUNE));
  });

  it('no sunrise or sunset in Tromsø in late June (midnight sun) or late December (polar night): null, no error', () => {
    for (const d of ['2026-06-25', '2026-12-21']) {
      const jd = msToJd(local(`${d}T00:00:00`, 0));
      expect(eph.nextSunEvent(jd, TROMSO.lat, TROMSO.lng, 'rise'), d).toBeNull();
      expect(eph.nextSunEvent(jd, TROMSO.lat, TROMSO.lng, 'set'), d).toBeNull();
    }
  });
});

describe('vara: the weekday of the last sunrise at or before birth, on the clock offset at birth', () => {
  // 14 Aug 1992 was a Friday (6); 13 Aug a Thursday (5).
  const rise = sunriseMs('1992-08-14', IST, CHENNAI);
  const day = (ms: number) => vedicDay(eph, ms, CHENNAI.lat, CHENNAI.lng, IST);

  it('one second before sunrise: the previous weekday (Thursday), started by the sunrise of the 13th', () => {
    const d = day(rise - 1000);
    expect([d.weekday, d.weekdayFrom]).toEqual([5, 'sunrise']);
    expect(d.sunriseMs).toBe(sunriseMs('1992-08-13', IST, CHENNAI));
  });

  it('exactly at sunrise and one second after: the same calendar day (Friday)', () => {
    for (const ms of [rise, rise + 1000]) {
      const d = day(ms);
      expect([d.weekday, d.weekdayFrom, d.sunriseMs]).toEqual([6, 'sunrise', rise]);
    }
  });

  it('after midnight but before sunrise (02:00 IST): the previous weekday', () => {
    expect(day(local('1992-08-14T02:00:00', IST)).weekday).toBe(5);
  });

  it('late evening (23:59 IST): still the same weekday', () => {
    expect(day(local('1992-08-14T23:59:00', IST)).weekday).toBe(6);
  });

  it('west of Greenwich (New York, UTC−4, 04:00 on Wed 15 Jul 2026, before sunrise): Tuesday (3)', () => {
    const d = vedicDay(eph, local('2026-07-15T04:00:00', -4 * 3600), 40.7128, -74.006, -4 * 3600);
    expect([d.weekday, d.weekdayFrom]).toEqual([3, 'sunrise']);
  });

  it('southern hemisphere (Sydney, UTC+10, 05:00 on Mon 22 Jun 2026, before the winter sunrise): Sunday (1)', () => {
    const d = vedicDay(eph, local('2026-06-22T05:00:00', 10 * 3600), -33.8688, 151.2093, 10 * 3600);
    expect([d.weekday, d.weekdayFrom]).toEqual([1, 'sunrise']);
  });

  it('R24 (Pune, Thu 21 Jun 2018, 05:54 IST) and R19 (Oslo, Fri 10 Dec 1982, 08:30 CET) are before sunrise: Wednesday and Thursday', () => {
    const r24 = panchangaForChart(calculateChart({ utc: '2018-06-21T00:24:00Z', ...PUNE }), { utcOffsetSeconds: IST });
    expect([r24.weekday, r24.weekdayFrom]).toEqual([4, 'sunrise']);
    expect(r24.sunrise!.slice(0, 10)).toBe('2018-06-20');
    const r19 = panchangaForChart(calculateChart({ utc: '1982-12-10T07:30:00Z', ...OSLO }), { utcOffsetSeconds: 3600 });
    expect([r19.weekday, r19.weekdayFrom]).toEqual([5, 'sunrise']);
    expect(r19.sunrise!.slice(0, 10)).toBe('1982-12-09');
  });

  it('a birth just after sunrise keeps the calendar weekday (Pune, Thu 21 Jun 2018, 06:05 IST → Thursday)', () => {
    const p = panchangaForChart(calculateChart({ utc: '2018-06-21T00:35:00Z', ...PUNE }), { utcOffsetSeconds: IST });
    expect([p.weekday, p.weekdayFrom]).toEqual([5, 'sunrise']);
  });
});

describe('polar fallback: where the Sun does not rise that date, the calendar weekday, flagged', () => {
  it('Tromsø, Thu 25 Jun 2026 (midnight sun), 12:00 and 01:00 CEST: Thursday from the calendar day, no sunrise, no hora', () => {
    for (const t of ['12:00:00', '01:00:00']) {
      const chart = calculateChart({ utc: new Date(local(`2026-06-25T${t}`, 7200)).toISOString(), ...TROMSO });
      const p = panchangaForChart(chart, { utcOffsetSeconds: 7200 });
      expect([p.weekday, p.weekdayFrom, p.sunrise, p.horaLord], t).toEqual([5, 'calendarDay', null, null]);
      expect(p.tithi).toBeGreaterThanOrEqual(1); // the lunar parts do not need a sunrise
    }
  });

  it('Tromsø, Mon 21 Dec 2026 (polar night), 12:00 CET: Monday from the calendar day', () => {
    const chart = calculateChart({ utc: new Date(local('2026-12-21T12:00:00', 3600)).toISOString(), ...TROMSO });
    const p = panchangaForChart(chart, { utcOffsetSeconds: 3600 });
    expect([p.weekday, p.weekdayFrom, p.sunrise, p.horaLord]).toEqual([2, 'calendarDay', null, null]);
  });

  it('Tromsø on a normal day (Fri 20 Mar 2026, 12:00 CET) still uses the sunrise', () => {
    const chart = calculateChart({ utc: new Date(local('2026-03-20T12:00:00', 3600)).toISOString(), ...TROMSO });
    const p = panchangaForChart(chart, { utcOffsetSeconds: 3600 });
    expect([p.weekday, p.weekdayFrom]).toEqual([6, 'sunrise']);
    expect(p.horaLord).not.toBeNull();
  });
});

describe('hora: 60-minute horas from sunrise, first one the weekday lord, then the Chaldean order', () => {
  it('the weekday lords are Su Mo Ma Me Ju Ve Sa and the hora order is Su Ve Me Mo Sa Ju Ma', () => {
    expect(WEEKDAY_LORD).toEqual(['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa']);
    expect(HORA_ORDER).toEqual(['Su', 'Ve', 'Me', 'Mo', 'Sa', 'Ju', 'Ma']);
  });

  it('Sunday: hora 1 Su, 2 Ve, 3 Me, … 7 Ma, 8 Su again; hora 25 (if the day is longer than 24 h) is Monday’s lord', () => {
    const H = 3_600_000;
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => horaLordAt(1, i * H))).toEqual(['Su', 'Ve', 'Me', 'Mo', 'Sa', 'Ju', 'Ma', 'Su']);
    expect(horaLordAt(1, 24 * H)).toBe('Mo');
  });

  it('a hora boundary belongs to the NEW hora: Friday at sunrise + 59:59 is Ve, at + 60:00 Me', () => {
    expect(horaLordAt(6, 3_599_999)).toBe('Ve');
    expect(horaLordAt(6, 3_600_000)).toBe('Me');
  });

  it('every weekday starts with its own lord', () => {
    for (let w = 1; w <= 7; w++) expect(horaLordAt(w, 0)).toBe(WEEKDAY_LORD[w - 1]);
  });

  it('refuses a moment before the sunrise or a weekday outside 1–7', () => {
    expect(() => horaLordAt(1, -1)).toThrow(PanchangaInputError);
    expect(() => horaLordAt(0, 0)).toThrow(PanchangaInputError);
  });
});

describe('panchangaForChart', () => {
  const chart = calculateChart({ utc: '1992-08-14T01:15:00Z', ...CHENNAI }); // R01

  it('R01: the six answer-key fields, the paksha, sunrise and where the weekday came from', () => {
    const p = panchangaForChart(chart, { utcOffsetSeconds: IST });
    expect({ tithi: p.tithi, paksha: p.paksha, nakshatra: p.nakshatra, weekday: p.weekday, yoga: p.yoga, karana: p.karana, horaLord: p.horaLord })
      .toEqual({ tithi: 16, paksha: 2, nakshatra: 23, weekday: 6, yoga: 5, karana: 3, horaLord: 'Ve' });
    expect(p.weekdayFrom).toBe('sunrise');
    expect(p.sunrise).toMatch(/^1992-08-14T00:26:\d\dZ$/); // 05:56 IST
  });

  it('the nakshatra is the chart’s own Moon nakshatra', () => {
    expect(panchangaForChart(chart, { utcOffsetSeconds: IST }).nakshatra).toBe(chart.bodies.Mo.nakshatra);
  });

  it('is deterministic: the same chart and offset give the same result', () => {
    expect(panchangaForChart(chart, { utcOffsetSeconds: IST })).toEqual(panchangaForChart(chart, { utcOffsetSeconds: IST }));
  });

  it('refuses an offset that is not whole seconds within ±18 h', () => {
    for (const off of [1.5, 19 * 3600, Number.NaN]) {
      expect(() => panchangaForChart(chart, { utcOffsetSeconds: off })).toThrow(PanchangaInputError);
    }
  });
});
