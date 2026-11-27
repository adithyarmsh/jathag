"use client";

// The header's theme button (design spec §4): switches between light and dark (an explicit choice).
// Match device is offered in the phone menu (and later in Settings, 0.8.2). The icon (moon in light,
// sun in dark) is drawn by CSS, so it is right before this code runs.

import type { Messages } from "@/lib/i18n";
import { MoonIcon, SunIcon } from "./icons";
import { setThemeChoice, useShownTheme } from "./theme-store";

export function ThemeButton({ t, round = false }: { t: Messages["header"]["theme"]; round?: boolean }) {
  const shown = useShownTheme();
  const label = shown === "dark" ? t.toLight : shown === "light" ? t.toDark : t.switch;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        const set = document.documentElement.dataset.theme;
        const dark = set ? set === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemeChoice(dark ? "light" : "dark");
      }}
      className={`icon-button ${round ? "icon-button-round" : ""}`.trim()}
    >
      <MoonIcon className="theme-icon-moon" />
      <SunIcon className="theme-icon-sun" />
    </button>
  );
}
