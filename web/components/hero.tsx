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
            href="/api/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl sm:px-10 sm:py-5 sm:rounded-2xl bg-brand-gradient font-bold text-white text-base sm:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20"
          >
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
