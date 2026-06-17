import Link from "next/link";
import Image from "next/image";

export default function ImprintPage() {
  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/8 bg-brand-bg/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="JEMP" width={28} height={28} />
            <span className="font-black text-lg tracking-tight text-white">JEMP</span>
          </Link>
        </div>
      </header>

      <main className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black tracking-tight mb-10">Imprint</h1>

          <section className="mb-8">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3">
              Information pursuant to § 5 TMG
            </h2>
            <p className="text-white/70 leading-relaxed">
              Leonardo Granetto<br />
              studio.northbyte<br />
              Biebricher Straße 7f<br />
              55252 Mainz-Kastel<br />
              Germany
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3">
              Contact
            </h2>
            <p className="text-white/70 leading-relaxed">
              Phone:{" "}
              <a href="tel:+4915203360004" className="text-brand-cyan hover:opacity-80 transition-opacity">
                +49 152 0336 0004
              </a>
              <br />
              Email:{" "}
              <a href="mailto:info@northbyte.studio" className="text-brand-cyan hover:opacity-80 transition-opacity">
                info@northbyte.studio
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-3">
              Responsible for the Content
            </h2>
            <p className="text-white/70 leading-relaxed">
              Leonardo Granetto<br />
              Biebricher Straße 7f<br />
              55252 Mainz-Kastel<br />
              Germany
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
