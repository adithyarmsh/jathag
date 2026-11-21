// The search function on Vercel ships without the Swiss Ephemeris binary (only the chart function
// has it), so the search entry point must never import the engine, directly or through another file.
// (Found on the 0.2.12 preview: importing '@jathag/api' from the search route crashed it.)
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '../src');

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]!);
}

/** Every module reachable from `entry` through relative imports, plus the packages it names. */
function graph(entry: string) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const walk = (f: string) => {
    if (files.has(f)) return;
    files.add(f);
    for (const spec of importsOf(f)) {
      if (spec.startsWith('.')) walk(resolve(dirname(f), spec));
      else packages.add(spec);
    }
  };
  walk(join(SRC, entry));
  return { files: [...files].map((f) => f.slice(SRC.length + 1)).sort(), packages: [...packages].sort() };
}

describe('search entry point does not pull in the engine', () => {
  it('@jathag/api/search-endpoint imports only places code', () => {
    const g = graph('search-endpoint.ts');
    expect(g.files).toEqual(['errors.ts', 'http-common.ts', 'search-endpoint.ts', 'search.ts']);
    expect(g.packages).toEqual(['@jathag/places']);
  });
  it('the package exports that entry point', () => {
    const pkg = JSON.parse(readFileSync(join(SRC, '../package.json'), 'utf8'));
    expect(pkg.exports['./search-endpoint']).toBe('./src/search-endpoint.ts');
  });
});
