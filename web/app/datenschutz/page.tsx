import { LegalPage } from "@/components/legal-page";

async function getContent() {
  const res = await fetch(
    "https://www.northbyte.studio/api/legal/jemp/privacy_policy",
    { next: { revalidate: 86400 } }
  );
  console.log(res.status);
  if (!res.ok) throw new Error("Failed to fetch privacy policy");
  const data = await res.json();
  return data.content as string;
}

export default async function DatenschutzPage() {
  const content = await getContent();
  return <LegalPage content={content} />;
}
