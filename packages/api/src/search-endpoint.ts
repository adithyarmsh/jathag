// POST /api/places/search handler (Web Request → Response). See http-common.ts for the privacy rules.
// Imported on its own by the search route: nothing here may import the engine (no Swiss Ephemeris
// binary in that function).
import type { PlaceIndex } from '@jathag/places';
import { handle, readJson } from './http-common.ts';
import { parseSearchRequest, searchPlaces } from './search.ts';

export const MAX_SEARCH_BODY_BYTES = 1024;

export interface SearchHandlerOptions {
  /** Returns the place index, loading it on first use. `loadMs` = how long loading took, when it happened during this call (else null). */
  index: () => { index: PlaceIndex; loadMs: number | null };
}

/** POST /api/places/search */
export function handleSearchRequest(request: Request, options: SearchHandlerOptions): Promise<Response> {
  return handle('places', async (timing) => {
    const body = await readJson(request, MAX_SEARCH_BODY_BYTES);
    const query = parseSearchRequest(body);
    const { index, loadMs } = options.index();
    if (loadMs !== null) timing.load = loadMs;
    const t = performance.now();
    const result = searchPlaces(index, query);
    timing.search = performance.now() - t;
    return result;
  });
}
