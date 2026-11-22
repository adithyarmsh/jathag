// Step 0.3.1 report numbers (run: node notes/0.3.1-dasha-report.ts). Read-only; prints Markdown tables.
//
// 1. Engine vs JHora for dasha times. JHora prints antardasha starts as dates only, so for every
//    birth we also rebuild JHora's exact times from JHora's OWN Moon longitude (expected/RNN.json) with
//    the same Vimshottari rule. For R01, R09, R10, R15, R22 (JHora's pratyantardasha files, with times
//    to the second) these rebuilt times are checked against the printed ones.
// 2. D-097 research: which clock JHora prints its dasha dates on.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateChart, vimshottariForChart, vimshottariTimeline } from '../packages/engine/src/index.ts';
// @ts-expect-error plain .mjs helper
import { loadBirths, EXPECTED_DIR } from '../tests/reference/scripts/parse.mjs';

type Birth = { id: string; date: string; time: string; utc_offset: number; iana: string | null; lat: number; lng: number; place: string };
const births: Birth[] = loadBirths();
const exp = (id: string) => JSON.parse(readFileSync(join(EXPECTED_DIR, `${id}.json`), 'utf8'));

function utcOf(b: Birth) {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [h, mi, s = 0] = b.time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - Math.round(b.utc_offset * 3600) * 1000).toISOString().replace('.000Z', 'Z');
}
const antar = (t: ReturnType<typeof vimshottariTimeline>) => t.mahadashas.flatMap((m) => m.antardashas);
const prat = (t: ReturnType<typeof vimshottariTimeline>) => antar(t).flatMap((a) => a.pratyantardashas);
const fixedDate = (iso: string, offMin: number) => new Date(Date.parse(iso) + offMin * 60000).toISOString().slice(0, 10);
const zoneDate = (iso: string, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const fmtMin = (ms: number) => `${(ms / 60000).toFixed(1)} min`;
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// ------------------------------------------------------------- 1. differences
const rows: { id: string; pre1900: boolean; ad: number[]; pd: number[]; dayOff: number; dayOffList: string[] }[] = [];
let rebuiltCheckMax = 0;
for (const b of births) {
  const e = exp(b.id);
  const utc = utcOf(b);
  const ours = vimshottariForChart(calculateChart({ utc, lat: b.lat, lng: b.lng }));
  const jhora = vimshottariTimeline({ moonLon: e.bodies.Mo.lonArcsec / 3600, birthUtc: utc, dashaYear: '365.25' });
  const oa = antar(ours), ja = antar(jhora);
  const ad = oa.map((a, i) => Date.parse(a.start) - Date.parse(ja[i].start));
  const printed = e.vimshottari.flatMap((m: { antardashas: { startDate: string }[] }) => m.antardashas.map((a) => a.startDate));
  const dayOffList: string[] = [];
  oa.forEach((a, i) => { if (fixedDate(a.start, e.jhoraClockUtcOffsetMinutes) !== printed[i]) dayOffList.push(`${a.lord}@${printed[i]}`); });
  let pd: number[] = [];
  if (e.pratyantardashas) {
    const op = prat(ours), jp = prat(jhora);
    for (const block of e.pratyantardashas) {
      const i = ours.mahadashas.findIndex((m) => m.lord === block.mahadasha.lord);
      const j = ours.mahadashas[i].antardashas.findIndex((a) => a.lord === block.antardasha.lord);
      block.pratyantardashas.forEach((p: { start: { utc: string }; end: { utc: string } }, k: number) => {
        const idx = i * 81 + j * 9 + k;
        pd.push(Date.parse(op[idx].start) - Date.parse(p.start.utc), Date.parse(op[idx].end) - Date.parse(p.end.utc));
        rebuiltCheckMax = Math.max(rebuiltCheckMax, Math.abs(Date.parse(jp[idx].start) - Date.parse(p.start.utc)), Math.abs(Date.parse(jp[idx].end) - Date.parse(p.end.utc)));
      });
    }
  }
  rows.push({ id: b.id, pre1900: b.date < '1900-01-01', ad, pd, dayOff: dayOffList.length, dayOffList });
}

console.log('## 1. Engine minus JHora\n');
console.log(`Check of the method: JHora's printed pratyantardasha times vs times rebuilt from JHora's Moon: max ${(rebuiltCheckMax / 1000).toFixed(0)} s.\n`);
console.log('| Birth | Antardasha starts: largest difference | typical (median) | Pratyantar start/end: largest difference | AD dates one day apart (before tolerance) |');
console.log('|---|---|---|---|---|');
for (const r of rows) {
  const max = Math.max(...r.ad.map(Math.abs));
  console.log(`| ${r.id}${r.pre1900 ? ' (pre-1900)' : ''} | ${fmtMin(max)} | ${fmtMin(median(r.ad))} | ${r.pd.length ? fmtMin(Math.max(...r.pd.map(Math.abs))) : '—'} | ${r.dayOff}${r.dayOff ? ` (${r.dayOffList.join(', ')})` : ''} |`);
}
for (const [label, sel] of [['from 1900', (r: (typeof rows)[0]) => !r.pre1900], ['before 1900', (r: (typeof rows)[0]) => r.pre1900]] as const) {
  const ad = rows.filter(sel).flatMap((r) => r.ad);
  const pd = rows.filter(sel).flatMap((r) => r.pd);
  console.log(`\nSummary ${label}: antardasha starts max ${fmtMin(Math.max(...ad.map(Math.abs)))}, median of the size ${fmtMin(median(ad.map(Math.abs)))}` +
    (pd.length ? `; pratyantar max ${fmtMin(Math.max(...pd.map(Math.abs)))}, median of the size ${fmtMin(median(pd.map(Math.abs)))} (${pd.length} times)` : ''));
}
console.log(`\nAntardasha dates one day apart from JHora before the tolerance: ${rows.reduce((n, r) => n + r.dayOff, 0)} of ${rows.length * 81}.`);

// ------------------------------------------------------------- 2. D-097
// (b) uses the place's IANA zone; R27–R29 have none in births.json (fixed historical clocks), so the
// place's zone today (Asia/Kolkata) is used; R26 likewise uses America/New_York for New Haven.
const D097: Record<string, string> = {
  R06: 'Asia/Kolkata', R16: 'America/New_York', R17: 'Europe/London', R18: 'Australia/Sydney', R22: 'Asia/Kolkata',
  R27: 'Asia/Kolkata', R28: 'Asia/Kolkata', R29: 'Asia/Kolkata',
  // extra rows, not asked for: other births whose offset changes during life
  R19: 'Europe/Oslo', R20: 'Asia/Singapore', R26: 'America/New_York',
};
console.log('\n## 2. D-097: which clock are JHora\'s dasha dates on? (81 antardasha starts each)\n');
console.log('Engine times = Jathag\'s own times. JHora times = rebuilt from JHora\'s own Moon (removes the known 10–30 min offset, D-079).\n');
console.log('| Birth | Offset at birth (JHora) | Zone for (b) | (a) fixed offset, engine times | (b) IANA offset on each date, engine times | (a) JHora times | (b) JHora times | dates where (a) and (b) differ |');
console.log('|---|---|---|---|---|---|---|---|');
for (const [id, tz] of Object.entries(D097)) {
  const b = births.find((x) => x.id === id)!;
  const e = exp(id);
  const oa = antar(vimshottariForChart(calculateChart({ utc: utcOf(b), lat: b.lat, lng: b.lng })));
  const printed: string[] = e.vimshottari.flatMap((m: { antardashas: { startDate: string }[] }) => m.antardashas.map((a) => a.startDate));
  const ja = antar(vimshottariTimeline({ moonLon: e.bodies.Mo.lonArcsec / 3600, birthUtc: utcOf(b), dashaYear: '365.25' }));
  let a = 0, z = 0, ja2 = 0, jz = 0, differ = 0;
  oa.forEach((p, i) => {
    const fa = fixedDate(p.start, e.jhoraClockUtcOffsetMinutes);
    const fb = zoneDate(p.start, tz);
    if (fa === printed[i]) a++;
    if (fb === printed[i]) z++;
    if (fixedDate(ja[i].start, e.jhoraClockUtcOffsetMinutes) === printed[i]) ja2++;
    if (zoneDate(ja[i].start, tz) === printed[i]) jz++;
    if (fixedDate(ja[i].start, e.jhoraClockUtcOffsetMinutes) !== zoneDate(ja[i].start, tz)) differ++;
  });
  const off = e.jhoraClockUtcOffsetMinutes;
  const sign = off < 0 ? '−' : '+';
  console.log(`| ${id} | UTC${sign}${Math.floor(Math.abs(off) / 60)}:${String(Math.abs(off) % 60).padStart(2, '0')} | ${tz}${b.iana ? '' : ' *'} | ${a}/81 | ${z}/81 | ${ja2}/81 | ${jz}/81 | ${differ} |`);
}
console.log('\n* births.json has no IANA zone for this birth (fixed historical clock / fixed offset); the place\'s zone is used for (b).');
