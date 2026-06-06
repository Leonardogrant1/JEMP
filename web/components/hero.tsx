import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section
      className="min-h-screen relative flex items-center px-6 pt-16 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(20,184,166,0.12) 0%, rgba(59,130,246,0.10) 40%, transparent 70%), #0d0d0d",
      }}
    >
      <div
        className="hero-orb-1 absolute -left-40 -top-40 w-[600px] h-[600px] rounded-full opacity-[0.13] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="hero-orb-2 absolute right-[-100px] top-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full opacity-[0.18] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6, #14b8a6, transparent 65%)" }}
        aria-hidden="true"
      />
      <div
        className="hero-orb-3 absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-[0.10] blur-2xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center gap-12 sm:gap-16 pt-20 md:pt-0">
        <div className="flex-1 text-left">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm text-white/60 mb-6 border border-white/10">
            {t("badge")}
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-6 leading-[1.05]">
            {t("headline1")}{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              {t("headline2")}
            </span>
          </h1>

          <p className="text-white/60 text-lg max-w-md mb-10 leading-relaxed">
            {t("subtitle")}
          </p>

          <a
            href="https://apps.apple.com/app/id6762546573"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-brand-gradient font-bold text-white text-base hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {t("cta")}
          </a>
        </div>

        <div className="flex-1 flex justify-center sm:justify-end">
          <div className="relative w-80 h-[640px] sm:w-[480px] sm:h-[960px]">
            <Image
              src="/images/fadc.png"
              alt="JEMP App Screenshot"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
