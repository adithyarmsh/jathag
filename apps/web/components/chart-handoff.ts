"use client";

// The hand-off from the home form to /chart (step 0.5.1, D-138), kept only in this page's memory (a
// module variable; nothing is stored, nothing is sent). After a successful "See my chart" the form
// leaves here the profile's id, name and inputs and the result it already has, then moves to
// /chart?profile=<id> without reloading the page. The chart page:
// - shows that result straight away (one chart request per visit, not two);
// - still works when the browser blocks storage (private browsing): the inputs are here for this
//   visit. A refresh empties the memory; the page then reads the saved profile, or goes home.
// The result is used once (a later visit to the same address recalculates).

import type { ChartResponse } from "@jathag/api";
import type { BirthInputs } from "@/lib/profiles";

export interface Handoff {
  id: string;
  name: string;
  birth: BirthInputs;
  result: ChartResponse | null;
}

let last: Handoff | null = null;

export function leaveHandoff(h: Handoff) {
  last = h;
}

/** The hand-off for this profile id, if the form left one; its result is handed out only once. */
export function takeHandoff(id: string): Handoff | null {
  if (!last || last.id !== id) return null;
  const h = last;
  last = { ...last, result: null };
  return h;
}

/** Keeps the in-memory copy in step after "Edit details" (when storage is blocked it is the only copy). */
export function updateHandoff(h: Omit<Handoff, "result">) {
  last = { ...h, result: null };
}
