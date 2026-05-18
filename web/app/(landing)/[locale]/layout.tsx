import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "JEMP — Train like a pro athlete",
  description: "The training app built for serious athletes.",
  icons: { icon: "/logo.svg" },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Set the locale for all server components in this subtree
  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div lang={locale} className="bg-brand-bg text-white font-sans antialiased">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
