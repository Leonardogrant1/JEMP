import { getTranslations } from "next-intl/server";

export async function EarlyAccess() {
  const t = await getTranslations("earlyAccess");

  return (
    <section id="early-access" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden px-8 py-16 sm:px-16 sm:py-20 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(59,130,246,0.15) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(59,130,246,0.12) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-xl mx-auto">
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm text-white/60 mb-6 border border-white/10">
              {t("badge")}
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              {t("headline1")}{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                {t("headline2")}
              </span>
            </h2>

            <p className="text-white/60 text-lg mb-10 leading-relaxed">
              {t("subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href="https://apps.apple.com/app/id6762546573"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl sm:px-10 sm:py-5 sm:rounded-2xl bg-brand-gradient font-bold text-white text-base sm:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20 w-full sm:w-auto justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                {t("ctaAppStore")}
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=studio.northbyte.jemp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl sm:px-10 sm:py-5 sm:rounded-2xl bg-brand-gradient font-bold text-white text-base sm:text-lg hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20 w-full sm:w-auto justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M14.222 9.374c1.037-.61 1.037-2.137 0-2.748L11.528 5.04 8.32 8l3.207 2.96zm-3.595 2.116L7.583 8.68 1.03 14.73c.201 1.029 1.36 1.61 2.303 1.055zM1 13.396V2.603L6.846 8zM1.03 1.27l6.553 6.05 3.044-2.81L3.333.215C2.39-.341 1.231.24 1.03 1.27"/>
                </svg>
                {t("ctaPlayStore")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
