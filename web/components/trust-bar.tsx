import { getLocale, getTranslations } from "next-intl/server";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";

function AppleIcon() {
  return (
    <svg className="w-7 h-7 sm:w-[38px] sm:h-[38px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-6 h-6 sm:w-[34px] sm:h-[34px]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14.222 9.374c1.037-.61 1.037-2.137 0-2.748L11.528 5.04 8.32 8l3.207 2.96zm-3.595 2.116L7.583 8.68 1.03 14.73c.201 1.029 1.36 1.61 2.303 1.055zM1 13.396V2.603L6.846 8zM1.03 1.27l6.553 6.05 3.044-2.81L3.333.215C2.39-.341 1.231.24 1.03 1.27" />
    </svg>
  );
}

function RatingItem({ icon, rating, label }: { icon: React.ReactNode; rating: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="text-white">{icon}</div>
      <div className="text-left">
        <p className="font-bold text-lg sm:text-2xl leading-tight text-white">★ {rating}</p>
        <p className="text-white/70 text-sm sm:text-base leading-tight">{label}</p>
      </div>
    </div>
  );
}

export async function TrustBar() {
  const t = await getTranslations("trust");
  const locale = await getLocale();

  return (
    <section
      className="py-8 sm:py-12 px-6"
      style={{
        background:
          "linear-gradient(135deg, rgba(20,184,166,0.75) 0%, rgba(59,130,246,0.75) 100%)",
      }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <p className="text-white/80 text-base sm:text-2xl mb-6 sm:mb-8">
            {t("headline")}{" "}
            <span className="font-bold text-white">
              <CountUp end={10000} suffix="+" locale={locale} /> {t("highlightLabel")}
            </span>
          </p>
        </Reveal>

        <Reveal delay={150}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-0">
            <RatingItem
              icon={<AppleIcon />}
              rating={<CountUp end={4.8} decimals={1} locale={locale} duration={1800} />}
              label={t("appStore")}
            />
            <div className="hidden sm:block w-px h-12 bg-white/25 mx-14" aria-hidden="true" />
            <RatingItem
              icon={<PlayIcon />}
              rating={<CountUp end={4.8} decimals={1} locale={locale} duration={1800} />}
              label={t("playStore")}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
