import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/reveal";

export async function Testimonials() {
  const t = await getTranslations("testimonials");
  const items = t.raw("items") as { quote: string; name: string; role: string }[];

  return (
    <section id="testimonials" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            {t("headline1")}{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              {t("headline2")}
            </span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <Reveal
              key={i}
              delay={i * 120}
              className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col gap-4"
            >
              <div className="bg-brand-gradient bg-clip-text text-transparent font-bold tracking-widest">
                ★★★★★
              </div>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed flex-1">
                {item.quote}
              </p>
              <div>
                <p className="font-bold text-sm">{item.name}</p>
                <p className="text-white/40 text-xs">{item.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
