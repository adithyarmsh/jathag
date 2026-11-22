// Engine reference tests: Jathag's engine must reproduce the JHora answer key (tests/reference/expected/).
//
// STATUS: written in step 0.2.7, before the engine exists, so every group is SKIPPED for now.
//
// HOW TO SWITCH THEM ON (step 0.2.8 and later):
//   1. Fill in `runEngine()` below so it calls the real engine (packages/engine) and returns an `EngineResult`.
//      If the engine's real output shape differs, adapt it here — keep the assertions unchanged.
//   2. Flip the matching flag in `ENABLED` to true:
//        positions   → 0.2.8  (longitudes, sign, nakshatra, pada, retrograde, D-9)
//        divisional  → 1.0.1  (all other divisional charts, D-2 … D-60)
//        dashas      → 0.3.1  (Vimshottari mahadasha, antardasha, pratyantardasha)  ← ON since 0.3.1
//        panchanga   → 0.9.1  (tithi, nakshatra, weekday, yoga, karana, hora)
//   3. Run `pnpm test`. All enabled groups must pass before the step is merged (CLAUDE.md rule 4).
//
// Tolerances (D-074, amended by D-081; both stricter than the public D-013 promise):
//   births from 1900-01-01 (local date): longitudes ±1″ · dasha times ±1 hour.
//   births before 1900-01-01:            longitudes ±3″ · dasha times ±12 hours (ΔT drift, D-081).
//   Every birth: signs, nakshatras, padas, D-9, divisional signs and retrograde EXACT.
//
// Settings the engine must use to match JHora (D-070, D-071, D-072, D-073):
//   - Ayanamsa SE_SIDM_LAHIRI ("Traditional Lahiri"); apparent geocentric positions; MEAN node.
//   - LAGNA (D-073): tropical ascendant (apparent, true obliquity) MINUS the Lahiri ayanamsa
//     WITHOUT nutation. Do NOT use Swiss Ephemeris' default sidereal ascendant: it differs from
//     JHora by the nutation in longitude (≈ −18.7″ on R01). Planets stay sidereal WITH nutation.
//   - JHora's Lahiri starts ≈0.14″ different from Swiss Ephemeris (constant offset, below 1″; ignored).
//   - Vimshottari year = 365.25 days. Dasha times in JHora are on the birth place's clock
//     (the fixed UTC offset typed into JHora); expected/ also stores them in UTC, which is what we compare.
//   - Sunrise: upper limb, refraction, altitude 0 m, 1013.25 hPa, 20 °C.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBirths, EXPECTED_DIR } from './scripts/parse.mjs';
import { BODIES } from './scripts/ids.mjs';

const ENABLED = {
  positions: true, // 0.2.8
  divisional: false, // 1.0.1
  dashas: true, // 0.3.1
  panchanga: false, // 0.9.1
};

// D-074: births from 1900-01-01 on.
const TOL_LONGITUDE_ARCSEC = 1;
const TOL_DASHA_MS = 60 * 60 * 1000;
// D-081: births before 1900-01-01 (local date in births.json). JHora and Swiss Ephemeris estimate
// Earth's past rotation (ΔT) differently, so the Moon drifts (R26, 1853: +1.47″).
const PRE_1900_BEFORE = '1900-01-01';
const TOL_LONGITUDE_ARCSEC_PRE_1900 = 3;
const TOL_DASHA_MS_PRE_1900 = 12 * 60 * 60 * 1000;

/** Tolerances for one birth, chosen by its LOCAL date (D-074 / D-081). */
function tolerancesFor(b: { date: string }) {
  return b.date < PRE_1900_BEFORE
    ? { longitudeArcsec: TOL_LONGITUDE_ARCSEC_PRE_1900, dashaMs: TOL_DASHA_MS_PRE_1900 }
    : { longitudeArcsec: TOL_LONGITUDE_ARCSEC, dashaMs: TOL_DASHA_MS };
}

// ---------------------------------------------------------------- the contract the engine is tested against

type BodyCode = 'La' | 'Su' | 'Mo' | 'Ma' | 'Me' | 'Ju' | 'Ve' | 'Sa' | 'Ra' | 'Ke';
type Period = { lord: BodyCode; startUtc: string; endUtc: string };

export type EngineInput = {
  /** Birth instant in UTC, ISO 8601 (built from births.json: local time minus the true UTC offset). */
  utc: string;
  lat: number;
  lng: number;
};

export type EngineResult = {
  bodies: Record<BodyCode, {
    lonArcsec: number; // sidereal longitude, arcseconds from 0° Aries, 0 ≤ x < 1 296 000
    sign: number; // 1–12
    nakshatra: number; // 1–27
    pada: number; // 1–4
    retrograde: boolean;
  }>;
  /** Sign (1–12) of each body in divisional chart D-n, e.g. divisional(9).Mo */
  divisional: (n: number) => Record<BodyCode, number>;
  /** All 9 mahadashas from the one running at birth; each with 9 antardashas; each with 9 pratyantardashas. */
  vimshottari: (Period & { antardashas: (Period & { pratyantardashas: Period[] })[] })[];
  panchanga: {
    tithi: number; nakshatra: number; weekday: number; yoga: number; karana: number; horaLord: BodyCode;
  };
};

async function runEngine(input: EngineInput): Promise<EngineResult> {
  const { calculateChart, vimshottariForChart } = await import('@jathag/engine');
  const chart = calculateChart(input);
  const timeline = vimshottariForChart(chart);
  const period = (p: { lord: string; start: string; end: string }) => ({ lord: p.lord as BodyCode, startUtc: p.start, endUtc: p.end });
  const bodies = Object.fromEntries((BODIES as BodyCode[]).map((code) => {
    const b = chart.bodies[code];
    return [code, {
      lonArcsec: b.lon * 3600,
      sign: b.sign,
      nakshatra: b.nakshatra,
      pada: b.pada,
      retrograde: b.retrograde ?? false,
    }];
  })) as EngineResult['bodies'];
  return {
    bodies,
    divisional: (n) => {
      if (n === 1) return Object.fromEntries((BODIES as BodyCode[]).map((c) => [c, chart.bodies[c].sign])) as Record<BodyCode, number>;
      if (n === 9) return Object.fromEntries((BODIES as BodyCode[]).map((c) => [c, chart.bodies[c].navamsaSign])) as Record<BodyCode, number>;
      throw new Error(`D-${n} not built yet (step 1.0.1)`);
    },
    vimshottari: timeline.mahadashas.map((m) => ({
      ...period(m),
      antardashas: m.antardashas.map((a) => ({ ...period(a), pratyantardashas: a.pratyantardashas.map(period) })),
    })),
    get panchanga(): never { throw new Error('Panchanga not built yet (step 0.9.1)'); },
  };
}

// ---------------------------------------------------------------- data

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const expected = Object.fromEntries(births.map((b) => [b.id,
  JSON.parse(readFileSync(join(EXPECTED_DIR, `${b.id}.json`), 'utf8'))]));

function inputFor(b: Birth): EngineInput {
  // Always the TRUE values from births.json (R22: 07:30:00 at UTC+5:21:10, not JHora's 07:29:50 at +5:21;
  // R28 16:40:20 at +5:53:20 and R29 06:49:52 at +5:08:52 likewise)
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi, sec = 0] = b.time.split(':').map(Number); // R27–R29 have seconds
  const ms = Date.UTC(y, mo - 1, d, h, mi, sec) - Math.round(b.utc_offset * 3600) * 1000;
  return { utc: new Date(ms).toISOString(), lat: b.lat, lng: b.lng };
}

const cache = new Map<string, Promise<EngineResult>>();
const engine = (b: Birth) => {
  if (!cache.has(b.id)) cache.set(b.id, runEngine(inputFor(b)));
  return cache.get(b.id)!;
};

const arcDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1296000;
  return Math.min(d, 1296000 - d);
};

/** Printed date-only value (JHora clock) matches an engine instant within ±tolMs (1 hour; 12 hours before 1900). */
function sameDateWithin(engineUtc: string, printedDate: string, offsetMinutes: number, tolMs: number) {
  const local = Date.parse(engineUtc) + offsetMinutes * 60000;
  const dates = [local - tolMs, local + tolMs].map((t) => new Date(t).toISOString().slice(0, 10));
  return dates.includes(printedDate);
}

const cases = births.map((b) => [b.id, b] as const);

// ---------------------------------------------------------------- tolerance rule (D-074 / D-081, always on)

describe('tolerance rule: looser only for births before 1900 (D-081)', () => {
  it('R26 (1853) and R29 (1895) use 3″ / 12 h; R22 (1901) and every other birth use 1″ / 1 h', () => {
    const byId = (id: string) => births.find((b) => b.id === id)!;
    expect(byId('R26').date).toBe('1853-06-28');
    expect(byId('R29').date).toBe('1895-02-20');
    expect(byId('R22').date).toBe('1901-04-12');
    expect(tolerancesFor(byId('R26'))).toEqual({ longitudeArcsec: 3, dashaMs: 12 * 3600 * 1000 });
    expect(tolerancesFor(byId('R29'))).toEqual({ longitudeArcsec: 3, dashaMs: 12 * 3600 * 1000 });
    expect(tolerancesFor(byId('R22'))).toEqual({ longitudeArcsec: 1, dashaMs: 3600 * 1000 });
    expect(births.filter((b) => tolerancesFor(b).longitudeArcsec === 3).map((b) => b.id)).toEqual(['R26', 'R29']);
  });
});

// ---------------------------------------------------------------- positions (0.2.8)

describe.skipIf(!ENABLED.positions)('engine: positions (0.2.8)', () => {
  it.each(cases)('%s: longitudes within 1″ (3″ before 1900)', async (id, b) => {
    const r = await engine(b);
    for (const code of BODIES as BodyCode[]) {
      const diff = arcDiff(r.bodies[code].lonArcsec, expected[id].bodies[code].lonArcsec);
      expect(diff, `${code} differs by ${diff.toFixed(2)}″`).toBeLessThanOrEqual(tolerancesFor(b).longitudeArcsec);
    }
  });

  it.each(cases)('%s: sign, nakshatra, pada exact', async (id, b) => {
    const r = await engine(b);
    for (const code of BODIES as BodyCode[]) {
      const e = expected[id].bodies[code];
      expect({ sign: r.bodies[code].sign, nakshatra: r.bodies[code].nakshatra, pada: r.bodies[code].pada }, code)
        .toEqual({ sign: e.sign, nakshatra: e.nakshatra, pada: e.pada });
    }
  });

  it.each(cases)('%s: retrograde (Sun–Saturn; JHora does not mark the nodes)', async (id, b) => {
    const r = await engine(b);
    for (const code of ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'] as BodyCode[]) {
      expect(r.bodies[code].retrograde, code).toBe(expected[id].bodies[code].retrograde);
    }
  });

  it.each(cases)('%s: D-9 navamsa signs exact', async (id, b) => {
    const r = await engine(b);
    expect(r.divisional(9)).toEqual(expected[id].divisional[9]);
  });
});

// ---------------------------------------------------------------- divisional charts (1.0.1)

describe.skipIf(!ENABLED.divisional)('engine: divisional charts D-1 … D-60 (1.0.1)', () => {
  it.each(cases)('%s: every divisional sign exact', async (id, b) => {
    const r = await engine(b);
    for (const n of Object.keys(expected[id].divisional).map(Number)) {
      expect(r.divisional(n), `D-${n}`).toEqual(expected[id].divisional[n]);
    }
  });
});

// ---------------------------------------------------------------- dashas (0.3.1)

describe.skipIf(!ENABLED.dashas)('engine: Vimshottari dashas (0.3.1)', () => {
  it.each(cases)('%s: mahadasha and antardasha start dates (±1 hour; ±12 hours before 1900)', async (id, b) => {
    const r = await engine(b);
    const e = expected[id];
    const off = e.jhoraClockUtcOffsetMinutes;
    expect(r.vimshottari.map((m) => m.lord)).toEqual(e.vimshottari.map((m: { lord: string }) => m.lord));
    r.vimshottari.forEach((md, i) => {
      expect(md.antardashas.map((a) => a.lord)).toEqual(e.vimshottari[i].antardashas.map((a: { lord: string }) => a.lord));
      md.antardashas.forEach((ad, j) => {
        const printed = e.vimshottari[i].antardashas[j].startDate;
        expect(sameDateWithin(ad.startUtc, printed, off, tolerancesFor(b).dashaMs), `${md.lord}-${ad.lord}: ${ad.startUtc} vs ${printed}`).toBe(true);
      });
    });
  });

  const withTxt = cases.filter(([id]) => expected[id].pratyantardashas);
  it.each(withTxt)('%s: pratyantardasha start/end times (±1 hour; ±12 hours before 1900)', async (id, b) => {
    const r = await engine(b);
    for (const block of expected[id].pratyantardashas) {
      const md = r.vimshottari.find((m) => m.lord === block.mahadasha.lord)!;
      const ad = md.antardashas.find((a) => a.lord === block.antardasha.lord)!;
      expect(ad.pratyantardashas).toHaveLength(9);
      block.pratyantardashas.forEach((p: { lord: string; start: { utc: string }; end: { utc: string } }, k: number) => {
        const got = ad.pratyantardashas[k];
        expect(got.lord).toBe(p.lord);
        expect(Math.abs(Date.parse(got.startUtc) - Date.parse(p.start.utc)), `${p.lord} start`).toBeLessThanOrEqual(tolerancesFor(b).dashaMs);
        expect(Math.abs(Date.parse(got.endUtc) - Date.parse(p.end.utc)), `${p.lord} end`).toBeLessThanOrEqual(tolerancesFor(b).dashaMs);
      });
    }
  });
  // Structure of the whole timeline, for every birth (no JHora values needed).
  it.each(cases)('%s: structure: first mahadasha contains birth; 9/81/729; contiguous; children fill parents; 120 dasha years', async (_id, b) => {
    const { calculateChart, vimshottariForChart } = await import('@jathag/engine');
    const input = inputFor(b);
    const t = vimshottariForChart(calculateChart(input));
    const birth = Date.parse(input.utc);
    const ms = (iso: string) => Date.parse(iso);
    const md = t.mahadashas;
    const ad = md.flatMap((m) => m.antardashas);
    const pd = ad.flatMap((a) => a.pratyantardashas);
    expect([md.length, ad.length, pd.length]).toEqual([9, 81, 729]);
    expect(ms(md[0].start)).toBeLessThanOrEqual(birth);
    expect(ms(md[0].end)).toBeGreaterThan(birth);
    expect(md[0].containsBirth).toBe(true);
    for (const level of [md, ad, pd]) {
      expect(level[0].start).toBe(t.start);
      expect(level.at(-1)!.end).toBe(t.end);
      for (let i = 1; i < level.length; i++) expect(level[i].start, `gap at ${i}`).toBe(level[i - 1].end);
      for (const p of level) expect(ms(p.end)).toBeGreaterThan(ms(p.start));
      expect(level.filter((p) => p.containsBirth)).toHaveLength(1);
      for (const p of level) {
        expect(p.containsBirth).toBe(ms(p.start) <= birth && birth < ms(p.end));
        expect(p.endedBeforeBirth).toBe(ms(p.end) <= birth);
      }
    }
    for (const m of md) {
      expect(m.antardashas[0].start).toBe(m.start);
      expect(m.antardashas.at(-1)!.end).toBe(m.end);
      expect(m.antardashas[0].lord).toBe(m.lord);
      for (const a of m.antardashas) {
        expect(a.pratyantardashas[0].start).toBe(a.start);
        expect(a.pratyantardashas.at(-1)!.end).toBe(a.end);
        expect(a.pratyantardashas[0].lord).toBe(a.lord);
      }
    }
    // 120 dasha years of 365.25 days, to the rounding second.
    expect(Math.abs(ms(t.end) - ms(t.start) - 120 * 365.25 * 86400000)).toBeLessThanOrEqual(1000);
  });
});

// ---------------------------------------------------------------- panchanga (0.9.1)

describe.skipIf(!ENABLED.panchanga)('engine: panchanga (0.9.1)', () => {
  it.each(cases)('%s: tithi, nakshatra, weekday, yoga, karana, hora exact', async (id, b) => {
    const r = await engine(b);
    const { tithi, nakshatra, weekday, yoga, karana, horaLord } = expected[id].panchanga;
    expect(r.panchanga).toEqual({ tithi, nakshatra, weekday, yoga, karana, horaLord });
  });
});
