import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  localePrefix: "as-needed",
});


export const config = {
  matcher: ['/((?!admin|api|_next|_vercel|.*\\..*).*)'],
};