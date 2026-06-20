import AuroraBackground from "@/components/AuroraBackground";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Plugins from "@/components/landing/Plugins";
import Features from "@/components/landing/Features";
import WhatsNew from "@/components/landing/WhatsNew";
import Showcase from "@/components/landing/Showcase";
import Pricing from "@/components/landing/Pricing";
import RequestForm from "@/components/landing/RequestForm";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <AuroraBackground />
      <Nav />
      <main className="flex w-full flex-1 flex-col">
        <Hero />
        <Plugins />
        <Features />
        <WhatsNew />
        <Showcase />
        <Pricing />
        <RequestForm />
        <Footer />
      </main>
    </>
  );
}
