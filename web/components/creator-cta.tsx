import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";

export async function CreatorCta() {
  const t = await getTranslations("creatorCta");
  const locale = await getLocale();
  const href = locale === "de" ? "/creator-application" : `/${locale}/creator-application`;

  return (
    <section id="creator" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden px-8 py-16 sm:px-16 sm:py-20 text-center border border-white/10">
          {/* Background photo with overlays, same look as the application funnel */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <Image
              src="/images/application.jpeg"
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-brand-bg/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/80 via-brand-bg/30 to-brand-bg/90" />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/15 via-transparent to-blue-500/10 mix-blend-overlay" />
          </div>

          <div className="relative z-10 max-w-xl mx-auto">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-cyan/10 text-sm font-bold text-brand-cyan uppercase tracking-wide mb-6 border border-brand-cyan/20">
              {t("badge")}
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              {t("headline1")}{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                {t("headline2")}
              </span>
            </h2>

            <p className="text-white/70 text-lg mb-10 leading-relaxed">
              {t("subtitle")}
            </p>

            <div className="flex justify-center">
              <a
                href={href}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-gradient font-bold text-white text-base hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20"
              >
                {t("cta")}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
