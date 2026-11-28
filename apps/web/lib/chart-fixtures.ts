// Test-only: hand-made charts for the drawn-chart tests (step 0.5.2). Only the fields the drawings use.
import type { ChartResponse } from "@jathag/api";
import type { BodyCode } from "./drawn-chart";

const CODES: BodyCode[] = ["La", "Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"];

/** Each body's D1 sign, D9 sign (default: the D1 sign) and retrograde flag; bodies not given sit in Aries. */
export function chartOf(place: Partial<Record<BodyCode, { d1: number; d9?: number; r?: boolean }>>): ChartResponse["chart"] {
  const bodies = {} as Record<BodyCode, unknown>;
  for (const code of CODES) {
    const p = place[code] ?? { d1: 1 };
    bodies[code] = { sign: p.d1, navamsaSign: p.d9 ?? p.d1, retrograde: p.r ?? false, lon: (p.d1 - 1) * 30 + 1 };
  }
  return { bodies } as unknown as ChartResponse["chart"];
}
