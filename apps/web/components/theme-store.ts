"use client";

// The theme choice in the browser (lib/theme.ts has the rules). Setting a choice updates <html>,
// stores it under "theme" and tells every theme control on the page, so the header button and the
// phone menu's toggle always agree.

import { useSyncExternalStore } from "react";
import { choiceFromStorage, dataThemeFor, THEME_KEY, type ThemeChoice } from "@/lib/theme";

const EVENT = "jathag-theme";
const DARK = "(prefers-color-scheme: dark)";

function storedChoice(): ThemeChoice {
  try {
    return choiceFromStorage(localStorage.getItem(THEME_KEY));
  } catch {
    // Storage blocked (e.g. some private modes): fall back to what is on <html> for this visit.
    return choiceFromStorage(document.documentElement.dataset.theme);
  }
}

/** The theme on screen: the explicit choice, or the device's. */
function shownTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia(DARK).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DARK);
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  mq.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onChange);
  };
}

export function setThemeChoice(choice: ThemeChoice) {
  const value = dataThemeFor(choice);
  if (value) document.documentElement.dataset.theme = value;
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage can be blocked; the choice still works for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The stored choice (null while the page is drawn on the server). */
export function useThemeChoice(): ThemeChoice | null {
  return useSyncExternalStore(subscribe, storedChoice, () => null);
}

/** The theme on screen (null on the server). */
export function useShownTheme(): "light" | "dark" | null {
  return useSyncExternalStore(subscribe, shownTheme, () => null);
}
