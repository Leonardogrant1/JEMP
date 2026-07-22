"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const BACKGROUNDS = ["/images/hero/1.jpeg", "/images/hero/2.jpeg"];

export function HeroBackground() {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Random pick must happen on the client: the page is statically prerendered,
  // so a server-side pick would be frozen at build time.
  useEffect(() => {
    setSrc(BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]);
  }, []);

  // Parallax: the photo scrolls at ~1/3 of the page speed. The wrapper extends
  // 40% above the section so the downward shift never exposes an edge.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const el = parallaxRef.current;
      if (!el) return;
      el.style.transform = `translate3d(0, ${window.scrollY * 0.35}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        ref={parallaxRef}
        className="absolute inset-x-0 -top-[40%] bottom-0"
        style={{ willChange: "transform" }}
      >
        {src && (
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            priority
            onLoad={() => setLoaded(true)}
            className={`object-cover object-[center_30%] transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-brand-bg/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/80 via-brand-bg/30 to-[#0d0d0d]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/15 via-transparent to-blue-500/10 mix-blend-overlay" />
    </div>
  );
}
