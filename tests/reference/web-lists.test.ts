// The website's step 0.3.7 lists (D-113) for all 29 reference births, built from the real chart API
// response (like web-table.test.ts for the planet table). JHora has no answer key for these screens; this
// checks that every birth goes through every builder without errors, that every visible Mahadasha date
// is the API's UTC start/end shifted by the birth clock offset (D-098), that periods that ended before
// birth are never shown, that the current period is marked at each level, and that every lord's life
// areas are shown. Dates are re-derived here independently of apps/web/lib/date-format.ts.

import { describe, expect, it } from 'vitest';
import { calculateChartResponse, type ChartResponse } from '@jathag/api';
import { GRAHAS } from '@jathag/engine';
import { loadBirths } from './scripts/parse.mjs';
import { listContext, activatesText } from '../../apps/web/lib/list-context.ts';
import { antardashaRows, dashaNow, mahadashaRows, pratyantardashaRows } from '../../apps/web/lib/dasha-view.ts';
import { positionRows, sadeSatiPeriodViews, sadeSatiStatus, signChangeGroups } from '../../apps/web/lib/transit-view.ts';
import { lifeAreaViews } from '../../apps/web/lib/life-area-view.ts';
import en from '../../apps/web/messages/en.json';

type Birth = { id: string; date: string; time: string; utc_offset: number; lat: number; lng: number };
const births: Birth[] = loadBirths();
const AS_OF = '2026-11-22T06:00:00Z';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function responseFor(b: Birth, asOf = AS_OF): ChartResponse {
  const utcOffsetSeconds = Math.round(b.utc_offset * 3600);
  return calculateChartResponse({ date: b.date, time: b.time, manual: { lat: b.lat, lng: b.lng, utcOffsetSeconds } }, { asOf });
}

/** Independent date shift: UTC + offset, then the ISO calendar date, written as "14 Aug 2031". */
function shifted(utc: string, offsetSeconds: number): string {
  const [y, m, d] = new Date(Date.parse(utc) + offsetSeconds * 1000).toISOString().slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m! - 1]} ${y}`;
}

/** Every string inside a view model (what reaches the page). */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

const LEVELS = ['mahadasha', 'antardasha', 'pratyantardasha'] as const;

describe('lists on the site for every reference birth (fixed asOf)', () => {
  it('covers 29 births', () => expect(births).toHaveLength(29));

  it.each(births.map((b) => [b.id, b] as const))('%s', (_id, b) => {
    const res = responseFor(b);
    const ctx = listContext(res, en);
    const off = res.clock.utcOffsetSeconds;
    const tl = res.dashas.vimshottari;

    // Mahadashas: 9 minus those that ended before birth; dates = API UTC shifted by the birth offset
    const mahas = mahadashaRows(ctx);
    expect(mahas).toHaveLength(9 - tl.mahadashas.filter((m) => m.endedBeforeBirth).length);
    for (const r of mahas) {
      const m = tl.mahadashas[r.path[0]!]!;
      expect(m.endedBeforeBirth).toBe(false);
      expect(r.start).toBe(shifted(m.start, off));
      expect(r.end).toBe(shifted(m.end, off));
      expect(r.beganBeforeBirth).toBe(m.containsBirth && m.start < tl.birthUtc);
    }
    expect(mahas[0]!.beganBeforeBirth).toBe(true); // the true start of the Mahadasha running at birth

    // Every level: nothing ended before birth is shown, at most one "You are here" per level
    let current = { mahadasha: 0, antardasha: 0, pratyantardasha: 0 };
    for (const r of mahas) {
      if (r.current) current.mahadasha++;
      for (const a of antardashaRows(ctx, r.path[0]!)) {
        expect(tl.mahadashas[a.path[0]!]!.antardashas[a.path[1]!]!.endedBeforeBirth).toBe(false);
        if (a.current) current.antardasha++;
        for (const p of pratyantardashaRows(ctx, a.path[0]!, a.path[1]!)) {
          expect(tl.mahadashas[p.path[0]!]!.antardashas[p.path[1]!]!.pratyantardashas[p.path[2]!]!.endedBeforeBirth).toBe(false);
          expect(p.start).toBe(shifted(p.startUtc, off));
          if (p.current) current.pratyantardasha++;
        }
      }
    }
    for (const level of LEVELS) expect(current[level]).toBe(res.dashas.current[level] ? 1 : 0);

    // Right now: running, or (old births) the 120-year cycle has ended
    const now = dashaNow(ctx);
    if (res.dashas.current.mahadasha) {
      expect(now.state).toBe('running');
      expect(now.current.map((c) => c.row.path)).toEqual(LEVELS.map((l) => res.dashas.current[l]!.path));
      expect(now.next.map((n) => n.row.path)).toEqual(LEVELS.filter((l) => res.dashas.next[l]).map((l) => res.dashas.next[l]!.path));
    } else {
      expect(now.state).toBe('cycleEnded');
      expect(now.next).toEqual([]);
    }

    // Life areas: every lord's links are shown under each of its areas
    const views = lifeAreaViews(ctx);
    expect(views).toHaveLength(10);
    for (const g of GRAHAS) {
      expect(activatesText(g, ctx)).toMatch(/^Activates: /);
      for (const link of res.lifeAreas[g]) {
        const shown = views.find((v) => v.area === link.area)!.planets.find((p) => p.code === g);
        expect(shown, `${g} ${link.area}`).toBeDefined();
        expect(shown!.reasons.split(', ')).toHaveLength(link.reasons.length);
      }
    }
    expect(views.find((v) => v.area === 'health')!.note).toBe(en.lists.lifeAreas.healthNote);

    // Transits and Sade Sati
    expect(positionRows(ctx)).toHaveLength(9);
    const groups = signChangeGroups(ctx);
    for (const g of groups) {
      expect(g.rows).toHaveLength(res.transits.signChanges[g.planet].length);
      res.transits.signChanges[g.planet].forEach((c, i) => expect(g.rows[i]!.date).toBe(shifted(c.utc, off)));
    }
    for (const g of groups.filter((x) => x.planet === 'Ra' || x.planet === 'Ke')) {
      for (const r of g.rows) expect(r.text).toMatch(/^Enters [A-Z][a-z]+$/);
    }
    const periods = sadeSatiPeriodViews(ctx);
    expect(periods).toHaveLength(res.transits.sadeSati.periods.length);
    expect(periods.filter((p) => p.current)).toHaveLength(res.transits.sadeSati.status.current ? 1 : 0);
    const status = sadeSatiStatus(ctx);
    for (const text of strings({ periods, status, groups, now, views, mahas })) expect(text).not.toMatch(/null|undefined|NaN|Invalid|\{\w+\}/);
  });

  it('a birth after the calculation moment (R01 asked about from 1990): no current period, next starts, no error', () => {
    const res = responseFor(births.find((b) => b.id === 'R01')!, '1990-01-01T00:00:00Z');
    const ctx = listContext(res, en);
    const now = dashaNow(ctx);
    expect(now.state).toBe('notBorn');
    expect(now.message).toBe('The timeline starts at birth (14 Aug 1992). No period is running yet.');
    expect(now.current).toEqual([]);
    expect(now.next.length).toBeGreaterThan(0);
    for (const n of now.next) expect(n.row.startUtc > '1990-01-01').toBe(true);
    expect(mahadashaRows(ctx).some((r) => r.current)).toBe(false);
  });

  it('Saturn 2022–2023 for R01 reads enters / moves back into / enters again (D-099 item 3)', () => {
    const ctx = listContext(responseFor(births.find((b) => b.id === 'R01')!, '2022-03-01T00:00:00Z'), en);
    const sa = signChangeGroups(ctx).find((g) => g.planet === 'Sa')!;
    const want = ['29 Apr 2022 Enters Aquarius', '12 Jul 2022 Moves back into Capricorn', '17 Jan 2023 Enters Aquarius again'];
    const got = sa.rows.map((r) => `${r.date} ${r.text}`);
    expect(got.filter((x) => want.includes(x))).toEqual(want);
  });
});
