// Builds Jathag's place index from the official GeoNames dumps (step 0.2.11).
//
// Run from the repo root:
//   pnpm places:build <folder with the GeoNames downloads>
//
// The folder must hold the five files listed in data/places/sources.json, exactly as
// downloaded from https://download.geonames.org/export/dump/. Their SHA-256 checksums
// must match sources.json, otherwise the build stops (so the index is always rebuilt
// from the same pinned data). Output: data/places/index/places.tsv.gz
//
// Plain Node, no dependencies. The same input files always give a byte-identical
// places.tsv (the uncompressed text); see data/places/README.md for the format.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, inflateRawSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SOURCES_FILE = join(HERE, 'sources.json');
export const OUT_DIR = join(HERE, 'index');
export const FORMAT_VERSION = 1;

// ---------------------------------------------------------------- small helpers

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Reads one file out of a .zip (the GeoNames zips use "deflate" or "stored"). */
export function readZipEntry(zip, entryName) {
  // Find the "end of central directory" record (signature 0x06054b50) near the end.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad zip central directory');
    const method = zip.readUInt16LE(p + 10);
    const compSize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === entryName) {
      const lNameLen = zip.readUInt16LE(localOffset + 26);
      const lExtraLen = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = zip.subarray(start, start + compSize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`Unsupported zip method ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${entryName} not found in zip`);
}

/** Search key: accents removed, lower case, anything that is not a letter/digit → one space. */
export function normalize(s) {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ø/g, 'o')
    .replace(/đ/g, 'd').replace(/ł/g, 'l').replace(/þ/g, 'th').replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const LATIN_ONLY = /^[\p{Script=Latin}\p{M}\d\s'’.,()&-]+$/u;
const CODE_LIKE = /^[A-Z0-9]{2,4}$/; // airport codes such as BOM, MAA, IXU

/**
 * Which GeoNames alternate names we keep (size matters, see the report):
 *  - Latin script only (people type place names in English letters on the site);
 *  - starting with a capital letter (drops lower-case machine transliterations such as "bmbyy");
 *  - not a 2–4 letter code (airport/IATA codes);
 *  - no " - " (Wikipedia-style "Name - transliteration" pairs);
 *  - at most 60 characters;
 *  - and only if the search key differs from the name, the ASCII name and every name kept so far.
 */
export function selectAltNames(altField, name, ascii) {
  if (!altField) return [];
  const seen = new Set([normalize(name), normalize(ascii)]);
  const kept = [];
  for (const raw of altField.split(',')) {
    const alt = raw.trim();
    if (!alt || alt.length > 60) continue;
    if (!LATIN_ONLY.test(alt)) continue;
    if (!/^\p{Lu}/u.test(alt)) continue;
    if (CODE_LIKE.test(alt)) continue;
    if (alt.includes(' - ')) continue;
    if (alt.includes('|') || alt.includes('\t')) continue;
    const key = normalize(alt);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(alt);
  }
  return kept;
}

function lines(buf) {
  const text = buf.toString('utf8');
  return text.split('\n').filter((l) => l.length > 0);
}

const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------- build

/**
 * Builds the index text from the five source buffers.
 * @param {{ 'IN.zip': Buffer, 'cities500.zip': Buffer, 'admin1CodesASCII.txt': Buffer,
 *           'admin2Codes.txt': Buffer, 'countryInfo.txt': Buffer }} files
 * @param {{ name: string, sha256: string }[]} sources  recorded in the header
 * @returns {{ text: string, stats: object }}
 */
export function buildIndex(files, sources) {
  // Look-up tables
  const countries = new Map();
  for (const l of lines(files['countryInfo.txt'])) {
    if (l.startsWith('#')) continue;
    const f = l.split('\t');
    countries.set(f[0], f[4]);
  }
  const admin1 = new Map();
  for (const l of lines(files['admin1CodesASCII.txt'])) {
    const f = l.split('\t');
    admin1.set(f[0], [f[1], f[2]]);
  }
  const admin2 = new Map();
  for (const l of lines(files['admin2Codes.txt'])) {
    const f = l.split('\t');
    admin2.set(f[0], [f[1], f[2]]);
  }

  // Places: all class-P rows of IN.txt, plus every non-Indian row of cities500.txt.
  const rows = new Map(); // geonameid → fields
  const stats = {
    indiaByFeatureCode: {}, india: 0, world: 0, worldByFeatureCode: {},
    indiaWithAdmin2: 0, indiaInCities500NotInIN: 0, noTimeZone: 0, altNamesKept: 0,
  };

  const inText = readZipEntry(files['IN.zip'], 'IN.txt');
  for (const l of lines(inText)) {
    const f = l.split('\t');
    if (f[6] !== 'P') continue;
    rows.set(Number(f[0]), f);
    stats.india++;
    stats.indiaByFeatureCode[f[7]] = (stats.indiaByFeatureCode[f[7]] ?? 0) + 1;
    if (f[11]) stats.indiaWithAdmin2++;
  }
  const c500 = readZipEntry(files['cities500.zip'], 'cities500.txt');
  for (const l of lines(c500)) {
    const f = l.split('\t');
    if (f[8] === 'IN') {
      if (!rows.has(Number(f[0]))) stats.indiaInCities500NotInIN++;
      continue; // India comes from IN.txt (complete), not from cities500
    }
    rows.set(Number(f[0]), f);
    stats.world++;
    stats.worldByFeatureCode[f[7]] = (stats.worldByFeatureCode[f[7]] ?? 0) + 1;
  }

  // Sort everything so the output never depends on input order.
  const ids = [...rows.keys()].sort((a, b) => a - b);
  const zones = new Set();
  const usedC = new Set(); const usedA1 = new Set(); const usedA2 = new Set();
  for (const id of ids) {
    const f = rows.get(id);
    if (f[17]) zones.add(f[17]); else stats.noTimeZone++;
    usedC.add(f[8]);
    if (f[10]) usedA1.add(`${f[8]}.${f[10]}`);
    if (f[10] && f[11]) usedA2.add(`${f[8]}.${f[10]}.${f[11]}`);
  }
  const zoneList = [...zones].sort(byCode);
  const zoneIdx = new Map(zoneList.map((z, i) => [z, i]));

  const out = [];
  out.push(`JATHAG-PLACES\t${FORMAT_VERSION}`);
  for (const s of sources) out.push(`#S\t${s.name}\t${s.sha256}`);
  for (const [i, z] of zoneList.entries()) out.push(`#Z\t${i}\t${z}`);
  for (const c of [...usedC].sort(byCode)) out.push(`#C\t${c}\t${countries.get(c) ?? ''}`);
  for (const k of [...usedA1].sort(byCode)) {
    const v = admin1.get(k);
    if (v) out.push(`#1\t${k}\t${v[0]}\t${v[1]}`);
  }
  for (const k of [...usedA2].sort(byCode)) {
    const v = admin2.get(k);
    if (v) out.push(`#2\t${k}\t${v[0]}\t${v[1]}`);
  }
  for (const id of ids) {
    const f = rows.get(id);
    const [, name, ascii, alt, lat, lon, , fcode, cc, , a1, a2, , , pop, , , tz] = f;
    const alts = selectAltNames(alt, name, ascii);
    stats.altNamesKept += alts.length;
    out.push([
      id, name, ascii === name ? '' : ascii, alts.join('|'), lat, lon, cc, a1, a1 ? a2 : '',
      pop === '0' ? '' : pop, fcode, tz ? zoneIdx.get(tz) : '',
    ].join('\t'));
  }
  stats.total = ids.length;
  stats.zones = zoneList.length;
  return { text: `${out.join('\n')}\n`, stats };
}

// ---------------------------------------------------------------- command line

export function readSources(dir) {
  const pinned = JSON.parse(readFileSync(SOURCES_FILE, 'utf8'));
  const files = {};
  for (const s of pinned.files) {
    const buf = readFileSync(join(dir, s.name));
    const got = sha256(buf);
    if (got !== s.sha256) {
      throw new Error(`${s.name}: SHA-256 is ${got}, expected ${s.sha256} (sources.json). Wrong download date?`);
    }
    files[s.name] = buf;
  }
  return { files, sources: pinned.files };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: pnpm places:build <folder with the GeoNames downloads>');
    process.exit(1);
  }
  const t0 = Date.now();
  const { files, sources } = readSources(dir);
  const { text, stats } = buildIndex(files, sources);
  mkdirSync(OUT_DIR, { recursive: true });
  const raw = Buffer.from(text, 'utf8');
  const gz = gzipSync(raw, { level: 9 });
  writeFileSync(join(OUT_DIR, 'places.tsv.gz'), gz);
  writeFileSync(join(OUT_DIR, 'places.sha256'), `${sha256(raw)}  places.tsv\n`);
  console.log(JSON.stringify({ ...stats, rawBytes: raw.length, gzipBytes: gz.length, sha256: sha256(raw), ms: Date.now() - t0 }, null, 2));
}
