import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { HeroBackground } from "@/components/hero-background";
import { Reveal } from "@/components/reveal";
import { ScrollSlide } from "@/components/scroll-slide";

export async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="relative px-6 pt-36 pb-0 overflow-hidden text-center bg-[#0d0d0d]">
      <HeroBackground />

      <div className="max-w-3xl mx-auto relative z-10">
        <Reveal>
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm text-white/60 mb-8 border border-white/10">
            {t("availableNow")}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
            {t("headline1")}
            <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              {t("headline2")}
            </span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            {t("subtitle")}
          </p>
        </Reveal>

        <Reveal delay={300}>
          <a
            href="/api/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-brand-gradient font-bold text-white text-base sm:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20"
          >
            {t("cta")}
          </a>
        </Reveal>

        <ScrollSlide className="relative w-96 sm:w-3xl aspect-square mx-auto mt-16">
          <Image
            src="/images/hand.png"
            alt="JEMP App Screenshot"
            fill
            style={{ objectFit: "contain", objectPosition: "top" }}
            priority
          />
        </ScrollSlide>
      </div>
    </section>
  );
}
