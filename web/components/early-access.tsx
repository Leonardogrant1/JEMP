import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/reveal";

export async function EarlyAccess() {
  const t = await getTranslations("earlyAccess");

  return (
    <section id="early-access" className="relative py-32 px-6 overflow-hidden bg-[#0d0d0d]">
      {/* Full-bleed background photo with overlays */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/images/hero/1.jpeg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-brand-bg/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d] via-brand-bg/40 to-[#0d0d0d]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/15 via-transparent to-blue-500/10 mix-blend-overlay" />
      </div>

      <Reveal className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm text-white/60 mb-6 border border-white/10">
          {t("badge")}
        </div>

        <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
          {t("headline1")}{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            {t("headline2")}
          </span>
        </h2>

        <p className="text-white/60 text-lg mb-2 leading-relaxed">
          {t("subtitle")}
        </p>

        <p className="text-white/50 text-sm mb-10">{t("pricingNote")}</p>

        <div className="flex flex-col items-center gap-3">
          <a
            href="/api/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-brand-gradient font-bold text-white text-base sm:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20 whitespace-nowrap"
          >
            {t("cta")}
          </a>
          <p className="text-white/40 text-xs">{t("ctaHint")}</p>
        </div>
      </Reveal>
    </section>
  );
}
