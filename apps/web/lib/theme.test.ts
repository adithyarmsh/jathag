// Theme choice (step 0.4.5, FR-UI-02): the stored value → data-theme on <html>. The real inline script
// from layout.tsx (THEME_SCRIPT) is run against a stand-in localStorage and <html>, so what is tested
// is exactly what ships.
import { describe, expect, it } from "vitest";
import { choiceFromStorage, dataThemeFor, THEME_KEY, THEME_SCRIPT } from "./theme";

function runScript(stored: string | null, before?: string, storageThrows = false) {
  const dataset: Record<string, string> = before ? { theme: before } : {};
  const localStorage = {
    getItem(key: string) {
      if (storageThrows) throw new Error("blocked");
      return key === THEME_KEY ? stored : null;
    },
  };
  const document = { documentElement: { dataset } };
  new Function("localStorage", "document", THEME_SCRIPT)(localStorage, document);
  return dataset.theme;
}

describe("theme script before the page paints", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", undefined],
    [null, undefined], // a new visitor: Match device
    ["blue", undefined], // anything unknown: Match device
    ["", undefined],
  ] as const)("stored %s → data-theme %s", (stored, expected) => {
    expect(runScript(stored)).toBe(expected);
  });

  it("an old 0.1.5–0.9.1 value (light / dark) keeps working", () => {
    expect(runScript("dark")).toBe("dark");
    expect(runScript("light")).toBe("light");
  });

  it("system removes a data-theme that was there", () => {
    expect(runScript("system", "dark")).toBeUndefined();
  });

  it("blocked storage never breaks the page", () => {
    expect(() => runScript(null, undefined, true)).not.toThrow();
  });

  it("matches the rules used by the theme controls", () => {
    for (const stored of ["light", "dark", "system", null, "x"]) {
      expect(runScript(stored)).toBe(dataThemeFor(choiceFromStorage(stored)));
    }
  });

  it("uses the existing storage key and stores nothing else", () => {
    expect(THEME_KEY).toBe("theme");
    expect(THEME_SCRIPT).not.toMatch(/setItem|cookie/);
  });
});
