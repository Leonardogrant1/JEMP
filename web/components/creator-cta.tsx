import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/reveal";

export async function CreatorCta() {
  const t = await getTranslations("creatorCta");
  const locale = await getLocale();
  const href = locale === "de" ? "/creator-application" : `/${locale}/creator-application`;

  return (
    <section id="creator" className="px-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <Reveal className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="font-bold">{t("title")}</span>{" "}
            <span className="text-white/50">{t("subtitle")}</span>
          </div>
          <a
            href={href}
            className="inline-flex items-center gap-2 shrink-0 px-5 py-2.5 rounded-full bg-brand-gradient font-bold text-white text-sm hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20"
          >
            {t("cta")}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
