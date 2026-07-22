import { Parallax } from "@/components/parallax";
import { Reveal } from "@/components/reveal";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";

// Drop a looping clip at the video path to replace the screenshot for that block.
const BLOCKS = [
  { screenshot: "/images/hero.png", video: "/videos/benefits/onboarding.mp4" },
  { screenshot: "/images/progress.png", video: "/videos/benefits/assessments.mp4" },
  { screenshot: "/images/fadc.png", video: "/videos/benefits/progress.mp4" },
];

export async function FeatureShowcase() {
  const t = await getTranslations("showcase");
  const items = t.raw("items") as { badge: string; title: string; description: string }[];

  return (
    <section id="features" className="relative pt-44 pb-24 px-6 overflow-hidden bg-[#0d0d0d]">
      {/* Full-bleed background photo with overlays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <Parallax speed={0.2}>
          <Image
            src="/images/hero/2.jpeg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
          />
        </Parallax>
        <div className="absolute inset-0 bg-brand-bg/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d] via-brand-bg/60 to-[#0d0d0d]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/15 via-transparent to-blue-500/10 mix-blend-overlay" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <Reveal className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
            {t("headline1")}
            <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              {t("headline2")}
            </span>
          </h2>
          <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </Reveal>

        <div className="flex flex-col gap-20 sm:gap-28">
          {items.map((item, i) => {
            const hasVideo = existsSync(path.join(process.cwd(), "public", BLOCKS[i].video));
            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-10 sm:gap-16 sm:flex-row ${i % 2 === 1 ? "sm:flex-row-reverse" : ""
                  }`}
              >
                <Reveal className="flex-1 text-center sm:text-left">
                  <div className="inline-block px-3 py-1 rounded-full bg-brand-cyan/10 text-sm font-bold text-brand-cyan uppercase tracking-wide mb-5 border border-brand-cyan/20">
                    {item.badge}
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-md mx-auto sm:mx-0">
                    {item.description}
                  </p>
                </Reveal>

                <div className="flex-1 w-full">
                  <div
                    className="rounded-3xl p-px"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(20,184,166,0.5) 0%, rgba(59,130,246,0.5) 100%)",
                      boxShadow: "0 0 60px rgba(20,184,166,0.15)",
                    }}
                  >
                    <div className="relative rounded-[calc(1.5rem-1px)] overflow-hidden h-[420px] sm:h-[520px] bg-black">
                    {hasVideo ? (
                      <video
                        className="absolute inset-0 w-full h-full object-contain p-6"
                        src={BLOCKS[i].video}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <Image
                        src={BLOCKS[i].screenshot}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 480px"
                        style={{ objectFit: "contain" }}
                        className="p-6"
                      />
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
