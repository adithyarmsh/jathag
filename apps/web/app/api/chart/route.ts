// POST /api/chart: birth details → chart (FR-API-01). Private: nothing is logged or stored (FR-API-02).
// All logic is in packages/api (handleChartRequest); see packages/api/README.md for the request shape.
// This function does NOT load the place index: the place fields come from the search result.
import { handleChartRequest } from '@jathag/api';
import { createSwephAdapter, type EphemerisAdapter } from '@jathag/engine';
import { ephemerisPath } from '@/lib/server/paths';

// Caps a runaway request; also keeps this function separate from the search function on Vercel.
export const maxDuration = 10;

let adapter: EphemerisAdapter | null = null;

export function POST(request: Request): Promise<Response> {
  return handleChartRequest(request, {
    ephemeris: () => (adapter ??= createSwephAdapter({ ephePath: ephemerisPath() })),
  });
}
