// POST /api/chart handler (Web Request → Response). See http-common.ts for the privacy rules.
import type { EphemerisAdapter } from '@jathag/engine';
import { calculateChartResponse, parseChartRequest } from './chart.ts';
import { handle, readJson } from './http-common.ts';

export const MAX_CHART_BODY_BYTES = 4096;

export interface ChartHandlerOptions {
  /** Called once per request; lets the web app create the adapter lazily with its own data path. */
  ephemeris?: () => EphemerisAdapter;
  /**
   * The moment of calculation for "current period" (D-096 item 2), ISO 8601 UTC. Called once per
   * request, when the request arrives. The web route passes the request time; tests pass a fixed one.
   * Default: the time now.
   */
  asOf?: () => string;
}

/** POST /api/chart */
export function handleChartRequest(request: Request, options: ChartHandlerOptions = {}): Promise<Response> {
  return handle('chart', async (timing) => {
    const asOf = options.asOf ? options.asOf() : new Date().toISOString();
    const body = await readJson(request, MAX_CHART_BODY_BYTES);
    const req = parseChartRequest(body);
    const t = performance.now();
    const ephemeris = options.ephemeris?.();
    const result = calculateChartResponse(req, { asOf, ...(ephemeris ? { ephemeris } : {}) });
    timing.calc = performance.now() - t;
    return result;
  });
}

