// POST /api/places/search: typed text → up to 10 places (FR-IN-04). POST so the text is never in a
// URL (URLs can appear in hosting logs). The text is never logged or stored (FR-API-02).
// All logic is in packages/api (handleSearchRequest); the index loads once per server instance.
import { handleSearchRequest } from '@jathag/api';
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
  // Only sizes and times, never a query.
  console.info(`[places] index loaded: ${index.size} places in ${Math.round(loadMs)} ms, rss ${Math.round(process.memoryUsage().rss / 1e6)} MB`);
  return { index, loadMs };
}

export function POST(request: Request): Promise<Response> {
  return handleSearchRequest(request, { index: getIndex });
}
