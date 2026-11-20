// Ephemeris adapter safety (D-069): pinned data files, no silent Moshier fallback, one adapter only.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculateChart, createSwephAdapter, DEFAULT_EPHE_PATH, EphemerisError } from '../src/index.ts';

// Astrodienst's official files (github.com/aloistr/swisseph, ephe/), downloaded in step 0.2.8.
// The same values are in ephe/SHA256SUMS (for `shasum -a 256 -c SHA256SUMS`).
// If one of these changes on purpose, update both places AND re-run the reference tests.
const PINNED: Record<string, { sha256: string; bytes: number }> = {
  'sepl_18.se1': { sha256: 'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66', bytes: 484_061 },
  'semo_18.se1': { sha256: '1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7', bytes: 1_304_771 },
};

const R01 = { utc: '1992-08-14T01:15:00Z', lat: 13.083333, lng: 80.283333 };

describe('ephemeris data files', () => {
  it.each(Object.keys(PINNED))('%s is present and unchanged', (name) => {
    const buf = readFileSync(join(DEFAULT_EPHE_PATH, name));
    expect(buf.length).toBe(PINNED[name].bytes);
    expect(createHash('sha256').update(buf).digest('hex')).toBe(PINNED[name].sha256);
  });

  it('SHA256SUMS lists exactly the pinned files with the same checksums', () => {
    const lines = readFileSync(join(DEFAULT_EPHE_PATH, 'SHA256SUMS'), 'utf8').trim().split('\n');
    const listed = Object.fromEntries(lines.map((l) => l.split(/\s+/)).map(([h, f]) => [f, h]));
    expect(listed).toEqual(Object.fromEntries(Object.entries(PINNED).map(([f, v]) => [f, v.sha256])));
  });

  it('the folder holds no other ephemeris files', () => {
    const se1 = readdirSync(DEFAULT_EPHE_PATH).filter((f) => f.endsWith('.se1')).sort();
    expect(se1).toEqual(Object.keys(PINNED).sort());
  });
});

describe('Moshier fallback is refused', () => {
  it('throws EPHEMERIS_FALLBACK when the data files are missing, then works again with the real folder', () => {
    const empty = mkdtempSync(join(tmpdir(), 'jathag-empty-ephe-'));
    try {
      const broken = createSwephAdapter({ ephePath: empty });
      expect(() => calculateChart(R01, { ephemeris: broken })).toThrow(EphemerisError);
      try {
        calculateChart(R01, { ephemeris: broken });
      } catch (e) {
        expect((e as EphemerisError).code).toBe('EPHEMERIS_FALLBACK');
      }
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
    // The default adapter re-sets its own data path before calculating.
    expect(() => calculateChart(R01)).not.toThrow();
  });
});

describe('only the adapter talks to Swiss Ephemeris', () => {
  const srcDir = join(DEFAULT_EPHE_PATH, '..', 'src');
  const files = readdirSync(srcDir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));

  it('no engine file except src/ephemeris/sweph.ts imports sweph', () => {
    const importers = files.filter((f) => /from\s+['"]sweph['"]|require\(\s*['"]sweph['"]\s*\)|import\(\s*['"]sweph['"]\s*\)/.test(
      readFileSync(join(srcDir, f), 'utf8'),
    ));
    expect(importers.map((f) => f.replaceAll('\\', '/'))).toEqual(['ephemeris/sweph.ts']);
  });
});
