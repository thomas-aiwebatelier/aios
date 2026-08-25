import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ServicesOrbital from "@/components/ServicesOrbital";
import WhatWeDo from "@/components/WhatWeDo";
import Process from "@/components/Process";
import Pricing from "@/components/Pricing";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "AI Web Atelier — Vakwerk websites, gebouwd met AI",
  description:
    "Custom AI-gegenereerde websites voor Belgische ondernemers. €249 excl. btw voor het ontwerp, een herzieningsronde kost €100. Online binnen 5 werkdagen.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <ServicesOrbital />
      <WhatWeDo />
      <Process />
      <Pricing />
      <About />
      <Testimonials />
      <Contact />
      <Footer />
    </>
  );
}
