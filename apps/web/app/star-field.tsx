"use client";

// Background stars (step 0.3.7.2, D-117 item 4; amends D-065). One SVG behind the whole page: one star
// shape in <defs>, reused by a <use> per star. Made in the browser after the page has loaded, so every
// load differs and the server HTML never disagrees with the browser (nothing is rendered on the server).
// The layer covers the body, scrolls with the page, takes no clicks, is hidden from screen readers and
// grows with the page (new stars only in the new area, nothing moves). Text on the page background
// keeps its solid backing (.text-on-dust). Nothing is stored.

import { useEffect, useRef, useState } from "react";
import { emptySky, extendSky, STAR_PATH, type StarSky } from "@/lib/stars";

export function StarField() {
  const layer = useRef<HTMLDivElement>(null);
  const [sky, setSky] = useState<StarSky>(emptySky);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const grow = () => setSky((s) => extendSky(s, Math.ceil(el.clientWidth), Math.ceil(el.clientHeight), Math.random));
    grow();
    const observer = new ResizeObserver(grow);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={layer} aria-hidden="true" className="star-field">
      {sky.stars.length > 0 && (
        <svg width={sky.width} height={sky.height} className="star-field-svg" focusable="false">
          <defs>
            <path id="jathag-star" d={STAR_PATH} />
          </defs>
          {sky.stars.map((s, i) => (
            <use
              key={i}
              href="#jathag-star"
              transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${(s.size / 2).toFixed(3)})`}
              opacity={s.opacity.toFixed(2)}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
