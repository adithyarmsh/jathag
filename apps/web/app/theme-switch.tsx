"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const media = "(prefers-color-scheme: dark)";

// The theme currently on screen: the switch's choice if made, otherwise the device setting.
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia(media).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(media);
  mq.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => {
    mq.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

export function ThemeSwitch({ label }: { label: string }) {
  // The knob's position is drawn by CSS, so it is right even before this code runs.
  const isDark = useSyncExternalStore(subscribe, () => currentTheme() === "dark", () => false);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be blocked (e.g. private browsing); the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      onClick={toggle}
      className="relative inline-flex h-7 w-[3.125rem] shrink-0 cursor-pointer items-center rounded-full border border-accent-border bg-bg p-0.5 text-accent-text"
    >
      {/* Icon shown on the side the knob is NOT on */}
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-between px-1.5">
        <svg viewBox="0 0 24 24" className="theme-icon-sun h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg viewBox="0 0 24 24" className="theme-icon-moon h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
      <span aria-hidden="true" className="theme-knob relative h-5 w-5 rounded-full bg-accent" />
    </button>
  );
}
