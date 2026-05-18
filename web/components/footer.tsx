import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="py-10 px-6 border-t border-white/8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white/30 text-sm">
          © {new Date().getFullYear()} {t("copyright")}
        </span>
        <nav className="flex items-center gap-6">
          <a href="/impressum" className="text-white/30 text-sm hover:text-white/60 transition-colors">
            {t("impressum")}
          </a>
          <a href="/datenschutz" className="text-white/30 text-sm hover:text-white/60 transition-colors">
            {t("privacy")}
          </a>
          <a href="/agb" className="text-white/30 text-sm hover:text-white/60 transition-colors">
            {t("terms")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
