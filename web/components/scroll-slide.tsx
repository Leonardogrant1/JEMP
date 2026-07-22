"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Scroll-linked slide-in: the element sits `distance` px lower and moves up
 * proportionally as it scrolls into view (reversible, unlike Reveal).
 */
export function ScrollSlide({
  children,
  distance = 140,
  className = "",
}: {
  children: React.ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 while the element top is at the viewport bottom, 1 once it has
      // travelled 60% of the viewport height upwards.
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.6)));
      el.style.transform = `translateY(${(1 - progress) * distance}px)`;
      el.style.opacity = `${0.3 + progress * 0.7}`;
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
  }, [distance]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform, opacity" }}>
      {children}
    </div>
  );
}
