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
//        dashas      → 0.3.1  (Vimshottari mahadasha, antardasha, pratyantardasha)
//        panchanga   → 0.9.1  (tithi, nakshatra, weekday, yoga, karana, hora)
//   3. Run `pnpm test`. All enabled groups must pass before the step is merged (CLAUDE.md rule 4).
//
// Tolerances (D-074, stricter than the public D-013 promise):
//   longitudes ±1″ · signs, nakshatras, padas, divisional signs exact · dasha times ±1 hour.
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
  positions: false, // 0.2.8
  divisional: false, // 1.0.1
  dashas: false, // 0.3.1
  panchanga: false, // 0.9.1
};

const TOL_LONGITUDE_ARCSEC = 1;
const TOL_DASHA_MS = 60 * 60 * 1000;

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

async function runEngine(_input: EngineInput): Promise<EngineResult> {
  // 0.2.8: replace with the real engine, e.g.
  //   const { calculateChart } = await import('@jathag/engine');
  //   return adapt(await calculateChart(_input));
  throw new Error('Engine not built yet (step 0.2.8)');
}

// ---------------------------------------------------------------- data

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const expected = Object.fromEntries(births.map((b) => [b.id,
  JSON.parse(readFileSync(join(EXPECTED_DIR, `${b.id}.json`), 'utf8'))]));

function inputFor(b: Birth): EngineInput {
  // Always the TRUE values from births.json (R22: 07:30:00 at UTC+5:21:10, not JHora's 07:29:50 at +5:21)
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi] = b.time.split(':').map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi, 0) - Math.round(b.utc_offset * 3600) * 1000;
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

/** Printed date-only value (JHora clock) matches an engine instant within ±1 hour. */
function sameDateWithinHour(engineUtc: string, printedDate: string, offsetMinutes: number) {
  const local = Date.parse(engineUtc) + offsetMinutes * 60000;
  const dates = [local - TOL_DASHA_MS, local + TOL_DASHA_MS].map((t) => new Date(t).toISOString().slice(0, 10));
  return dates.includes(printedDate);
}

const cases = births.map((b) => [b.id, b] as const);

// ---------------------------------------------------------------- positions (0.2.8)

describe.skipIf(!ENABLED.positions)('engine: positions (0.2.8)', () => {
  it.each(cases)('%s: longitudes within 1″', async (id, b) => {
    const r = await engine(b);
    for (const code of BODIES as BodyCode[]) {
      const diff = arcDiff(r.bodies[code].lonArcsec, expected[id].bodies[code].lonArcsec);
      expect(diff, `${code} differs by ${diff.toFixed(2)}″`).toBeLessThanOrEqual(TOL_LONGITUDE_ARCSEC);
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
  it.each(cases)('%s: mahadasha and antardasha start dates (±1 hour)', async (id, b) => {
    const r = await engine(b);
    const e = expected[id];
    const off = e.jhoraClockUtcOffsetMinutes;
    expect(r.vimshottari.map((m) => m.lord)).toEqual(e.vimshottari.map((m: { lord: string }) => m.lord));
    r.vimshottari.forEach((md, i) => {
      expect(md.antardashas.map((a) => a.lord)).toEqual(e.vimshottari[i].antardashas.map((a: { lord: string }) => a.lord));
      md.antardashas.forEach((ad, j) => {
        const printed = e.vimshottari[i].antardashas[j].startDate;
        expect(sameDateWithinHour(ad.startUtc, printed, off), `${md.lord}-${ad.lord}: ${ad.startUtc} vs ${printed}`).toBe(true);
      });
    });
  });

  const withTxt = cases.filter(([id]) => expected[id].pratyantardashas);
  it.each(withTxt)('%s: pratyantardasha start/end times (±1 hour)', async (id, b) => {
    const r = await engine(b);
    for (const block of expected[id].pratyantardashas) {
      const md = r.vimshottari.find((m) => m.lord === block.mahadasha.lord)!;
      const ad = md.antardashas.find((a) => a.lord === block.antardasha.lord)!;
      expect(ad.pratyantardashas).toHaveLength(9);
      block.pratyantardashas.forEach((p: { lord: string; start: { utc: string }; end: { utc: string } }, k: number) => {
        const got = ad.pratyantardashas[k];
        expect(got.lord).toBe(p.lord);
        expect(Math.abs(Date.parse(got.startUtc) - Date.parse(p.start.utc)), `${p.lord} start`).toBeLessThanOrEqual(TOL_DASHA_MS);
        expect(Math.abs(Date.parse(got.endUtc) - Date.parse(p.end.utc)), `${p.lord} end`).toBeLessThanOrEqual(TOL_DASHA_MS);
      });
    }
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
