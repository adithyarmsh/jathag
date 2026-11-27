// The "i" pop-up's rules (step 0.5.1, D-139 item 2), pure so they can be tested without a browser:
// - where the floating panel goes (under its "i", kept inside the screen edges);
// - how it opens and closes: hover on pointer devices, click / tap / Enter everywhere.
// The component is components/info-popup.tsx.

/** Gap between the "i" and the panel, and the margin kept from the screen edges (px). */
export const POPUP_GAP = 6;
export const POPUP_EDGE = 12;
/** Widest panel (spec §3.8: 320–360 px). */
export const POPUP_MAX_WIDTH = 340;
/** How long the panel stays after the mouse leaves, so the pointer can move into it (ms). */
export const HOVER_CLOSE_DELAY = 220;

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * The panel's place on the screen (position: fixed): just under the trigger, its left edge at the
 * trigger's left ("start") or its right edge at the trigger's right ("end"), then moved so it stays
 * inside the screen; never wider than the screen minus its margins.
 */
export function popupPosition(trigger: Rect, viewportWidth: number, align: "start" | "end"): { top: number; left: number; width: number } {
  const width = Math.min(POPUP_MAX_WIDTH, viewportWidth - 2 * POPUP_EDGE);
  const wanted = align === "end" ? trigger.right - width : trigger.left;
  const left = Math.min(Math.max(wanted, POPUP_EDGE), viewportWidth - POPUP_EDGE - width);
  return { top: Math.round(trigger.bottom + POPUP_GAP), left: Math.round(left), width };
}

/** Closed, opened by the mouse resting on it ("hover"), or opened on purpose ("click": click, tap, Enter). */
export type PopupState = "closed" | "hover" | "click";

export type PopupEvent =
  | "pointer-enter" // a mouse moves onto the "i" or the panel
  | "pointer-leave-timeout" // the mouse has been away for HOVER_CLOSE_DELAY
  | "trigger" // click, tap, Enter or Space on the "i"
  | "escape"
  | "outside"; // a click, tap or focus outside the "i" and the panel

export function nextPopupState(state: PopupState, event: PopupEvent): PopupState {
  switch (event) {
    case "pointer-enter":
      return state === "closed" ? "hover" : state;
    case "pointer-leave-timeout":
      return state === "hover" ? "closed" : state;
    case "trigger":
      // Opened by hover, a click keeps it open; opened by a click, a second click closes it.
      return state === "click" ? "closed" : "click";
    case "escape":
    case "outside":
      return "closed";
  }
}
