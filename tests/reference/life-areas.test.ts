// Life-area links for all 29 reference births (step 0.3.4, D-028, D-104).
// JHora has no life-area output, so this re-derives the links independently from the JHora answer key's own
// signs (expected/), with its own lord table and area houses written out here, and checks that the engine's
// links agree with the chart's own houses (chart.houses: sign, lord, occupants).

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateChart, lifeAreasForChart } from '@jathag/engine';
import { EXPECTED_DIR, loadBirths } from './scripts/parse.mjs';

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const GRAHAS = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'] as const;
type Reason = { kind: 'rules'; house: number; sign: number } | { kind: 'occupies'; house: number };

// Independent copies (Requirements §6.6; Parashari lords from Aries; Rahu/Ketu rule nothing).
const LORD_FROM_ARIES = 'Ma Ve Me Mo Su Me Ve Ma Ju Sa Sa Ju'.split(' ');
const AREAS: [string, number[]][] = [
  ['self', [1]], ['money', [2, 11]], ['communication', [3]], ['home', [4]], ['learning', [5]],
  ['health', [1, 6]], ['relationships', [7]], ['career', [10, 6]], ['luck', [9]], ['spirituality', [12, 8]],
];

function utcOf(b: Birth) {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi, sec = 0] = b.time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, sec) - Math.round(b.utc_offset * 3600) * 1000).toISOString();
}

/** The same rule, re-derived from JHora's signs: { graha: { area: sorted reasons } }. */
function rederive(signs: Record<string, number>) {
  const lagna = signs.La;
  const house = (s: number) => ((s - lagna + 12) % 12) + 1;
  const out: Record<string, Record<string, Reason[]>> = {};
  for (const g of GRAHAS) {
    const reasons: Reason[] = [];
    for (let s = 1; s <= 12; s++) if (LORD_FROM_ARIES[s - 1] === g) reasons.push({ kind: 'rules', house: house(s), sign: s });
    reasons.push({ kind: 'occupies', house: house(signs[g]) });
    out[g] = {};
    for (const [area, houses] of AREAS) {
      const hits = reasons
        .filter((r) => houses.includes(r.house))
        .sort((a, b) => a.house - b.house || (a.kind === 'rules' ? -1 : 1));
      if (hits.length) out[g][area] = hits;
    }
  }
  return out;
}

describe('life-area links for every reference birth', () => {
  it.each(births.map((b) => [b.id, b] as const))('%s', (id, b) => {
    const expected = JSON.parse(readFileSync(join(EXPECTED_DIR, `${id}.json`), 'utf8'));
    const jhoraSigns = Object.fromEntries(['La', ...GRAHAS].map((k) => [k, expected.bodies[k].sign as number]));
    const chart = calculateChart({ utc: utcOf(b), lat: b.lat, lng: b.lng });
    const links = lifeAreasForChart(chart);

    // 1. Same as the independent re-derivation from JHora's signs.
    const mine = Object.fromEntries(GRAHAS.map((g) => [g, Object.fromEntries(links[g].map((l) => [l.area, l.reasons]))]));
    expect(mine).toEqual(rederive(jhoraSigns));

    // 2. Agrees with the chart's own houses: each house's lord has "rules" for it (not Rahu/Ketu),
    //    each occupant has "occupies" for it, and nothing else appears.
    const fromHouses = new Set<string>();
    for (const h of chart.houses) {
      fromHouses.add(`${h.lord} rules ${h.house} ${h.sign}`);
      for (const g of h.occupants) fromHouses.add(`${g} occupies ${h.house}`);
    }
    const fromLinks = new Set<string>();
    for (const g of GRAHAS) {
      for (const l of links[g]) {
        expect(l.reasons.length).toBeGreaterThan(0);
        for (const r of l.reasons) fromLinks.add(r.kind === 'rules' ? `${g} rules ${r.house} ${r.sign}` : `${g} occupies ${r.house}`);
      }
      // Areas in the fixed order, at most once each.
      const order = AREAS.map(([a]) => a);
      const idx = links[g].map((l) => order.indexOf(l.area));
      expect(idx).toEqual([...idx].sort((x, y) => x - y));
      expect(new Set(idx).size).toBe(idx.length);
    }
    expect(fromLinks).toEqual(fromHouses);
    expect([...fromLinks].some((s) => /^(Ra|Ke) rules/.test(s))).toBe(false);
  });
});
