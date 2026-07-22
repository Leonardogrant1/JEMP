"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Parallax layer for section backgrounds anywhere on the page. Renders an
 * absolute wrapper that extends 35% above its container and drifts downward
 * as the section scrolls through the viewport, so the photo lags behind.
 */
export function Parallax({
  children,
  speed = 0.2,
}: {
  children: React.ReactNode;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const container = el.parentElement;
    if (!container) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      el.style.transform = `translate3d(0, ${(vh - rect.top) * speed}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div
      ref={ref}
      className="absolute inset-x-0 -top-[35%] bottom-0"
      style={{ willChange: "transform" }}
    >
      {children}
    </div>
  );
}
