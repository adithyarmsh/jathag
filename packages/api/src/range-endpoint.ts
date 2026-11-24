// POST /api/chart/range handler (Web Request → Response), step 0.3.6. See http-common.ts for the
// privacy rules and range.ts for the range rules.
import type { EphemerisAdapter } from '@jathag/engine';
import { handle, readJson } from './http-common.ts';
import { calculateRangeResponse, parseRangeRequest } from './range.ts';

export const MAX_RANGE_BODY_BYTES = 4096;

export interface RangeHandlerOptions {
  /** Called once per request; lets the web app create the adapter lazily with its own data path. */
  ephemeris?: () => EphemerisAdapter;
}

/** POST /api/chart/range */
export function handleRangeRequest(request: Request, options: RangeHandlerOptions = {}): Promise<Response> {
  return handle('range', async (timing) => {
    const body = await readJson(request, MAX_RANGE_BODY_BYTES);
    const req = parseRangeRequest(body);
    const t = performance.now();
    const ephemeris = options.ephemeris?.();
    const result = calculateRangeResponse(req, { timing, ...(ephemeris ? { ephemeris } : {}) });
    timing.calc = performance.now() - t;
    return result;
  });
}
