// POST /api/chart handler (Web Request → Response). See http-common.ts for the privacy rules.
import type { EphemerisAdapter } from '@jathag/engine';
import { calculateChartResponse, parseChartRequest } from './chart.ts';
import { handle, readJson } from './http-common.ts';

export const MAX_CHART_BODY_BYTES = 4096;

export interface ChartHandlerOptions {
  /** Called once per request; lets the web app create the adapter lazily with its own data path. */
  ephemeris?: () => EphemerisAdapter;
}

/** POST /api/chart */
export function handleChartRequest(request: Request, options: ChartHandlerOptions = {}): Promise<Response> {
  return handle('chart', async (timing) => {
    const body = await readJson(request, MAX_CHART_BODY_BYTES);
    const req = parseChartRequest(body);
    const t = performance.now();
    const ephemeris = options.ephemeris?.();
    const result = calculateChartResponse(req, ephemeris ? { ephemeris } : {});
    timing.calc = performance.now() - t;
    return result;
  });
}

