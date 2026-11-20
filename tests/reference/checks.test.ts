// Self-checks on the JHora answer key (step 0.2.7). These must always pass.
// They check that the converter read the PDFs correctly and that JHora's data is internally consistent.
// No astronomy here: only arithmetic on the numbers JHora printed.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { convertAll, loadBirths, localToUtc, EXPECTED_DIR } from './scripts/parse.mjs';
import { BODIES, VIMSHOTTARI, VIMSHOTTARI_YEARS } from './scripts/ids.mjs';

type Birth = {
  id: string; date: string; time: string; utc_offset: number; iana: string; lat: number; lng: number;
};
const births: Birth[] = loadBirths();
const expected = births.map((b) => JSON.parse(readFileSync(join(EXPECTED_DIR, `${b.id}.json`), 'utf8')));

const DAY = 86400000;
const YEAR_DAYS = 365.25; // D-011 / D-070
const ms = (iso: string) => Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`);
const sequenceFrom = (lord: string) => {
  const i = VIMSHOTTARI.indexOf(lord);
  return [...VIMSHOTTARI.slice(i), ...VIMSHOTTARI.slice(0, i)];
};

describe('expected/ is up to date with raw/', () => {
  let fresh: unknown[];
  beforeAll(async () => { fresh = await convertAll(); }, 120_000);
  it('re-running the converter gives exactly the committed files', () => {
    expect(fresh).toEqual(expected);
  });
});

describe('all 26 births parsed', () => {
  it('has 26 births R01–R26', () => {
    expect(births.map((b) => b.id)).toEqual(Array.from({ length: 26 }, (_, i) => `R${String(i + 1).padStart(2, '0')}`));
    expect(expected).toHaveLength(26);
  });

  it.each(expected.map((e) => [e.id, e]))('%s: no missing fields', (_id, e) => {
    for (const b of BODIES) {
      for (const f of ['lonArcsec', 'sign', 'nakshatra', 'pada', 'navamsaSign', 'retrograde']) {
        expect(e.bodies[b][f], `${b}.${f}`).not.toBeUndefined();
      }
    }
    for (const f of ['samvatsara', 'lunarMonth', 'tithi', 'tithiLeftPercent', 'nakshatra', 'nakshatraLeftPercent',
      'weekday', 'yoga', 'karana', 'horaLord']) {
      expect(e.panchanga[f], f).not.toBeUndefined();
    }
    expect(e.vimshottari).toHaveLength(9);
    const divisions = Object.keys(e.divisional).map(Number).sort((a, b) => a - b);
    expect(divisions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60]);
    for (const d of divisions) expect(Object.keys(e.divisional[d]).sort()).toEqual([...BODIES].sort());
  });

  it('pratyantardasha files exist for R01, R09, R10, R15, R22', () => {
    expect(expected.filter((e) => e.pratyantardashas).map((e) => e.id)).toEqual(['R01', 'R09', 'R10', 'R15', 'R22']);
  });
});

describe('printed birth details match births.json', () => {
  it.each(births.map((b, i) => [b.id, b, expected[i]]))('%s', (id, b, e) => {
    const offsetMinutes = Math.round(b.utc_offset * 3600) / 60; // R22: 5.352778 h → 321.17 min
    const utc = localToUtc(b.date, `${b.time}:00`, 0);
    const birthInstant = ms(utc) - offsetMinutes * 60000;
    // Same instant (R22 was entered as 07:29:50 at UTC+5:21 — see README)
    expect(Math.abs(ms(e.printed.utc) - birthInstant), 'instant').toBeLessThan(1000);
    if (id !== 'R22') {
      expect(e.printed.date).toBe(b.date);
      expect(e.printed.time).toBe(`${b.time}:00`);
      expect(e.printed.utcOffsetMinutes).toBe(offsetMinutes);
    }
    expect(e.printed.lat).toBeCloseTo(b.lat, 5);
    expect(e.printed.lng).toBeCloseTo(b.lng, 5);
    // JHora's own birth file says the same
    const { lat, lng, ...jhdRest } = e.jhd;
    const { lat: pLat, lng: pLng, date, time, utcOffsetMinutes } = e.printed;
    expect(jhdRest).toEqual({ date, time, utcOffsetMinutes });
    expect(lat).toBeCloseTo(pLat, 5);
    expect(lng).toBeCloseTo(pLng, 5);
  });
});

describe('position table is self-consistent', () => {
  it.each(expected.map((e) => [e.id, e]))('%s: sign, nakshatra, pada, navamsa agree with longitude', (_id, e) => {
    for (const b of BODIES) {
      const p = e.bodies[b];
      const lon = p.lonArcsec;
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(1296000);
      expect(p.sign, `${b} sign`).toBe(Math.floor(lon / 108000) + 1);
      expect(p.longitudeSign, `${b} sign in longitude`).toBe(p.sign);
      expect(p.nakshatra, `${b} nakshatra`).toBe(Math.floor(lon / 48000) + 1); // 13°20′ = 48000″
      expect(p.pada, `${b} pada`).toBe(Math.floor((lon % 48000) / 12000) + 1); // 3°20′ = 12000″
      expect(p.navamsaSign, `${b} navamsa`).toBe((Math.floor(lon / 12000) % 12) + 1);
    }
  });

  it.each(expected.map((e) => [e.id, e]))('%s: Ketu is exactly opposite Rahu', (_id, e) => {
    const diff = (e.bodies.Ke.lonArcsec - e.bodies.Ra.lonArcsec + 1296000) % 1296000;
    expect(diff).toBeCloseTo(648000, 2);
  });
});

describe('chart grids agree with the table', () => {
  it.each(expected.map((e) => [e.id, e]))('%s: D-1 grid = Rasi column, D-9 grid = Navamsa column', (_id, e) => {
    for (const b of BODIES) {
      expect(e.divisional[1][b], `${b} D-1`).toBe(e.bodies[b].sign);
      expect(e.divisional[9][b], `${b} D-9`).toBe(e.bodies[b].navamsaSign);
    }
  });

  it.each(expected.map((e) => [e.id, e]))('%s: "(…)" retrograde marks in every chart = table "(R)"', (_id, e) => {
    for (const d of Object.keys(e.chartRetrograde)) {
      for (const b of BODIES) expect(e.chartRetrograde[d][b], `D-${d} ${b}`).toBe(e.bodies[b].retrograde);
    }
  });

  it.each(expected.map((e) => [e.id, e]))('%s: D-2 (Cancer/Leo hora) only uses Cancer and Leo', (_id, e) => {
    for (const b of BODIES) expect([4, 5], b).toContain(e.divisional[2][b]);
  });
});

describe('panchanga block', () => {
  it.each(expected.map((e) => [e.id, e]))('%s: values in range and nakshatra = Moon nakshatra', (_id, e) => {
    const p = e.panchanga;
    expect(p.nakshatra).toBe(e.bodies.Mo.nakshatra);
    expect(p.tithi).toBeGreaterThanOrEqual(1); expect(p.tithi).toBeLessThanOrEqual(30);
    expect(p.yoga).toBeGreaterThanOrEqual(1); expect(p.yoga).toBeLessThanOrEqual(27);
    expect(p.karana).toBeGreaterThanOrEqual(1); expect(p.karana).toBeLessThanOrEqual(11);
    expect(p.tithiLeftPercent).toBeGreaterThanOrEqual(0); expect(p.tithiLeftPercent).toBeLessThanOrEqual(100);
    // Nakshatra "% left" agrees with the Moon's longitude (to the printed 0.01 %)
    const left = 100 * (1 - (e.bodies.Mo.lonArcsec % 48000) / 48000);
    expect(Math.abs(p.nakshatraLeftPercent - left)).toBeLessThan(0.01);
  });

  it.each(births.map((b, i) => [b.id, b, expected[i]]))('%s: weekday is the civil day, or the day before if before sunrise', (_id, b, e) => {
    const civil = new Date(`${b.date}T00:00:00Z`).getUTCDay() + 1; // 1 = Sunday
    const prev = ((civil + 5) % 7) + 1;
    // Before 10:00 local the birth may precede sunrise (R24 Pune; R19 Oslo in December, sunrise ≈ 09:15)
    const early = Number(b.time.slice(0, 2)) < 10;
    expect(early ? [civil, prev] : [civil]).toContain(e.panchanga.weekday);
  });

  it.each(births.map((b, i) => [b.id, b, expected[i]]))('%s: samvatsara fits the year (Prabhava = 1987)', (_id, b, e) => {
    const y = Number(b.date.slice(0, 4));
    const id = (yr: number) => (((yr - 1987) % 60) + 60) % 60 + 1;
    expect([id(y), id(y - 1)]).toContain(e.panchanga.samvatsara);
  });
});

describe('Vimshottari mahadashas and antardashas', () => {
  it.each(expected.map((e) => [e.id, e]))('%s: order, first-antardasha rule and 365.25-day lengths', (_id, e) => {
    const mds = e.vimshottari;
    expect(mds.map((m: { lord: string }) => m.lord)).toEqual(sequenceFrom(mds[0].lord));
    // The first mahadasha is the Moon's nakshatra lord
    expect(mds[0].lord).toBe(VIMSHOTTARI[(e.bodies.Mo.nakshatra - 1) % 9]);
    const all: { start: number; years: number }[] = [];
    for (const md of mds) {
      expect(md.antardashas.map((a: { lord: string }) => a.lord)).toEqual(sequenceFrom(md.lord));
      for (const ad of md.antardashas) {
        all.push({ start: ms(`${ad.startDate}T00:00:00`), years: (VIMSHOTTARI_YEARS[md.lord] * VIMSHOTTARI_YEARS[ad.lord]) / 120 });
      }
    }
    // Each printed (date-only) start is one antardasha length after the previous one, ±1 day
    for (let i = 1; i < all.length; i++) {
      const days = (all[i].start - all[i - 1].start) / DAY;
      expect(Math.abs(days - all[i - 1].years * YEAR_DAYS), `antardasha ${i}`).toBeLessThanOrEqual(1);
    }
    // The dashas cover 120 years
    const span = (all[80].start - all[0].start) / DAY + all[80].years * YEAR_DAYS;
    expect(Math.abs(span - 120 * YEAR_DAYS)).toBeLessThanOrEqual(1);
    // Birth falls inside the first mahadasha
    const birth = ms(e.printed.utc);
    expect(birth).toBeGreaterThanOrEqual(all[0].start - DAY);
    expect(birth).toBeLessThan(all[9].start + DAY);
  });
});

describe('pratyantardashas (.txt files)', () => {
  const withTxt = expected.filter((e) => e.pratyantardashas);
  it.each(withTxt.map((e) => [e.id, e]))('%s: 9 per antardasha, in Vimshottari order, contiguous', (_id, e) => {
    for (const block of e.pratyantardashas) {
      const { mahadasha: md, antardasha: ad, pratyantardashas: pds } = block;
      expect(pds).toHaveLength(9);
      expect(pds.map((p: { lord: string }) => p.lord)).toEqual(sequenceFrom(ad.lord));
      expect(pds[0].start).toEqual(ad.start);
      expect(pds[8].end).toEqual(ad.end);
      for (let i = 1; i < 9; i++) expect(pds[i].start, `pratyantar ${i}`).toEqual(pds[i - 1].end);
      // Lengths follow the 365.25-day year (printed to whole seconds)
      for (const p of pds) {
        const years = (VIMSHOTTARI_YEARS[md.lord] * VIMSHOTTARI_YEARS[ad.lord] * VIMSHOTTARI_YEARS[p.lord]) / 14400;
        const secs = (ms(p.end.utc) - ms(p.start.utc)) / 1000;
        expect(Math.abs(secs - years * YEAR_DAYS * 86400), `${p.lord} length`).toBeLessThanOrEqual(2);
      }
      // Agrees with the PDF's dasha table (dates are on the same clock)
      const pdfMd = e.vimshottari.find((m: { lord: string }) => m.lord === md.lord);
      const pdfAd = pdfMd.antardashas.find((a: { lord: string }) => a.lord === ad.lord);
      expect(ad.start.local.slice(0, 10)).toBe(pdfAd.startDate);
      expect(md.start.local.slice(0, 10)).toBe(pdfMd.startDate);
    }
  });
});
