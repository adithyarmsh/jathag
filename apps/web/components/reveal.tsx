"use client";

// Fade-up on scroll (design spec §2, motions 1 and 5): a section moves 8 px up and fades in once, 400 ms,
// when it first comes into view, and the progress bars inside it fill from 0 at the same moment. The
// server HTML is fully visible: the waiting state is only added by script, only for a section that is
// still below the screen, and never with reduced motion (the same rule as the star divider).

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({ as: Tag = "div", id, className, labelledBy, children }: {
  as?: "div" | "section";
  id?: string;
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: no motion
    el.dataset.reveal = "wait";
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        el.dataset.reveal = "in";
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} id={id} className={className} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  );
}
