"use client";

// The ONE remembered chart style (step 0.5.2, D-143 item 1, FR-CH-06): the South / North toggle under
// the drawn chart and the form's Chart style cards read and write the same value, kept under the
// existing "chartStyle" key (lib/chart-style.ts; no new key). A change made in one place shows in the
// other at once (an event on this page, the browser's "storage" event from other tabs). When the
// browser blocks storage the choice is kept in this page's memory for the visit.

import { useSyncExternalStore } from "react";
import { browserStore, CHART_STYLE_KEY, DEFAULT_CHART_STYLE, readChartStyle, saveChartStyle, type ChartStyle } from "@/lib/chart-style";

const EVENT = "jathag-chart-style";

/** The choice made on this page when storage would not keep it (blocked storage). */
let memory: ChartStyle | null = null;

function snapshot(): ChartStyle {
  const store = browserStore();
  const stored = readChartStyle(store);
  if (memory && memory !== stored) return memory;
  return stored;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CHART_STYLE_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The remembered style (South the first time); South while the page is drawn on the server. */
export function useChartStyle(): ChartStyle {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_CHART_STYLE);
}

/** Remembers a new style and tells every part of the page that shows it. */
export function setChartStyle(style: ChartStyle) {
  const store = browserStore();
  saveChartStyle(store, style);
  memory = readChartStyle(store) === style ? null : style;
  window.dispatchEvent(new Event(EVENT));
}
