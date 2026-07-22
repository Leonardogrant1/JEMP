import { CreatorCta } from "@/components/creator-cta";
import { EarlyAccess } from "@/components/early-access";
import { Faq } from "@/components/faq";
import { FeatureShowcase } from "@/components/feature-showcase";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { Testimonials } from "@/components/testimonials";
import { TrustBar } from "@/components/trust-bar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <FeatureShowcase />
        <Testimonials />
        <Faq />
        <EarlyAccess />
        <CreatorCta />
      </main>
      <Footer />
    </>
  );
}
