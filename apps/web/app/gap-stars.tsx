"use client";

// The background stars in the desktop gap above the fixed details bar (D-140 item 2b). The gap is filled
// with the page background so the page content (sections, cards, divider stars) disappears under it
// when it scrolls past (D-139), but the background stars should still be seen passing there.
//
// Method: the gap keeps its solid fill and shows a clipped copy of the page's own star layer: one SVG
// <use> of the star group drawn by app/star-field.tsx (SKY_ID), moved so every star sits exactly where
// the real one would be. The offset is the body's position minus the gap's position, both read from
// getBoundingClientRect once per animation frame while the page scrolls or resizes, then written as a
// transform (one read, then one write: no layout thrash; the copy never changes layout). The copy is
// decoration only: aria-hidden, no clicks, and it covers only the empty gap, never any text.
// Phones and tablets have no gap (the bar scrolls away), so it is hidden there by CSS.

import { useEffect, useRef } from "react";
import { SKY_ID } from "./star-field";

export function GapStars() {
  const gapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const gap = gapRef.current;
    const svg = svgRef.current;
    if (!gap || !svg) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const g = gap.getBoundingClientRect();
      if (g.width === 0) return; // hidden (below 1024 px)
      const b = document.body.getBoundingClientRect();
      svg.style.transform = `translate(${b.left - g.left}px, ${b.top - g.top}px)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={gapRef} aria-hidden="true" className="gap-stars">
      <svg ref={svgRef} width="1" height="1" className="gap-stars-svg" focusable="false">
        <use href={`#${SKY_ID}`} />
      </svg>
    </div>
  );
}
