import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguagePicker } from "./language-picker";

export async function Navbar() {
  const t = await getTranslations("nav");
  const locale = await getLocale();
  const creatorHref = locale === "de" ? "/creator-application" : `/${locale}/creator-application`;

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-brand-bg/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="JEMP" width={28} height={28} priority />
          <span className="font-black text-lg tracking-tight text-white">JEMP</span>
        </div>

        <nav className="hidden sm:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            {t("features")}
          </a>
          <a href="/api/download" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            {t("earlyAccess")}
          </a>
          <a href={creatorHref} className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            {t("creator")}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <LanguagePicker />
          <a
            href="/api/download"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-brand-gradient font-bold text-sm text-white hover:opacity-90 transition-opacity"
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </header>
  );
}
