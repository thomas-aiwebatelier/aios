import type { Metadata } from "next";
import Hero from "@/components/Hero";
import WhatWeDo from "@/components/WhatWeDo";
import Process from "@/components/Process";
import Pricing from "@/components/Pricing";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "AI Web Atelier — Vakwerk websites, gebouwd met AI",
  description:
    "Custom AI-gegenereerde websites voor Belgische ondernemers. €499 eenmalig, inclusief één herzieningsronde. Online binnen 7 dagen.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhatWeDo />
      <Process />
      <Pricing />
      <About />
      <Contact />
      <Footer />
    </>
  );
}
