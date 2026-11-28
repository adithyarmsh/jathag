// POST /api/places/nearest handler (step 0.5.2, D-144), served by the same Vercel function and the same
// loaded index as the place search (apps/web/app/api/places/[action]/route.ts). Like the search entry
// point, nothing here may import the engine. See http-common.ts for the privacy rules.
import type { PlaceIndex } from '@jathag/places';
import { handle, readJson } from './http-common.ts';
import { nearestPlace, parseNearestRequest } from './nearest.ts';

export const MAX_NEAREST_BODY_BYTES = 256;

export interface NearestHandlerOptions {
  /** Returns the place index, loading it on first use (`loadMs` when that happened during this call). */
  index: () => { index: PlaceIndex; loadMs: number | null };
}

/** POST /api/places/nearest */
export function handleNearestRequest(request: Request, options: NearestHandlerOptions): Promise<Response> {
  return handle('places', async (timing) => {
    const body = await readJson(request, MAX_NEAREST_BODY_BYTES);
    const req = parseNearestRequest(body);
    const { index, loadMs } = options.index();
    if (loadMs !== null) timing.load = loadMs;
    const gridBefore = index.nearestReady;
    const t = performance.now();
    const result = nearestPlace(index, req);
    // The first lookup in a server instance also builds the grid (reported as "grid").
    timing[gridBefore ? 'nearest' : 'grid'] = performance.now() - t;
    return result;
  });
}
