// Place index + search tests (step 0.2.11). They use the committed index
// data/places/index/places.tsv.gz, built from the GeoNames files pinned in data/places/sources.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain JavaScript build script, no type declarations
import { buildIndex, normalize as buildNormalize, readSources } from '../../../data/places/build-index.mjs';
import { normalize, PlaceIndex, type Place } from '../src/index.ts';
import { makeFixtureFiles } from './fixture.ts';

const ROOT = join(import.meta.dirname, '../../..');
const INDEX_GZ = join(ROOT, 'data/places/index/places.tsv.gz');
const INDEX_SHA = join(ROOT, 'data/places/index/places.sha256');

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

describe('committed index', () => {
  it('matches its recorded SHA-256 and the pinned sources', () => {
    const recorded = readFileSync(INDEX_SHA, 'utf8').split(/\s+/)[0];
    expect(sha256(text)).toBe(recorded);
    const pinned = JSON.parse(readFileSync(join(ROOT, 'data/places/sources.json'), 'utf8')).files;
    expect(idx.sources).toEqual(pinned.map((f: { name: string; sha256: string }) => ({ name: f.name, sha256: f.sha256 })));
  });

  it('has all Indian populated places and the worldwide towns', () => {
    let india = 0;
    idx.forEach((p) => { if (p.countryCode === 'IN') india++; });
    expect(india).toBe(558_033);
    expect(idx.size).toBe(788_038);
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
    // Recorded as found (see the report, "disputed areas"); not changed.
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
    const line = text.split('\n').find((l) => l.startsWith('1275339\t'))!;
    const [, , , , lat, lng] = line.split('\t');
    expect(idx.get(1275339)!.lat).toBe(Number(lat));
    expect(idx.get(1275339)!.lng).toBe(Number(lng));
    expect(lat).toBe('19.07283');
    expect(lng).toBe('72.88261');
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
    // ("bomba" and "banga" are themselves place names, so they rightly come first as exact matches.)
    expect(top('bomb')!.id).toBe(1275339);
    expect(top('CALCUT')!.id).toBe(1275004);
    expect(top('bangal')!.id).toBe(1277333);
  });
});

describe('search: labels', () => {
  it('Kumbakonam → "Kumbakonam, Thanjavur, Tamil Nadu, India"', () => {
    const r = top('Kumbakonam')!;
    expect(r.label).toBe('Kumbakonam, Thanjavur, Tamil Nadu, India');
    expect(r.timeZone).toBe('Asia/Kolkata');
  });

  it('falls back cleanly when the district is missing', () => {
    // GeoNames gives Mumbai itself no district (see the D-082 tests below).
    expect(top('Mumbai')!.label).toBe('Mumbai, Maharashtra, India');
  });

  it('Aurangabad in Maharashtra and in Bihar are told apart by the label', () => {
    const labels = idx.search('Aurangabad').map((r) => r.label);
    expect(labels[0]).toBe('Aurangabad, Aurangabad, Maharashtra, India');
    expect(labels[1]).toBe('Aurangābād, Aurangābād, Bihar, India');
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('text after a comma narrows by district, state or country', () => {
    const r = idx.search('Aurangabad, Bihar');
    expect(r[0]!.id).toBe(1278148);
    expect(r.every((x) => x.admin1 === 'Bihar')).toBe(true);
    expect(idx.search('Madras, United States')[0]!.label).toBe('Madras, Jefferson County, Oregon, United States');
  });
});

describe('search: matching rules', () => {
  it('is accent- and case-insensitive', () => {
    expect(idx.search('aurangābād').map((r) => r.id)).toEqual(idx.search('AURANGABAD').map((r) => r.id));
    expect(top('sao paulo')!.name).toBe('São Paulo');
  });

  it('returns at most 10 results by default, exact matches first, bigger places first', () => {
    const r = idx.search('Thane');
    expect(r.length).toBe(10);
    expect(r[0]!.id).toBe(1254661); // Thāne city
    const firstPrefixOnly = r.findIndex((x) => normalize(x.name) !== 'thane' && normalize(x.asciiName) !== 'thane' && !x.matchedName);
    if (firstPrefixOnly >= 0) {
      expect(r.slice(firstPrefixOnly).every((x) => normalize(x.name) !== 'thane')).toBe(true);
    }
  });

  it('needs at least 2 characters', () => {
    expect(idx.search('a')).toEqual([]);
    expect(idx.search('  ')).toEqual([]);
  });

  it('can leave out feature codes (e.g. abandoned places)', () => {
    const all = idx.search('Colaba', { limit: 50 });
    expect(all.some((r) => r.featureCode === 'PPLX')).toBe(true);
    const noX = idx.search('Colaba', { limit: 50, excludeFeatureCodes: ['PPLX'] });
    expect(noX.some((r) => r.featureCode === 'PPLX')).toBe(false);
  });

  it('normalize() matches the build script exactly', () => {
    const lines = text.split('\n');
    let n = 0;
    for (let i = 1; i < lines.length; i += 97) {
      const f = lines[i]!.split('\t');
      for (const s of [f[1], f[2], ...(f[3] ?? '').split('|')]) {
        if (!s) continue;
        expect(normalize(s)).toBe(buildNormalize(s));
        n++;
      }
    }
    expect(n).toBeGreaterThan(5000);
  });
});

// D-082 / D-086 "Which clock?" rule needs: West Bengal = admin1 IN.28; Mumbai City = IN.16.519
// ("Mumbai" in admin2Codes.txt); Mumbai Suburban = IN.16.518.
describe('admin codes for the "Which clock?" rule (D-082, D-086)', () => {
  it.each([
    [1278633, 'Andheri', '16', '518', 'Mumbai Suburban'],
    [1332494, 'Bandra', '16', '518', 'Mumbai Suburban'],
    [1273862, 'Colāba', '16', '519', 'Mumbai'],
  ])('%i %s is in Maharashtra (%s) / district %s (%s)', (id, name, a1, a2, a2name) => {
    const p = idx.get(id)!;
    expect(p.name).toBe(name);
    expect(p.admin1Code).toBe(a1);
    expect(p.admin1).toBe('Maharashtra');
    expect(p.admin2Code).toBe(a2);
    expect(p.admin2).toBe(a2name);
  });

  it('KNOWN GAP: GeoNames gives Mumbai itself (1275339) no district, only the state', () => {
    // Recorded, not fixed: the 0.2.12 rule must not rely on admin2 alone (see the 0.2.11 report).
    const p = idx.get(1275339)!;
    expect(p.admin1Code).toBe('16');
    expect(p.admin2Code).toBe('');
  });

  it.each([
    [1275004, 'Kolkata', '342', 'Kolkata'],
    [1270396, 'Howrah', '341', 'Hāora'],
  ])('%i %s is in West Bengal (28) / district %s (%s)', (id, name, a2, a2name) => {
    const p = idx.get(id)!;
    expect(p.name).toBe(name);
    expect(p.admin1Code).toBe('28');
    expect(p.admin1).toBe('West Bengal');
    expect(p.admin2Code).toBe(a2);
    expect(p.admin2).toBe(a2name);
  });
});

describe('build script', () => {
  it('is deterministic: same input → byte-identical index, whatever the row order', () => {
    const sources = [{ name: 'fixture', sha256: '0'.repeat(64) }];
    const a = buildIndex(makeFixtureFiles(false), sources).text;
    const b = buildIndex(makeFixtureFiles(false), sources).text;
    const c = buildIndex(makeFixtureFiles(true), sources).text;
    expect(b).toBe(a);
    expect(c).toBe(a);
    const fixtureIdx = new PlaceIndex(a);
    expect(fixtureIdx.search('Bombay')[0]!.label).toBe('Mumbai, Maharashtra, India');
    expect(fixtureIdx.search('Paris')[0]!.label).toBe('Paris, Paris, Île-de-France, France');
    expect(fixtureIdx.size).toBe(3); // the Indian cities500 row and the non-P row are not added
  });

  // Full rebuild from the real downloads. Runs only when GEONAMES_DIR points at them
  // (the raw files are not in git); CI checks the committed index's SHA-256 instead.
  const dir = process.env.GEONAMES_DIR;
  it.runIf(dir && existsSync(dir))('rebuilding from the pinned GeoNames files gives the committed index', () => {
    const { files, sources } = readSources(dir!);
    const { text: rebuilt } = buildIndex(files, sources);
    expect(sha256(rebuilt)).toBe(sha256(text));
  });
});
