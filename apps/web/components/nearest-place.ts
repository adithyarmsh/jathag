"use client";

// "Near <place>" for typed coordinates (step 0.5.2, D-144), browser side. One POST /api/places/nearest
// per pair of coordinates per visit (kept in this page's memory, so the form and the chart page share
// it), with ONLY the two numbers in the body: never the date, time or name. It never blocks anything:
// the chart is calculated and shown without waiting for it, and a failure is silent (the coordinates
// stay, D-144 item 3).
//
// The answer is saved with the profile (lib/profiles.ts setNear, through profiles-store.ts) so a saved chart needs no second
// request; with blocked storage it lives only in this memory, for this visit.

import { saveNear } from "./profiles-store";

/** label = found; null = no place within 50 km; undefined = the lookup failed (try again next time). */
export type NearAnswer = string | null | undefined;

const cache = new Map<string, Promise<NearAnswer>>();
const keyOf = (lat: number, lng: number) => `${lat},${lng}`;

export function lookupNearest(lat: number, lng: number): Promise<NearAnswer> {
  const key = keyOf(lat, lng);
  const known = cache.get(key);
  if (known) return known;
  const p = (async (): Promise<NearAnswer> => {
    try {
      const res = await fetch("/api/places/nearest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
        cache: "no-store",
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as { nearest?: { label?: unknown } | null };
      if (data.nearest === null) return null;
      return typeof data.nearest?.label === "string" && data.nearest.label ? data.nearest.label : undefined;
    } catch {
      return undefined;
    }
  })();
  cache.set(key, p);
  // A failed lookup may be tried again later (on the next open).
  void p.then((a) => {
    if (a === undefined) cache.delete(key);
  });
  return p;
}

/** Looks the place up (if needed) and saves the answer with that profile; resolves to the answer. */
export async function nearestForProfile(id: string | null, coords: { lat: number; lng: number }): Promise<NearAnswer> {
  const answer = await lookupNearest(coords.lat, coords.lng);
  if (answer !== undefined && id) saveNear(id, coords, answer);
  return answer;
}
