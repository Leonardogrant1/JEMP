import { CreatorCta } from "@/components/creator-cta";
import { EarlyAccess } from "@/components/early-access";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CreatorCta />
        <EarlyAccess />
      </main>
      <Footer />
    </>
  );
}
