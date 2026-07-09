import { CreatorApplicationForm } from "@/components/creator-application-form";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function CreatorApplicationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CreatorApplicationForm />;
}
