// Place search endpoint logic (FR-IN-04; D-087, D-088, D-089). The order is exactly what
// packages/places returns. Nothing here logs or stores the query (FR-API-02).

import { MIN_QUERY_LENGTH, type PlaceIndex } from '@jathag/places';
import { ApiError } from './errors.ts';

/** Longer queries are refused (no real place label is this long). */
export const MAX_QUERY_LENGTH = 100;
export const SEARCH_LIMIT = 10;

/** One suggestion: what the form shows (label) and what it sends back to the chart endpoint. */
export interface PlaceSuggestion {
  label: string;
  geonameId: number;
  lat: number;
  lng: number;
  timeZone: string;
  countryCode: string;
  admin1Code: string;
  admin2Code: string;
  featureCode: string;
  /** The alternate or old name that matched, when it was not the main name (e.g. "Bombay" for Mumbai, D-091 item 4). */
  matchedName?: string;
}

export interface SearchResponse {
  results: PlaceSuggestion[];
}

export function parseSearchRequest(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError('INVALID_REQUEST');
  const q = (body as { query?: unknown }).query;
  if (typeof q !== 'string') throw new ApiError('INVALID_REQUEST');
  if (q.length > MAX_QUERY_LENGTH) throw new ApiError('INVALID_REQUEST');
  return q;
}

export function searchPlaces(index: PlaceIndex, query: string): SearchResponse {
  if (query.trim().length < MIN_QUERY_LENGTH) return { results: [] };
  return {
    results: index.search(query, { limit: SEARCH_LIMIT }).map((p) => ({
      label: p.label,
      geonameId: p.id,
      lat: p.lat,
      lng: p.lng,
      timeZone: p.timeZone,
      countryCode: p.countryCode,
      admin1Code: p.admin1Code,
      admin2Code: p.admin2Code,
      featureCode: p.featureCode,
      ...(p.matchedName !== undefined ? { matchedName: p.matchedName } : {}),
    })),
  };
}
