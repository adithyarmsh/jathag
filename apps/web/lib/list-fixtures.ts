// TEST-ONLY hand-made chart responses for the 0.3.7 list builders (used by *-view.test.ts). The dasha
// timeline here is NOT Vimshottari arithmetic: every Mahadasha has the same length, split evenly, which
// is all the display code needs (dates, flags, paths). Real charts are tested in
// tests/reference/web-lists.test.ts. Types only from @jathag/api.

import type { ChartResponse } from "@jathag/api";
import type { DashaLevel, GrahaCode, Mahadasha, Timeline } from "./list-context";

const ORDER: GrahaCode[] = ["Ke", "Ve", "Su", "Mo", "Ma", "Ra", "Ju", "Sa", "Me"];
const YEAR_MS = 365.25 * 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");

function rotate(first: GrahaCode): GrahaCode[] {
  const i = ORDER.indexOf(first);
  return [...ORDER.slice(i), ...ORDER.slice(0, i)];
}

function flags(startMs: number, endMs: number, birthMs: number) {
  return { endedBeforeBirth: endMs <= birthMs, containsBirth: startMs <= birthMs && birthMs < endMs };
}

/** 9 equal Mahadashas of `mahaYears` from `start`, each split in 9 equal Antardashas and 81 Pratyantardashas. */
export function fakeTimeline(opts: { start: string; birthUtc: string; firstLord?: GrahaCode; mahaYears?: number }): Timeline {
  const startMs = Date.parse(opts.start);
  const birthMs = Date.parse(opts.birthUtc);
  const len = (opts.mahaYears ?? 13) * YEAR_MS;
  const mahadashas: Mahadasha[] = rotate(opts.firstLord ?? "Ke").map((lord, i) => {
    const ms = startMs + i * len;
    return {
      lord,
      start: iso(ms),
      end: iso(ms + len),
      ...flags(ms, ms + len, birthMs),
      antardashas: rotate(lord).map((al, j) => {
        const as = ms + (j * len) / 9;
        const ae = ms + ((j + 1) * len) / 9;
        return {
          lord: al,
          start: iso(as),
          end: iso(ae),
          ...flags(as, ae, birthMs),
          pratyantardashas: rotate(al).map((pl, k) => {
            const ps = as + (k * len) / 81;
            const pe = as + ((k + 1) * len) / 81;
            return { lord: pl, start: iso(ps), end: iso(pe), ...flags(ps, pe, birthMs) };
          }),
        };
      }),
    };
  });
  return {
    system: "vimshottari",
    dashaYear: "365.25",
    birthUtc: opts.birthUtc,
    moonLon: 0,
    moonNakshatra: 1,
    fractionTravelled: 0,
    balanceYears: 0,
    start: mahadashas[0]!.start,
    end: mahadashas[8]!.end,
    mahadashas,
  } as unknown as Timeline;
}

type Ref = { path: number[]; lord: GrahaCode; start: string; end: string };

/** Current and next at each level, the same meaning as the engine's vimshottariNow (D-096). */
function nowOf(tl: Timeline, asOf: string) {
  const t = Date.parse(asOf);
  const live = t >= Date.parse(tl.birthUtc);
  const levels: Record<DashaLevel, Ref[]> = { mahadasha: [], antardasha: [], pratyantardasha: [] };
  tl.mahadashas.forEach((m, i) => {
    levels.mahadasha.push({ path: [i], lord: m.lord, start: m.start, end: m.end });
    m.antardashas.forEach((a, j) => {
      levels.antardasha.push({ path: [i, j], lord: a.lord, start: a.start, end: a.end });
      a.pratyantardashas.forEach((p, k) => levels.pratyantardasha.push({ path: [i, j, k], lord: p.lord, start: p.start, end: p.end }));
    });
  });
  const cur = (l: Ref[]) => (live && l.find((p) => Date.parse(p.start) <= t && t < Date.parse(p.end))) || null;
  const nxt = (l: Ref[]) => l.find((p) => Date.parse(p.start) > t) ?? null;
  return {
    current: { mahadasha: cur(levels.mahadasha), antardasha: cur(levels.antardasha), pratyantardasha: cur(levels.pratyantardasha) },
    next: { mahadasha: nxt(levels.mahadasha), antardasha: nxt(levels.antardasha), pratyantardasha: nxt(levels.pratyantardasha) },
  };
}

const position = (sign: number, retrograde = false, houseFromMoon = 1, houseFromLagna = 1) => ({
  lon: (sign - 1) * 30 + 10, sign, degInSign: 10, nakshatra: 1, pada: 1, speed: retrograde ? -0.05 : 0.1, retrograde, houseFromMoon, houseFromLagna,
});

/** A hand-made response with only the fields the 0.3.7 lists read. */
export function fakeResponse(opts: {
  birthUtc: string;
  asOf: string;
  cycleStart: string;
  offsetSeconds?: number;
  firstLord?: GrahaCode;
  sadeSati?: Partial<ChartResponse["transits"]["sadeSati"]>;
  lifeAreas?: Partial<ChartResponse["lifeAreas"]>;
}): ChartResponse {
  const tl = fakeTimeline({ start: opts.cycleStart, birthUtc: opts.birthUtc, firstLord: opts.firstLord });
  const now = nowOf(tl, opts.asOf);
  const emptyAreas = { Su: [], Mo: [], Ma: [], Me: [], Ju: [], Ve: [], Sa: [], Ra: [], Ke: [] };
  return {
    clock: { source: "manual", id: null, chosen: false, utcOffsetSeconds: opts.offsetSeconds ?? 19800, timeZone: null, tzdataVersion: null },
    utc: opts.birthUtc,
    dashas: { asOf: opts.asOf, vimshottari: tl, ...now },
    lifeAreas: { ...emptyAreas, ...opts.lifeAreas },
    transits: {
      asOf: opts.asOf,
      natal: { moonSign: 10, lagnaSign: 5 },
      positions: {
        Su: position(8), Mo: position(1), Ma: position(9, true), Me: position(8, true), Ju: position(4, true),
        Ve: position(9), Sa: position(12, false, 3, 8), Ra: position(11, true), Ke: position(5, true),
      },
      signChanges: {
        Sa: [
          { planet: "Sa", utc: "2022-04-28T20:00:00Z", fromSign: 10, toSign: 11, kind: "enters" },
          { planet: "Sa", utc: "2022-07-12T09:00:00Z", fromSign: 11, toSign: 10, kind: "moves-back" },
          { planet: "Sa", utc: "2023-01-17T12:00:00Z", fromSign: 10, toSign: 11, kind: "enters-again" },
        ],
        Ju: [],
        Ra: [{ planet: "Ra", utc: "2025-05-18T10:00:00Z", fromSign: 12, toSign: 11, kind: "enters" }],
        Ke: [{ planet: "Ke", utc: "2025-05-18T10:00:00Z", fromSign: 6, toSign: 5, kind: "enters" }],
      },
      sadeSati: {
        moonSign: 10,
        signs: { rising: 9, peak: 10, setting: 11 },
        span: { start: opts.birthUtc, end: opts.birthUtc },
        periods: [],
        status: { asOf: opts.asOf, phase: "none", current: null, next: null, saturn: { sign: 12, houseFromMoon: 3 } },
        ...opts.sadeSati,
      },
    },
  } as unknown as ChartResponse;
}
