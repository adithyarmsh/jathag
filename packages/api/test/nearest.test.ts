// POST /api/places/nearest (step 0.5.2, D-144): same rules as the place search: no-store, error codes
// only, nothing logged, and the entry point never imports the engine.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaceIndex } from '@jathag/places';
import { handleNearestRequest, MAX_NEAREST_BODY_BYTES, type NearestResponse } from '../src/index.ts';

const ROOT = join(import.meta.dirname, '../../..');
let index: PlaceIndex;
let loads = 0;
beforeAll(() => {
  index = new PlaceIndex(gunzipSync(readFileSync(join(ROOT, 'data/places/index/places.tsv.gz'))).toString('utf8'));
});

let spies: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
});
afterEach(() => {
  for (const s of spies) expect(s, 'console must stay silent').not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

async function nearest(body: unknown, raw = false) {
  const res = await handleNearestRequest(
    new Request('http://localhost/api/places/nearest', { method: 'POST', body: raw ? (body as string) : JSON.stringify(body) }),
    { index: () => { loads++; return { index, loadMs: loads === 1 ? 812 : null }; } },
  );
  return { res, text: await res.clone().text(), json: (await res.json()) as NearestResponse & { error?: { code: string } } };
}

describe('nearest place endpoint', () => {
  it('Chennai → its label only (no distance, no coordinates back); no-store', async () => {
    const { res, json, text } = await nearest({ lat: 13.08784, lng: 80.27847 });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(json).toEqual({ nearest: { label: 'Chennai, Tamil Nadu, India' } });
    expect(text).not.toMatch(/13\.08|80\.27|km|distance/);
    expect(res.headers.get('server-timing')).toMatch(/grid;dur=|nearest;dur=/);
  });

  it('the open sea → null', async () => {
    expect((await nearest({ lat: 15, lng: 65 })).json).toEqual({ nearest: null });
  });

  it.each([
    ['not an object', [13, 80]],
    ['missing lng', { lat: 13 }],
    ['text', { lat: '13', lng: '80' }],
    ['out of range', { lat: 91, lng: 80 }],
    ['out of range lng', { lat: 13, lng: -181 }],
    ['extra field (e.g. a date)', { lat: 13, lng: 80, date: '1992-08-14' }],
    ['null', null],
  ])('bad input (%s) → INVALID_REQUEST, nothing echoed', async (_n, body) => {
    const { res, json, text } = await nearest(body);
    expect(res.status).toBe(400);
    expect(json.error?.code).toBe('INVALID_REQUEST');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(text).not.toContain('1992');
  });

  it('broken JSON and a too-large body are refused with codes', async () => {
    expect((await nearest('{lat:', true)).json.error?.code).toBe('INVALID_REQUEST');
    const big = await nearest(JSON.stringify({ lat: 1, lng: 2, pad: 'x'.repeat(MAX_NEAREST_BODY_BYTES) }), true);
    expect(big.res.status).toBe(413);
    expect(big.json.error?.code).toBe('REQUEST_TOO_LARGE');
  });
});

// Same check as the search entry point (imports.test.ts): the place function has no Swiss Ephemeris.
describe('nearest entry point does not pull in the engine', () => {
  const SRC = join(import.meta.dirname, '../src');
  const importsOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]!);
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
  it('@jathag/api/nearest-endpoint imports only places code', () => {
    const g = graph('nearest-endpoint.ts');
    expect(g.files).toEqual(['errors.ts', 'http-common.ts', 'nearest-endpoint.ts', 'nearest.ts']);
    expect(g.packages).toEqual(['@jathag/places']);
    const pkg = JSON.parse(readFileSync(join(SRC, '../package.json'), 'utf8'));
    expect(pkg.exports['./nearest-endpoint']).toBe('./src/nearest-endpoint.ts');
  });

  it('the web route serves search and nearest from one file (one function, one index load)', () => {
    const route = readFileSync(join(ROOT, 'apps/web/app/api/places/[action]/route.ts'), 'utf8');
    expect(route).toContain("from '@jathag/api/nearest-endpoint'");
    expect(route).toContain("from '@jathag/api/search-endpoint'");
    expect(route).not.toMatch(/from '@jathag\/api'/);
    expect(route.match(/loadPlaceIndex\(/g)).toHaveLength(1);
    expect(route).not.toMatch(/console\.\w+\([^)]*(lat|lng|query|body)/);
    const config = readFileSync(join(ROOT, 'apps/web/next.config.ts'), 'utf8');
    expect(config).toContain('"/api/places/*": ["../../data/places/index/places.tsv.gz"]');
  });
});
