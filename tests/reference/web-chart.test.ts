// The home page's South Indian chart vs the planet table (step 0.3.2.1, D-101): for all 29 reference
// births, through the same path the table uses (engine → apps/web/lib), every planet and the Lagna
// appear exactly once, in the box of their sign; the Lagna's box is the 1st house and houses run 1–12
// clockwise from it; each label is the abbreviation with no degree (D-108); (R) only where the table
// says retrograde, never on Rahu/Ketu. The table itself is checked against JHora in web-table.test.ts.

import { describe, expect, it } from 'vitest';
import { calculateChart } from '@jathag/engine';
import { loadBirths } from './scripts/parse.mjs';
import { tableRows, TABLE_BODIES } from '../../apps/web/lib/chart-format.ts';
import { LABEL_AREA, moonFacts, SIGN_CELLS, southChartBoxes } from '../../apps/web/lib/south-chart.ts';
import en from '../../apps/web/messages/en.json';

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const t = en.chart;

function utcOf(b: Birth): string {
  // Same as web-table.test.ts: the TRUE local time and offset from births.json.
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi, sec = 0] = b.time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, sec) - Math.round(b.utc_offset * 3600) * 1000).toISOString();
}

// Clockwise round the edge, starting at Pisces (top left).
const RING = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]];

describe('South Indian chart matches the planet table for every reference birth', () => {
  it('covers 29 births', () => expect(births).toHaveLength(29));

  it.each(births.map((b) => [b.id, b] as const))('%s', (id, b) => {
    const chart = calculateChart({ utc: utcOf(b), lat: b.lat, lng: b.lng });
    const rows = tableRows(chart, t);
    const boxes = southChartBoxes(chart, t);
    expect(boxes).toHaveLength(12);

    // Centre (0.3.7.1, D-115 item 3): the Moon's sign, nakshatra and pada equal the table's Moon row
    const moonRow = rows.find((r) => r.code === 'Mo')!;
    expect(moonFacts(chart, t), id).toEqual({ sign: moonRow.sign, nakshatra: moonRow.nakshatra, pada: moonRow.pada });

    // Every body exactly once, in the box of the sign the table shows
    const seen = boxes.flatMap((box) => box.bodies.map((body) => ({ box, body })));
    expect(seen.map((s) => s.body.code).sort(), id).toEqual([...TABLE_BODIES].sort());
    for (const row of rows) {
      const label = `${id} ${row.code}`;
      const { box, body } = seen.find((s) => s.body.code === row.code)!;
      expect(box.signName, label).toBe(row.sign);
      expect([box.col, box.row], label).toEqual(SIGN_CELLS[box.sign]);
      // The abbreviation, no degree (D-108): "Sa" or "Sa (R)", never a digit
      expect(body.text, label).toMatch(new RegExp(`^${t.abbreviations[row.code]}( \\(R\\))?$`));
      expect(body.text, label).not.toMatch(/\d/);
      // (R) only where the table says R; never for Rahu/Ketu or the Lagna
      const r = body.text.endsWith(t.southChart.retrogradeMark);
      expect(r, label).toBe(row.retrograde === t.retrograde);
      if (row.code === 'La' || row.code === 'Ra' || row.code === 'Ke') expect(r, label).toBe(false);
      // The box's house number = the table's house column
      expect(String(box.house), label).toBe(row.house);
    }

    // The Lagna's box is the 1st house and the only one marked; houses run 1–12 clockwise from it
    const lagna = boxes.filter((box) => box.isLagna);
    expect(lagna).toHaveLength(1);
    expect(lagna[0]!.house).toBe(1);
    expect(lagna[0]!.bodies.some((body) => body.code === 'La')).toBe(true);
    const ring = RING.map(([c, r]) => boxes.find((box) => box.col === c && box.row === r)!);
    const start = ring.indexOf(lagna[0]!);
    for (let i = 0; i < 12; i++) expect(ring[(start + i) % 12]!.house, `${id} ring ${i}`).toBe(i + 1);

    // Every label fits inside its box
    for (const box of boxes) {
      for (const l of box.layout.labels) {
        expect(l.x + l.width, `${id} ${l.code}`).toBeLessThanOrEqual(LABEL_AREA.x + LABEL_AREA.width + 1e-9);
        expect(l.x, `${id} ${l.code}`).toBeGreaterThanOrEqual(LABEL_AREA.x - 1e-9);
      }
    }
  });
});
