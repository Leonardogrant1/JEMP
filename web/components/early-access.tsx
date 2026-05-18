import { getTranslations } from "next-intl/server";
import { WaitlistForm } from "./waitlist-form";

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

            <div className="flex justify-center">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
