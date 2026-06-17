import { LegalPage } from "@/components/legal-page";

async function getContent() {
  const res = await fetch(
    "https://www.northbyte.studio/api/legal/jemp/terms_of_use",
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error("Failed to fetch terms of use");
  const data = await res.json();
  return data.content as string;
}

export default async function TermsOfServicePage() {
  const content = await getContent();
  return <LegalPage content={content} />;
}
