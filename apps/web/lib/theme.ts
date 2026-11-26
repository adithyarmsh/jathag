// Theme choice (FR-UI-02, design spec §1.1): Light, Dark or Match device (the default).
//
// The choice is kept only in this browser, under the localStorage key "theme": "light", "dark" or
// "system". Nothing else is stored. "light" / "dark" set data-theme on <html>; "system" (or nothing
// stored, or anything unknown) removes it, so the CSS follows the device (prefers-color-scheme).
// Values stored before 0.4.5 were only "light" or "dark", so they keep working unchanged.

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "theme";

/** The choice a stored value stands for. */
export function choiceFromStorage(stored: string | null | undefined): ThemeChoice {
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

/** The data-theme attribute for a choice (undefined = no attribute, follow the device). */
export function dataThemeFor(choice: ThemeChoice): "light" | "dark" | undefined {
  return choice === "system" ? undefined : choice;
}

/**
 * Runs in <head> before the page paints (layout.tsx), so a stored choice never flashes the wrong
 * colours. Must stay in step with choiceFromStorage / dataThemeFor (lib/theme.test.ts runs it).
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme}catch(e){}`;

/** The browser's address-bar colour for each theme: the bg token (tokens.json). */
export const THEME_COLOR = { light: "#F8F4EB", dark: "#0F1322" } as const;
