// The place endpoints, both POST so nothing typed is ever in a URL (URLs can appear in hosting logs),
// and nothing typed is logged or stored (FR-API-02):
//   POST /api/places/search   typed text → up to 10 places (FR-IN-04, step 0.2.12)
//   POST /api/places/nearest  typed coordinates → the nearest place's label, or none within 50 km (D-144)
// One route file = ONE Vercel function, so both share the place index loaded once per server
// instance (step 0.5.2; the index is not loaded twice). Any other name → 404. All logic is in
// packages/api (handleSearchRequest, handleNearestRequest).
import { handleNearestRequest } from '@jathag/api/nearest-endpoint'; // not '@jathag/api': that pulls in the engine
import { handleSearchRequest } from '@jathag/api/search-endpoint';
import type { PlaceIndex } from '@jathag/places';
import { loadPlaceIndex } from '@jathag/places/node';
import { placeIndexFile } from '@/lib/server/paths';

export const maxDuration = 15;

let index: PlaceIndex | null = null;

function getIndex(): { index: PlaceIndex; loadMs: number | null } {
  if (index) return { index, loadMs: null };
  const t = performance.now();
  index = loadPlaceIndex(placeIndexFile());
  const loadMs = performance.now() - t;
  // Only sizes and times, never a query or a coordinate.
  console.info(`[places] index loaded: ${index.size} places in ${Math.round(loadMs)} ms, rss ${Math.round(process.memoryUsage().rss / 1e6)} MB`);
  return { index, loadMs };
}

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }): Promise<Response> {
  const { action } = await ctx.params;
  if (action === 'search') return handleSearchRequest(request, { index: getIndex });
  if (action === 'nearest') return handleNearestRequest(request, { index: getIndex });
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
