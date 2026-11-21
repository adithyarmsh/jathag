// The website's planet table vs the JHora answer key (step 0.2.13, D-092): for all 29 reference
// births, the table values the web app builds from the engine's output (sign, degree string,
// nakshatra, pada, retrograde) match what JHora prints.
//
// Degrees: JHora prints seconds with two decimals (e.g. 27° 44′ 48.95″); the website shows whole
// seconds, cut off (apps/web/lib/chart-format.ts). So we compare like with like: the website's
// degree string against JHora's printed value with its decimals cut off. The difference must stay
// within the reference tolerance (D-074: 1″; births before 1900, R26 and R29: 3″, D-081). Signs,
// nakshatras, padas and retrograde must be exact. The same formatter applied to JHora's own value
// must reproduce JHora's printed digits exactly, for every body of every birth.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateChart } from '@jathag/engine';
import { EXPECTED_DIR, loadBirths } from './scripts/parse.mjs';
import { degreeInSign, tableRows, TABLE_BODIES } from '../../apps/web/lib/chart-format.ts';
import en from '../../apps/web/messages/en.json';

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const expected = (id: string) => JSON.parse(readFileSync(join(EXPECTED_DIR, `${id}.json`), 'utf8'));
const t = en.chart;

function utcOf(b: Birth): string {
  // Same as engine.test.ts: always the TRUE local time and offset from births.json.
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi, sec = 0] = b.time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, sec) - Math.round(b.utc_offset * 3600) * 1000).toISOString();
}

/** "14° 07′ 32″" → arcseconds within the sign. */
function parseShown(text: string): number {
  const m = /^(\d{1,2})° (\d\d)′ (\d\d)″$/.exec(text);
  if (!m) throw new Error(`Bad degree string "${text}"`);
  const [deg, min, sec] = [Number(m[1]), Number(m[2]), Number(m[3])];
  expect(deg).toBeLessThan(30);
  expect(min).toBeLessThan(60);
  expect(sec).toBeLessThan(60);
  return deg * 3600 + min * 60 + sec;
}

/** JHora's printed "27 Cn 44' 48.95\"" with the decimals cut off → arcseconds within the sign. */
function jhoraShownTruncated(printed: string): number {
  const m = /^(\d{1,2}) [A-Z][a-z] (\d\d)' (\d\d)\.\d\d"$/.exec(printed);
  if (!m) throw new Error(`Bad JHora longitude "${printed}"`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const tolerance = (b: Birth) => (b.date < '1900-01-01' ? 3 : 1); // D-074 / D-081

describe('planet table matches JHora for every reference birth', () => {
  it('covers 29 births, and only R26 and R29 use 3″', () => {
    expect(births).toHaveLength(29);
    expect(births.filter((b) => tolerance(b) === 3).map((b) => b.id)).toEqual(['R26', 'R29']);
  });

  it.each(births.map((b) => [b.id, b] as const))('%s', (id, b) => {
    const e = expected(id);
    const chart = calculateChart({ utc: utcOf(b), lat: b.lat, lng: b.lng });
    const rows = tableRows(chart, t);
    expect(rows.map((r) => r.code)).toEqual(TABLE_BODIES);
    for (const row of rows) {
      const want = e.bodies[row.code];
      const label = `${id} ${row.code}`;
      // Exact: sign, nakshatra, pada (as words / numbers on the page)
      expect(row.sign, label).toBe(t.signs[want.sign - 1]);
      expect(row.nakshatra, label).toBe(t.nakshatras[want.nakshatra - 1]);
      expect(row.pada, label).toBe(String(want.pada));
      // Exact: retrograde as shown. JHora never marks Rahu/Ketu (R); the table shows "—" for them.
      if (row.code === 'La' || row.code === 'Ra' || row.code === 'Ke') {
        expect(want.retrograde, label).toBe(false);
        expect(row.retrograde, label).toBe(t.notApplicable);
      } else {
        expect(row.retrograde, label).toBe(want.retrograde ? t.retrograde : '');
      }
      // Degree: shown value vs JHora's shown value, within the reference tolerance
      const diff = Math.abs(parseShown(row.degree) - jhoraShownTruncated(want.printedLongitude));
      expect(diff, `${label}: ${row.degree} vs JHora ${want.printedLongitude}`).toBeLessThanOrEqual(tolerance(b));
      // The formatter on JHora's own longitude gives JHora's printed digits exactly
      const own = degreeInSign(want.lonArcsec / 3600, want.sign);
      expect(own.deg * 3600 + own.min * 60 + own.sec, `${label} formatter on JHora's value`).toBe(jhoraShownTruncated(want.printedLongitude));
    }
  });
});
