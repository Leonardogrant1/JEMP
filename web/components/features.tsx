import Image from "next/image";
import { getTranslations } from "next-intl/server";

const ICONS = ["/Basketball.svg", "/Chart.svg", "/Gym.svg", "/Chart.svg"];

function GradientIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        maskImage: `url(${src})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        background: "linear-gradient(135deg, #14b8a6, #3b82f6)",
        width: 28,
        height: 28,
      }}
    />
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/[0.08] transition-colors flex flex-col gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
        <GradientIcon src={icon} alt={title} />
      </div>
      <div>
        <h3 className="font-bold text-base mb-1">{title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export async function Features() {
  const t = await getTranslations("features");
  const items = t.raw("items") as { title: string; description: string }[];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            {t("headline1")}{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              {t("headline2")}
            </span>
          </h2>
          <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_1fr] grid-rows-[auto_auto] gap-4">
          <div className="flex flex-col gap-4">
            {items.slice(0, 2).map((item, i) => (
              <FeatureCard key={i} icon={ICONS[i]} title={item.title} description={item.description} />
            ))}
          </div>

          <div
            className="relative rounded-2xl border border-white/10 overflow-hidden row-span-2 min-h-[380px] sm:min-h-0 flex items-end"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(59,130,246,0.18) 0%, rgba(20,184,166,0.10) 40%, #111318 70%)",
            }}
          >
            <Image
              src="/images/progress.png"
              alt="JEMP App"
              fill
              style={{ objectFit: "cover", objectPosition: "top center" }}
            />
            <div className="relative z-10 pt-10 pb-5 px-5 w-full bg-linear-to-t from-black/90 via-black/60 to-transparent">
              <p className="font-black text-lg leading-snug">
                {t("centerTitle1")}{" "}
                <span className="bg-brand-gradient bg-clip-text text-transparent">
                  {t("centerTitle2")}
                </span>
              </p>
              <p className="text-white/60 text-sm mt-1">{t("centerSubtitle")}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {items.slice(2, 4).map((item, i) => (
              <FeatureCard key={i} icon={ICONS[i + 2]} title={item.title} description={item.description} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
