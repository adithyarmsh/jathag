// The browser uses the API's "Which clock?" rule directly (clock-rule.ts). That is only safe while
// the rule and everything it imports is plain TypeScript: no engine, no Swiss Ephemeris, no place
// index file, no Node modules. This test walks the imports and fails if that ever changes.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../../..');

function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]!);
}

/** Every file reachable from `entry`, following relative imports and '@jathag/places' (main entry). */
function graph(entry: string) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const walk = (f: string) => {
    if (files.has(f)) return;
    files.add(f);
    for (const spec of importsOf(f)) {
      if (spec.startsWith('.')) walk(resolve(dirname(f), spec));
      else if (spec === '@jathag/places') walk(join(ROOT, 'packages/places/src/index.ts'));
      else packages.add(spec);
    }
  };
  walk(join(ROOT, entry));
  return { files: [...files].map((f) => f.slice(ROOT.length + 1)).sort(), packages: [...packages].sort() };
}

describe('the clock rule can run in the browser', () => {
  it('clock-rule.ts reaches only the clock rule and the plain places code', () => {
    const g = graph('apps/web/lib/clock-rule.ts');
    expect(g.files).toEqual([
      'apps/web/lib/clock-rule.ts',
      'packages/api/src/clock.ts',
      'packages/places/src/index.ts',
      'packages/places/src/normalize.ts',
    ]);
    expect(g.packages).toEqual([]);
  });
  it('the places main entry is the one without file access', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages/places/package.json'), 'utf8'));
    expect(pkg.exports['.']).toBe('./src/index.ts');
  });
});
