// View models for the "Right now" and "Dasha periods" cards (step 0.3.7, D-113 items 1–3, FR-TM-01…04).
// Built only from the chart API's `dashas` and `lifeAreas`; nothing is calculated here.
//
// Rules from D-113 item 3 (D-098 item 2):
//   - a period that ended before birth (endedBeforeBirth) is never shown, at any level;
//   - the period running at birth (containsBirth) shows its TRUE start and "Began before birth"
//     (when it started before the birth instant; applied at every level, not only Mahadashas);
//   - the current period at each level is marked "You are here" (from dashas.current);
//   - for a birth after the calculation moment there is no current period: the card says the timeline
//     starts at birth and shows the next starts. Pure functions, tested in dasha-view.test.ts.

import { fill } from "./chart-format";
import { periodProgress, type Progress } from "./progress";
import {
  activatesText,
  grahaName,
  levelLabel,
  LEVELS,
  type Antardasha,
  type DashaLevel,
  type DashaPeriod,
  type GrahaCode,
  type ListContext,
  type Mahadasha,
} from "./list-context";

export interface PeriodRow {
  /** Position in the timeline, e.g. "3" / "3-2" / "3-2-1" (0-based); stable React key. */
  key: string;
  path: number[];
  level: DashaLevel;
  lord: GrahaCode;
  lordName: string;
  startUtc: string;
  endUtc: string;
  /** "14 Aug 2031" on the clock at birth */
  start: string;
  end: string;
  /** "14 Aug 2031 – 10 Oct 2050" */
  range: string;
  beganBeforeBirth: boolean;
  /** Running at the calculation moment ("You are here"). */
  current: boolean;
}

const samePath = (a: readonly number[] | undefined, b: readonly number[]) =>
  a !== undefined && a.length === b.length && a.every((x, i) => x === b[i]);

function row(p: DashaPeriod, path: number[], level: DashaLevel, ctx: ListContext): PeriodRow {
  const { dashas } = ctx.result;
  const start = ctx.date(p.start);
  const end = ctx.date(p.end);
  return {
    key: path.join("-"),
    path,
    level,
    lord: p.lord,
    lordName: grahaName(p.lord, ctx.t),
    startUtc: p.start,
    endUtc: p.end,
    start,
    end,
    range: fill(ctx.t.lists.dateRange, { start, end }),
    beganBeforeBirth: p.containsBirth && Date.parse(p.start) < Date.parse(dashas.vimshottari.birthUtc),
    current: samePath(dashas.current[level]?.path, path),
  };
}

const visible = <T extends DashaPeriod>(list: T[]) =>
  list.map((p, i) => ({ p, i })).filter(({ p }) => !p.endedBeforeBirth);

/** The Mahadashas to show (9 minus those that ended before birth). */
export function mahadashaRows(ctx: ListContext): PeriodRow[] {
  return visible(ctx.result.dashas.vimshottari.mahadashas).map(({ p, i }) => row(p, [i], "mahadasha", ctx));
}

/** The Antardashas of one Mahadasha (by its index in the timeline), without those ended before birth. */
export function antardashaRows(ctx: ListContext, maha: number): PeriodRow[] {
  const m: Mahadasha | undefined = ctx.result.dashas.vimshottari.mahadashas[maha];
  if (!m) return [];
  return visible(m.antardashas).map(({ p, i }) => row(p, [maha, i], "antardasha", ctx));
}

/** The Pratyantardashas of one Antardasha, without those ended before birth. */
export function pratyantardashaRows(ctx: ListContext, maha: number, antar: number): PeriodRow[] {
  const a: Antardasha | undefined = ctx.result.dashas.vimshottari.mahadashas[maha]?.antardashas[antar];
  if (!a) return [];
  return visible(a.pratyantardashas).map(({ p, i }) => row(p, [maha, antar, i], "pratyantardasha", ctx));
}

/** Every period at one level in time order, with its path (a walk over the API's tree, no rule). */
function periodsAt(ctx: ListContext, level: DashaLevel): { p: DashaPeriod; path: number[] }[] {
  const out: { p: DashaPeriod; path: number[] }[] = [];
  ctx.result.dashas.vimshottari.mahadashas.forEach((m, i) => {
    if (level === "mahadasha") return void out.push({ p: m, path: [i] });
    m.antardashas.forEach((a, j) => {
      if (level === "antardasha") return void out.push({ p: a, path: [i, j] });
      a.pratyantardashas.forEach((p, k) => out.push({ p, path: [i, j, k] }));
    });
  });
  return out;
}

export interface CurrentLine {
  level: DashaLevel;
  /** "Mahadasha (long-term)" */
  label: string;
  /** "Long-term · Mahadasha": the tier label of the Right now card (0.3.7.1, D-115 item 4) */
  tierLabel: string;
  row: PeriodRow;
  /** "Activates: Career & work, Money & family" / "Activates: No life area linked" */
  activates: string;
  /** How far through the period the calculation moment is (null if it cannot be worked out). */
  progress: Progress | null;
  /** "About 63% through" (the bar's text alternative), or null */
  progressText: string | null;
}

export interface NextLine {
  level: DashaLevel;
  label: string;
  row: PeriodRow;
  /** "starts 14 Aug 2031" */
  startsText: string;
}

export interface DashaNowView {
  /** "running": a period is running now; "notBorn": birth is after the calculation moment;
   *  "cycleEnded": the calculation moment is after the 120-year cycle. */
  state: "running" | "notBorn" | "cycleEnded";
  /** The plain-words line for notBorn / cycleEnded. */
  message: string | null;
  current: CurrentLine[];
  next: NextLine[];
  /** Shown when nothing is coming up at any level. */
  nothingNext: string | null;
}

/**
 * Current period and "coming up" for the Right now card. "Coming up" is dashas.next at each level;
 * only for a birth after the calculation moment can that be a period that ended before birth, and
 * then the first later period that does not is shown instead (those are hidden everywhere, D-113 item 3).
 */
export function dashaNow(ctx: ListContext): DashaNowView {
  const { dashas } = ctx.result;
  const tl = dashas.vimshottari;
  const t = ctx.t.lists.rightNow;
  const birthMs = Date.parse(tl.birthUtc);
  const asOfMs = Date.parse(dashas.asOf);

  const current: CurrentLine[] = [];
  for (const level of LEVELS) {
    const ref = dashas.current[level];
    if (!ref) continue;
    const p = periodsAt(ctx, level).find((x) => samePath(ref.path, x.path));
    if (!p) continue;
    const r = row(p.p, p.path, level, ctx);
    const progress = periodProgress(r.startUtc, r.endUtc, dashas.asOf);
    current.push({
      level,
      label: levelLabel(level, ctx.t),
      tierLabel: fill(ctx.t.lists.tierLabel, { term: ctx.t.lists.termsTitle[level], level: ctx.t.lists.levels[level] }),
      row: r,
      activates: activatesText(r.lord, ctx),
      progress,
      progressText: progress ? fill(ctx.t.lists.progressText, { percent: progress.percent }) : null,
    });
  }

  const next: NextLine[] = [];
  for (const level of LEVELS) {
    const ref = dashas.next[level];
    if (!ref) continue;
    const all = periodsAt(ctx, level);
    const from = all.findIndex((x) => samePath(ref.path, x.path));
    const shown = from < 0 ? undefined : all.slice(from).find((x) => !x.p.endedBeforeBirth);
    if (!shown) continue;
    const r = row(shown.p, shown.path, level, ctx);
    next.push({ level, label: levelLabel(level, ctx.t), row: r, startsText: fill(t.startsOn, { date: r.start }) });
  }

  let state: DashaNowView["state"] = "running";
  let message: string | null = null;
  if (current.length === 0) {
    if (asOfMs < birthMs) {
      state = "notBorn";
      message = fill(t.notBorn, { date: ctx.date(tl.birthUtc) });
    } else {
      state = "cycleEnded";
      message = fill(t.cycleEnded, { date: ctx.date(tl.end) });
    }
  }
  return { state, message, current, next, nothingNext: next.length === 0 ? t.nothingNext : null };
}
