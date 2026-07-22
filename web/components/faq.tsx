import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/reveal";

export async function Faq() {
  const t = await getTranslations("faq");
  const items = t.raw("items") as { question: string; answer: string }[];

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            {t("headline1")}{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              {t("headline2")}
            </span>
          </h2>
        </Reveal>

        <Reveal delay={150} className="border-t border-white/10">
          {items.map((item, i) => (
            <details key={i} className="faq-item group border-b border-white/10">
              <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none font-bold text-base sm:text-lg [&::-webkit-details-marker]:hidden">
                {item.question}
                <svg
                  className="w-5 h-5 shrink-0 text-white/40 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="pb-5 text-white/50 text-sm sm:text-base leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
