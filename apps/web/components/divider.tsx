"use client";

// Section divider (design spec §3.6, FR-UI-14): a hairline on each side of one 14 px gold four-point
// star, decoration only (aria-hidden). 44 px above and below on phones, 64 px on desktop; `inGrid`
// subtracts the gap of a grid it sits in (24 / 40 px), so the distance stays 44 / 64. Fades in once when it scrolls into view
// (motion 1); the server HTML is visible, the fade is only added by script, never with reduced motion.

import { useEffect, useRef } from "react";
import { STAR_D } from "./icons";

export function Divider({ inGrid = false, className = "" }: { inGrid?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: no fade
    el.dataset.fade = "wait";
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        el.dataset.fade = "in";
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={["divider", inGrid ? "divider-in-grid" : "", className].filter(Boolean).join(" ")}>
      <span className="divider-line" />
      <svg viewBox="0 0 24 24" className="divider-star" focusable="false">
        <path d={STAR_D} />
      </svg>
      <span className="divider-line" />
    </div>
  );
}
