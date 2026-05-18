import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface LegalPageProps {
  content: string;
}

export function LegalPage({ content }: LegalPageProps) {
  return (
    <>
      {/* Minimal navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-brand-bg/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="JEMP" width={28} height={28} />
            <span className="font-black text-lg tracking-tight text-white">JEMP</span>
          </Link>
        </div>
      </header>

      <main className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto prose prose-invert prose-headings:font-black prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-p:text-white/70 prose-p:leading-relaxed prose-li:text-white/70 prose-strong:text-white prose-a:text-brand-cyan prose-hr:border-white/10">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </main>
    </>
  );
}
