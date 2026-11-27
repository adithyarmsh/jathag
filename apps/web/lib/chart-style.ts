// Chart style on the form (FR-IN-10, D-134 item 7): South Indian the first time, then the last
// choice. Kept in the browser under localStorage "chartStyle" ("south" | "north"), saved when
// "See my chart" succeeds. Nothing else about the birth is stored (NFR-PRIV-01): only "theme" and
// "chartStyle" ever go into localStorage.

export type ChartStyle = "south" | "north";

export const CHART_STYLE_KEY = "chartStyle";
export const DEFAULT_CHART_STYLE: ChartStyle = "south";

type Store = Pick<Storage, "getItem" | "setItem">;

/** The stored style, or South when nothing (or something unknown) is stored or storage is blocked. */
export function readChartStyle(store: Store | null | undefined): ChartStyle {
  try {
    const v = store?.getItem(CHART_STYLE_KEY);
    return v === "north" || v === "south" ? v : DEFAULT_CHART_STYLE;
  } catch {
    return DEFAULT_CHART_STYLE;
  }
}

/** Remembers the style (ignored when storage is blocked, e.g. private browsing on some phones). */
export function saveChartStyle(store: Store | null | undefined, style: ChartStyle): void {
  try {
    store?.setItem(CHART_STYLE_KEY, style);
  } catch {
    // not remembered; the form still works
  }
}
