// Place index + search tests (step 0.2.11, D-087). They use the committed index
// data/places/index/places.tsv.gz, built from the GeoNames files pinned in data/places/sources.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain JavaScript build script, no type declarations
import { buildIndex, normalize as buildNormalize, readMumbaiIds, readSources } from '../../../data/places/build-index.mjs';
import { isWestBengal, MIN_QUERY_LENGTH, normalize, PlaceIndex, type Place, type SearchResult } from '../src/index.ts';
import { makeFixtureFiles } from './fixture.ts';

const ROOT = join(import.meta.dirname, '../../..');
const INDEX_GZ = join(ROOT, 'data/places/index/places.tsv.gz');
const INDEX_SHA = join(ROOT, 'data/places/index/places.sha256');
const MUMBAI = JSON.parse(readFileSync(join(ROOT, 'data/places/mumbai-no-district.json'), 'utf8')) as {
  area: [number, number][];
  places: { id: number; name: string }[];
};

let text: string;
let idx: PlaceIndex;

beforeAll(() => {
  text = gunzipSync(readFileSync(INDEX_GZ)).toString('utf8');
  idx = new PlaceIndex(text);
});

const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const top = (q: string) => idx.search(q)[0];
const isIanaZone = (z: string) => {
  if (!z) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch { return false; }
};
/** Point-in-polygon (lat, lng) for the Mumbai outline in mumbai-no-district.json. */
const inMumbaiArea = (lat: number, lng: number) => {
  const poly = MUMBAI.area;
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]!;
    const [yj, xj] = poly[j]!;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
/** Place rows of the index text (before the search names), split into fields. */
const placeRows = () => text.slice(0, text.indexOf('\n#K\n')).split('\n').filter((l) => /^\d/.test(l)).map((l) => l.split('\t'));

describe('committed index', () => {
  it('matches its recorded SHA-256 and the pinned sources', () => {
    const recorded = readFileSync(INDEX_SHA, 'utf8').split(/\s+/)[0];
    expect(sha256(text)).toBe(recorded);
    const pinned = JSON.parse(readFileSync(join(ROOT, 'data/places/sources.json'), 'utf8')).files;
    expect(idx.sources).toEqual(pinned.map((f: { name: string; sha256: string }) => ({ name: f.name, sha256: f.sha256 })));
  });

  it('is under 50 MB (no file over 50 MB in git)', () => {
    expect(readFileSync(INDEX_GZ).length).toBeLessThan(50 * 1024 * 1024);
  });

  it('has all Indian populated places, every place type, and the worldwide towns (D-087)', () => {
    let india = 0;
    const codes: Record<string, number> = {};
    idx.forEach((p) => {
      if (p.countryCode !== 'IN') return;
      india++;
      codes[p.featureCode] = (codes[p.featureCode] ?? 0) + 1;
    });
    expect(india).toBe(558_033);
    expect(idx.size).toBe(788_038);
    // Abandoned, destroyed and historical places are kept (D-087).
    expect(codes.PPLQ).toBe(8_969);
    expect(codes.PPLW).toBe(3);
    expect(codes.PPLH).toBe(2);
  });

  it('every Indian place has a valid IANA time zone and valid latitude/longitude', () => {
    const bad: Place[] = [];
    idx.forEach((p) => {
      if (p.countryCode !== 'IN') return;
      const ok = isIanaZone(p.timeZone)
        && Number.isFinite(p.lat) && Number.isFinite(p.lng)
        && p.lat >= 6 && p.lat <= 37.5 && p.lng >= 68 && p.lng <= 98;
      if (!ok) bad.push(p);
    });
    expect(bad).toEqual([]);
  });

  it('every Indian place is on Asia/Kolkata except 3 villages near the Line of Control on Asia/Karachi', () => {
    // Recorded as found (see the report, "disputed areas"); GeoNames' data is kept as it is (D-087).
    const other: string[] = [];
    idx.forEach((p) => {
      if (p.countryCode === 'IN' && p.timeZone !== 'Asia/Kolkata') other.push(`${p.id} ${p.asciiName} ${p.timeZone}`);
    });
    expect(other.sort()).toEqual([
      '12524521 Abbaspur Asia/Karachi',
      '13060542 Pumnuthi Asia/Karachi',
      '13527012 Farward Kahuta Asia/Karachi',
    ]);
  });

  it('every place worldwide has a time zone that the IANA database knows', () => {
    const zones = new Set<string>();
    idx.forEach((p) => zones.add(p.timeZone));
    expect([...zones].filter((z) => !isIanaZone(z))).toEqual([]);
    expect(zones.size).toBe(394);
  });

  it('keeps full GeoNames precision for latitude and longitude', () => {
    const row = placeRows().find((f) => f[0] === '1275339')!;
    expect(row[4]).toBe('19.07283');
    expect(row[5]).toBe('72.88261');
    expect(idx.get(1275339)!.lat).toBe(19.07283);
    expect(idx.get(1275339)!.lng).toBe(72.88261);
  });

  it('get() finds places by GeoNames id', () => {
    expect(idx.get(1265683)!.name).toBe('Kumbakonam');
    expect(idx.get(1)).toBeUndefined();
  });
});

describe('search: old and alternate names find the modern place', () => {
  it.each([
    ['Bombay', 1275339, 'Mumbai'],
    ['Madras', 1264527, 'Chennai'],
    ['Calcutta', 1275004, 'Kolkata'],
    ['Bangalore', 1277333, 'Bengaluru'],
    ['Trivandrum', 1254163, 'Thiruvananthapuram'],
    ['Poona', 1259229, 'Pune'],
  ])('%s → %s', (q, id, name) => {
    const r = top(q)!;
    expect(r.id).toBe(id);
    expect(r.name).toBe(name);
    expect(r.matchedName).toBe(q);
    expect(r.countryCode).toBe('IN');
  });

  it('also works while typing (prefix) and in any case', () => {
    expect(top('bom')!.id).toBe(1275339);
    expect(top('CALCUT')!.id).toBe(1275004);
    expect(top('bangal')!.id).toBe(1277333);
    expect(top('triva')!.id).toBe(1254163);
  });
});

describe('search: labels (FR-IN-04, D-087)', () => {
  it('Kumbakonam → "Kumbakonam, Thanjavur, Tamil Nadu, India"', () => {
    const r = top('Kumbakonam')!;
    expect(r.label).toBe('Kumbakonam, Thanjavur, Tamil Nadu, India');
    expect(r.timeZone).toBe('Asia/Kolkata');
  });

  it('falls back cleanly when the district is missing', () => {
    // GeoNames gives Mumbai itself no district (see the Mumbai tests below).
    expect(top('Mumbai')!.label).toBe('Mumbai, Maharashtra, India');
  });

  it('uses plain ASCII names without accents', () => {
    expect(top('Thane')!.label).toBe('Thane, Maharashtra, India'); // GeoNames name "Thāne"
    expect(top('Thane')!.name).toBe('Thāne');
    expect(top('sao paulo')!.label).toBe('Sao Paulo, Brazil');
    expect(idx.get(1270396)!.label).toBe('Howrah, Haora, West Bengal, India'); // district "Hāora"
  });

  it('every label in the index is plain ASCII', () => {
    const bad: string[] = [];
    idx.forEach((p) => { if (!/^[\x20-\x7e]+$/.test(p.label)) bad.push(`${p.id} ${p.label}`); });
    expect(bad).toEqual([]);
  });

  it('collapses repeats ("Kolkata, Kolkata" → one)', () => {
    expect(top('Kolkata')!.label).toBe('Kolkata, West Bengal, India');
    expect(top('Chennai')!.label).toBe('Chennai, Tamil Nadu, India');
    expect(top('Delhi')!.label).toBe('Delhi, India');
  });

  it('drops the words "District" and "Division"', () => {
    expect(idx.get(1254106)!.admin2).toBe('Malda District');
    expect(idx.get(1254106)!.label).toBe('Tulsihata, Malda, West Bengal, India');
    expect(idx.get(1259229)!.admin2).toBe('Pune Division');
    expect(idx.get(1259229)!.label).toBe('Pune, Maharashtra, India'); // "Pune, Pune" collapsed after dropping "Division"
    let left = 0;
    // Only the district and state parts (a place's own name may contain the word, e.g.
    // "Guinayangan, Fourth District of Quezon" in the Philippines).
    idx.forEach((p) => { if (/\b(District|Division)\b/i.test(p.label.slice(p.asciiName.length))) left++; });
    expect(left).toBe(0);
  });

  it('Aurangabad in Maharashtra and in Bihar are told apart by the label', () => {
    const labels = idx.search('Aurangabad').map((r) => r.label);
    expect(labels[0]).toBe('Aurangabad, Maharashtra, India');
    expect(labels).toContain('Aurangabad, Bihar, India');
  });

  it('text after a comma narrows by district, state or country', () => {
    const r = idx.search('Aurangabad, Bihar');
    expect(r[0]!.id).toBe(1278148);
    expect(r.every((x) => x.admin1 === 'Bihar')).toBe(true);
    expect(idx.search('Madras, United States')[0]!.label).toBe('Madras, Jefferson County, Oregon, United States');
  });
});

/** Was this result an exact match for q, and on which (normalised) name? */
function matchInfo(r: SearchResult, q: string) {
  const names = r.matchedName ? [r.matchedName] : [r.name, r.asciiName];
  const keys = names.map(normalize);
  const exact = keys.includes(q);
  return { exact, key: exact ? q : keys.find((k) => k.startsWith(q))! };
}

/** D-087 order: population (largest first); ties: exact before prefix, then alphabetical. */
function expectOrdered(q: string, results: SearchResult[]) {
  const nq = normalize(q);
  for (let i = 1; i < results.length; i++) {
    const a = results[i - 1]!;
    const b = results[i]!;
    expect(a.population, `${q}: ${a.label} vs ${b.label}`).toBeGreaterThanOrEqual(b.population);
    if (a.population !== b.population) continue;
    const ma = matchInfo(a, nq);
    const mb = matchInfo(b, nq);
    if (ma.exact !== mb.exact) { expect(ma.exact, `${q}: exact first`).toBe(true); continue; }
    if (ma.key !== mb.key) { expect(ma.key < mb.key, `${q}: ${ma.key} before ${mb.key}`).toBe(true); continue; }
    expect(a.label <= b.label, `${q}: ${a.label} before ${b.label}`).toBe(true);
  }
}

describe('search: order (D-087)', () => {
  it('"che" → Chennai before Chegur…', () => {
    const r = idx.search('che', { limit: 100_000 });
    const chennai = r.findIndex((x) => x.id === 1264527);
    const chegur = r.findIndex((x) => x.asciiName.startsWith('Chegur'));
    expect(chennai).toBeGreaterThanOrEqual(0);
    expect(chegur).toBeGreaterThan(chennai);
    expect(idx.search('che').map((x) => x.id)).toContain(1264527); // in the top 10
  });

  it('"triva" → Thiruvananthapuram before the Louisiana town', () => {
    const r = idx.search('triva');
    expect(r[0]!.id).toBe(1254163);
    expect(r.findIndex((x) => x.id === 4320174)).toBeGreaterThan(0);
  });

  it.each(['che', 'triva', 'bom', 'aur', 'ram', 'Andheri', 'Bandra', 'Aurangabad', 'Rampur', 'kod'])(
    '"%s": largest first; ties exact-then-alphabetical',
    (q) => {
      const r = idx.search(q, { limit: 300 });
      expect(r.length).toBeGreaterThan(0);
      expectOrdered(q, r);
    },
  );

  it('ties with no population: exact name before prefix, then alphabetical', () => {
    const r = idx.search('Andheri', { limit: 300 });
    const zero = r.filter((x) => x.population === 0);
    const firstPrefix = zero.findIndex((x) => !matchInfo(x, 'andheri').exact);
    expect(firstPrefix).toBeGreaterThan(0);
    expect(zero.slice(firstPrefix).every((x) => !matchInfo(x, 'andheri').exact)).toBe(true);
    const exactLabels = zero.slice(0, firstPrefix).map((x) => x.label);
    expect(exactLabels).toEqual([...exactLabels].sort());
  });

  it('is deterministic', () => {
    for (const q of ['che', 'ram', 'Andheri']) {
      expect(idx.search(q, { limit: 50 }).map((x) => x.id)).toEqual(idx.search(q, { limit: 50 }).map((x) => x.id));
    }
  });

  it('returns at most 10 results by default', () => {
    expect(idx.search('ram').length).toBe(10);
  });
});

describe('search: matching rules', () => {
  it('starts at 3 characters (fewer → no results)', () => {
    expect(MIN_QUERY_LENGTH).toBe(3);
    expect(idx.search('a')).toEqual([]);
    expect(idx.search('ch')).toEqual([]);
    expect(idx.search('Mu')).toEqual([]);
    expect(idx.search('   ')).toEqual([]);
  });

  it('three characters give results', () => {
    expect(idx.search('che').length).toBe(10);
    expect(idx.search('Che').map((x) => x.id)).toEqual(idx.search('che').map((x) => x.id));
  });

  it('is accent- and case-insensitive', () => {
    expect(idx.search('aurangābād').map((r) => r.id)).toEqual(idx.search('AURANGABAD').map((r) => r.id));
    expect(top('são paulo')!.name).toBe('São Paulo');
  });

  it('can leave out feature codes', () => {
    const all = idx.search('Colaba', { limit: 50 });
    expect(all.some((r) => r.featureCode === 'PPLX')).toBe(true);
    const noX = idx.search('Colaba', { limit: 50, excludeFeatureCodes: ['PPLX'] });
    expect(noX.some((r) => r.featureCode === 'PPLX')).toBe(false);
  });

  it('normalize() matches the build script exactly', () => {
    const rows = placeRows();
    let n = 0;
    for (let i = 0; i < rows.length; i += 97) {
      const f = rows[i]!;
      for (const s of [f[1], f[2], ...(f[3] ?? '').split('|')]) {
        if (!s) continue;
        expect(normalize(s)).toBe(buildNormalize(s));
        n++;
      }
    }
    expect(n).toBeGreaterThan(5000);
  });
});

// D-082 / D-086 / D-087 "Which clock?" rule: West Bengal = admin1 IN.28; Mumbai = district
// Mumbai City IN.16.519 or Mumbai Suburban IN.16.518, or listed in mumbai-no-district.json.
describe('admin codes and helpers for the "Which clock?" rule (D-082, D-086, D-087)', () => {
  it.each([
    [1278633, 'Andheri', '518', 'Mumbai Suburban'],
    [1332494, 'Bandra', '518', 'Mumbai Suburban'],
    [1273862, 'Colāba', '519', 'Mumbai'],
  ])('%i %s is in Maharashtra (16) / district %s (%s)', (id, name, a2, a2name) => {
    const p = idx.get(id)!;
    expect(p.name).toBe(name);
    expect(p.admin1Code).toBe('16');
    expect(p.admin1).toBe('Maharashtra');
    expect(p.admin2Code).toBe(a2);
    expect(p.admin2).toBe(a2name);
  });

  it('GeoNames gives Mumbai itself (1275339) no district, only the state', () => {
    const p = idx.get(1275339)!;
    expect(p.admin1Code).toBe('16');
    expect(p.admin2Code).toBe('');
  });

  it.each([
    [1275004, 'Kolkata', '342', 'Kolkata'],
    [1270396, 'Howrah', '341', 'Haora'],
  ])('%i %s is in West Bengal (28) / district %s (%s)', (id, name, a2, a2name) => {
    const p = idx.get(id)!;
    expect(p.name).toBe(name);
    expect(p.admin1Code).toBe('28');
    expect(p.admin1).toBe('West Bengal');
    expect(p.admin2Code).toBe(a2);
    expect(p.admin2).toBe(a2name);
  });

  it('the index carries exactly the Mumbai list from mumbai-no-district.json', () => {
    expect([...idx.mumbaiExtraIds].sort()).toEqual(MUMBAI.places.map((p) => p.id).sort());
    expect(MUMBAI.places.map((p) => p.id).sort()).toEqual([1264186, 1268447, 1273797, 1275339]);
  });

  it('every listed place is in the index, in Maharashtra, has no district, and lies inside the Mumbai area', () => {
    for (const { id, name } of MUMBAI.places) {
      const p = idx.get(id)!;
      expect(p, String(id)).toBeDefined();
      expect(p.asciiName).toBe(name);
      expect(p.admin1Code).toBe('16');
      expect(p.admin2Code).toBe('');
      expect(inMumbaiArea(p.lat, p.lng), `${name} inside Mumbai`).toBe(true);
    }
  });

  it('the Mumbai area outline is right: it holds the places GeoNames codes as Mumbai and no others', () => {
    const outside: string[] = [];
    const othersInside: string[] = [];
    const notCaught: string[] = [];
    idx.forEach((p) => {
      if (p.countryCode !== 'IN') return;
      const coded = p.admin1Code === '16' && (p.admin2Code === '518' || p.admin2Code === '519');
      const inside = inMumbaiArea(p.lat, p.lng);
      if (coded && !inside) outside.push(`${p.id} ${p.asciiName}`);
      if (!coded && inside && p.admin2Code) othersInside.push(`${p.id} ${p.asciiName} ${p.admin2Code}`);
      if (inside && !idx.isMumbai(p)) notCaught.push(`${p.id} ${p.asciiName}`);
    });
    // Kandivli 1268126 is coded Mumbai Suburban but GeoNames puts it at 17.87 N 73.23 E
    // (about 135 km south). Recorded, not fixed (see the report).
    expect(outside).toEqual(['1268126 Kandivli']);
    expect(othersInside).toEqual([]);
    expect(notCaught).toEqual([]); // the list is complete for the outline
  });

  it.each([
    [1278633, 'Andheri'], [1332494, 'Bandra'], [1273862, 'Colaba'], [1264186, 'Malabar Hill'],
    [1275339, 'Mumbai'], [1268447, 'Kalba Devi'], [1273797, 'Cumballa Hill'],
  ])('isMumbai: %i %s → yes', (id) => {
    expect(idx.isMumbai(idx.get(id)!)).toBe(true);
    expect(isWestBengal(idx.get(id)!)).toBe(false);
  });

  it.each([
    [1254661, 'Thane'], [1271375, 'Ghansoli (Navi Mumbai)'], [1253654, 'Utan'], [1259229, 'Pune'], [1275004, 'Kolkata'],
  ])('isMumbai: %i %s → no', (id) => {
    expect(idx.isMumbai(idx.get(id)!)).toBe(false);
  });

  it('isWestBengal: Kolkata and Howrah yes; Mumbai, Delhi and Dhaka no', () => {
    expect(isWestBengal(idx.get(1275004)!)).toBe(true);
    expect(isWestBengal(idx.get(1270396)!)).toBe(true);
    expect(isWestBengal(idx.get(1275339)!)).toBe(false);
    expect(isWestBengal(top('Delhi')!)).toBe(false);
    expect(isWestBengal(top('Dhaka')!)).toBe(false);
  });
});

describe('build script', () => {
  it('is deterministic: same input → byte-identical index, whatever the row order', () => {
    const sources = [{ name: 'fixture', sha256: '0'.repeat(64) }];
    const a = buildIndex(makeFixtureFiles(false), sources, [1275339]).text;
    const b = buildIndex(makeFixtureFiles(false), sources, [1275339]).text;
    const c = buildIndex(makeFixtureFiles(true), sources, [1275339]).text;
    expect(b).toBe(a);
    expect(c).toBe(a);
    const fixtureIdx = new PlaceIndex(a);
    expect(fixtureIdx.search('Bombay')[0]!.label).toBe('Mumbai, Maharashtra, India');
    expect(fixtureIdx.search('Paris')[0]!.label).toBe('Paris, Ile-de-France, France');
    expect(fixtureIdx.search('Colaba')[0]!.label).toBe('Colaba, Mumbai, Maharashtra, India');
    expect(fixtureIdx.size).toBe(3); // the Indian cities500 row and the non-P row are not added
    expect(fixtureIdx.isMumbai(fixtureIdx.get(1275339)!)).toBe(true);
    expect(fixtureIdx.isMumbai(fixtureIdx.get(2988507)!)).toBe(false);
  });

  // Full rebuild from the real downloads. Runs only when GEONAMES_DIR points at them
  // (the raw files are not in git: see the GitHub Release in data/places/README.md);
  // CI checks the committed index's SHA-256 instead.
  const dir = process.env.GEONAMES_DIR;
  it.runIf(dir && existsSync(dir))('rebuilding from the pinned GeoNames files gives the committed index', () => {
    const { files, sources } = readSources(dir!);
    const { text: rebuilt } = buildIndex(files, sources, readMumbaiIds());
    expect(sha256(rebuilt)).toBe(sha256(text));
  });
});
