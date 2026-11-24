// POST /api/chart/range: a place and a local from–to time range → the approximate-time scan (step 0.3.6,
// D-111): change moments, segments, certain values and dasha date ranges. No screen uses it yet (0.3.7,
// 0.8.1). Private: nothing is logged or stored (FR-API-02). All logic is in packages/api
// (handleRangeRequest); see packages/api/README.md for the request shape. Its own Vercel function.
import { handleRangeRequest } from '@jathag/api';
import { createSwephAdapter, type EphemerisAdapter } from '@jathag/engine';
import { ephemerisPath } from '@/lib/server/paths';

// Caps a runaway request (a whole day scans in well under a second).
export const maxDuration = 10;

let adapter: EphemerisAdapter | null = null;

export function POST(request: Request): Promise<Response> {
  return handleRangeRequest(request, {
    ephemeris: () => (adapter ??= createSwephAdapter({ ephePath: ephemerisPath() })),
  });
}
