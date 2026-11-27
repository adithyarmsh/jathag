// The "i" pop-up (D-139 item 2): where the floating panel goes and how it opens and closes. The
// browser side (hover, Esc, focus) was checked in the preview (PR report).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOVER_CLOSE_DELAY, nextPopupState, POPUP_EDGE, POPUP_GAP, popupPosition, type PopupEvent, type PopupState } from "./info-popup";

const rect = (left: number, top = 300, size = 44) => ({ left, right: left + size, top, bottom: top + size });

describe("where the panel floats", () => {
  it("under its i, left edges together (start) or right edges together (end)", () => {
    expect(popupPosition(rect(600), 1280, "start")).toEqual({ top: 344 + POPUP_GAP, left: 600, width: 340 });
    expect(popupPosition(rect(900), 1280, "end")).toEqual({ top: 350, left: 944 - 340, width: 340 });
  });
  it("kept inside the screen edges, and never wider than the screen on a 360 px phone", () => {
    expect(popupPosition(rect(1250), 1280, "start").left).toBe(1280 - POPUP_EDGE - 340);
    expect(popupPosition(rect(2), 1280, "end").left).toBe(POPUP_EDGE);
    const phone = popupPosition(rect(300), 360, "start");
    expect(phone.width).toBe(360 - 2 * POPUP_EDGE);
    expect(phone.left).toBe(POPUP_EDGE);
    expect(phone.left + phone.width).toBeLessThanOrEqual(360 - POPUP_EDGE);
  });
  it("floats (position: fixed): opening it shifts nothing on the page", () => {
    const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
    const rule = /\n\.info-panel \{([^}]*)\}/.exec(css)![1]!;
    expect(rule).toContain("position: fixed;");
    expect(rule).not.toMatch(/\bposition: (absolute|relative|static)/);
  });
});

describe("opening and closing", () => {
  const run = (events: PopupEvent[], from: PopupState = "closed") => events.reduce(nextPopupState, from);
  it("mouse: hover opens, leaving closes after a short delay, unless it was clicked meanwhile", () => {
    expect(run(["pointer-enter"])).toBe("hover");
    expect(run(["pointer-enter", "pointer-leave-timeout"])).toBe("closed");
    expect(run(["pointer-enter", "trigger", "pointer-leave-timeout"])).toBe("click");
    expect(HOVER_CLOSE_DELAY).toBeGreaterThanOrEqual(150);
    expect(HOVER_CLOSE_DELAY).toBeLessThanOrEqual(400);
  });
  it("click, tap or Enter opens; the trigger again closes; Esc and outside always close", () => {
    expect(run(["trigger"])).toBe("click");
    expect(run(["trigger", "trigger"])).toBe("closed");
    expect(run(["trigger", "pointer-enter"])).toBe("click");
    for (const from of ["hover", "click"] as const) {
      expect(run(["escape"], from)).toBe("closed");
      expect(run(["outside"], from)).toBe("closed");
    }
  });
});
