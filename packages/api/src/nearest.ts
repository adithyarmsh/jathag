// Nearest-place endpoint logic (step 0.5.2, D-144): typed coordinates → the label of the nearest place
// in the GeoNames index, or null when none lies within 50 km. Nothing here logs or stores the
// coordinates (they are birth data, FR-API-02, D-091); the answer carries only the label.

import { NEAREST_MAX_KM, type PlaceIndex } from '@jathag/places';
import { ApiError } from './errors.ts';

export interface NearestRequest {
  lat: number;
  lng: number;
}

export interface NearestResponse {
  /** The nearest place's label ("Chennai, Tamil Nadu, India"), or null: none within 50 km. No distance (D-144 item 2). */
  nearest: { label: string } | null;
}

/** Only `lat` (−90…90) and `lng` (−180…180) as finite numbers; anything else is INVALID_REQUEST. */
export function parseNearestRequest(body: unknown): NearestRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError('INVALID_REQUEST');
  const { lat, lng, ...rest } = body as Record<string, unknown>;
  if (Object.keys(rest).length > 0) throw new ApiError('INVALID_REQUEST');
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90) throw new ApiError('INVALID_REQUEST');
  if (typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) throw new ApiError('INVALID_REQUEST');
  return { lat, lng };
}

export function nearestPlace(index: PlaceIndex, req: NearestRequest): NearestResponse {
  const p = index.nearest(req.lat, req.lng, NEAREST_MAX_KM);
  return { nearest: p ? { label: p.label } : null };
}
