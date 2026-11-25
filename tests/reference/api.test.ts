// End-to-end through the chart endpoint's logic (step 0.2.12, D-085): R27–R29 entered as a user
// would (a searched place + the "Which clock?" answer) must give the true UTC instant and JHora's
// positions within the D-074 / D-081 tolerances. Also R01 (modern, IANA zone) and R06 (War Time,
// which is now the clock rule's default) as controls.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { handleChartRequest, type ChartResponse } from '@jathag/api';
import { EXPECTED_DIR, loadBirths } from './scripts/parse.mjs';
import { BODIES } from './scripts/ids.mjs';

type Birth = { id: string; date: string; time: string; lat: number; lng: number; iana: string | null; clock?: string };
const births: Birth[] = loadBirths();
const byId = (id: string) => births.find((b) => b.id === id)!;
const expected = (id: string) => JSON.parse(readFileSync(join(EXPECTED_DIR, `${id}.json`), 'utf8'));

// GeoNames ids and admin codes of the real places; coordinates are the births.json ones (what JHora was given).
const PLACE: Record<string, { geonameId: number; countryCode: string; admin1Code: string; admin2Code: string }> = {
  R01: { geonameId: 1264527, countryCode: 'IN', admin1Code: '25', admin2Code: '603' }, // Chennai
  R06: { geonameId: 1261481, countryCode: 'IN', admin1Code: '07', admin2Code: '094' }, // New Delhi
  R27: { geonameId: 1275339, countryCode: 'IN', admin1Code: '16', admin2Code: '' }, // Mumbai (no-district list)
  R28: { geonameId: 1275004, countryCode: 'IN', admin1Code: '28', admin2Code: '342' }, // Kolkata
  R29: { geonameId: 1261481, countryCode: 'IN', admin1Code: '07', admin2Code: '094' }, // New Delhi
};

async function viaEndpoint(b: Birth, clock?: string) {
  const body = {
    date: b.date,
    time: b.time,
    place: { ...PLACE[b.id], lat: b.lat, lng: b.lng, timeZone: 'Asia/Kolkata' },
    ...(clock ? { clock } : {}),
  };
  const res = await handleChartRequest(new Request('http://localhost/api/chart', { method: 'POST', body: JSON.stringify(body) }));
  expect(res.status).toBe(200);
  return (await res.json()) as ChartResponse;
}

const arcDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1296000;
  return Math.min(d, 1296000 - d);
};
const tolerance = (b: Birth) => (b.date < '1900-01-01' ? 3 : 1); // D-074 / D-081

function matchesJhora(id: string, r: ChartResponse) {
  const e = expected(id);
  for (const code of BODIES as (keyof ChartResponse['chart']['bodies'])[]) {
    const got = r.chart.bodies[code];
    const want = e.bodies[code];
    const diff = arcDiff(got.lon * 3600, want.lonArcsec);
    expect(diff, `${id} ${code} differs by ${diff.toFixed(2)}″`).toBeLessThanOrEqual(tolerance(byId(id)));
    expect({ sign: got.sign, nakshatra: got.nakshatra, pada: got.pada, navamsa: got.navamsaSign }, `${id} ${code}`)
      .toEqual({ sign: want.sign, nakshatra: want.nakshatra, pada: want.pada, navamsa: want.navamsaSign });
  }
  expect(r.utc, `${id} = JHora's instant`).toBe(e.printed.utc);
}

describe('R27–R29 through the chart endpoint with their clock', () => {
  it.each([
    ['R27', 'bombay', 17460, '1938-05-10T04:24:00Z', ['ist', 'bombay']],
    ['R28', 'calcutta', 21200, '1925-11-03T10:47:00Z', ['ist', 'calcutta']],
    ['R29', 'lmt', 18532, '1895-02-20T01:41:00Z', ['ist', 'lmt']],
  ] as const)('%s with clock "%s"', async (id, clock, offset, utc, options) => {
    const b = byId(id);
    expect(b.clock).toBe(clock);
    const r = await viaEndpoint(b, clock);
    expect(r.utc).toBe(utc);
    expect(r.clock).toEqual({ source: 'clockRule', id: clock, chosen: true, utcOffsetSeconds: offset, timeZone: null, tzdataVersion: null });
    expect(r.clockQuestion.applies).toBe(true);
    expect(r.clockQuestion.defaultClock).toBe('ist');
    expect(r.clockQuestion.options.map((o) => o.id)).toEqual(options);
    matchesJhora(id, r);
  });

  it('without the clock answer, R27–R29 get the default (IST), which is NOT their chart', async () => {
    for (const id of ['R27', 'R28', 'R29']) {
      const r = await viaEndpoint(byId(id));
      expect(r.clock).toMatchObject({ source: 'clockRule', id: 'ist', chosen: false, utcOffsetSeconds: 19800 });
      expect(r.utc).not.toBe(expected(id).printed.utc);
    }
  });
});

describe('controls', () => {
  it('R01 (Chennai 1992): IANA zone, no question, matches JHora', async () => {
    const r = await viaEndpoint(byId('R01'));
    expect(r.clock.source).toBe('timeZone');
    expect(r.clockQuestion.applies).toBe(false);
    matchesJhora('R01', r);
  });
  it('R06 (New Delhi 1943, War Time): the clock rule\'s default gives JHora\'s chart', async () => {
    const r = await viaEndpoint(byId('R06'));
    expect(r.clock).toMatchObject({ source: 'clockRule', id: 'war', chosen: false, utcOffsetSeconds: 23400 });
    matchesJhora('R06', r);
  });
});

describe('panchanga through the chart endpoint (step 0.9.1)', () => {
  it.each([['R01', undefined], ['R06', undefined], ['R27', 'bombay'], ['R28', 'calcutta'], ['R29', 'lmt']] as const)(
    '%s: the six answer-key fields match JHora, with the clock the user would choose',
    async (id, clock) => {
      const r = await viaEndpoint(byId(id), clock);
      const { tithi, nakshatra, weekday, yoga, karana, horaLord } = expected(id).panchanga;
      expect(r.panchanga).toMatchObject({ tithi, nakshatra, weekday, yoga, karana, horaLord, weekdayFrom: 'sunrise' });
    },
  );
});
