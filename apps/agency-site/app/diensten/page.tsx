import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ServiceIcon from "@/components/ServiceIcon";
import { visibleServices } from "@/app/diensten/content";

export const metadata: Metadata = {
  title: "Diensten — AI Web Atelier",
  description:
    "AI-websites, AI-consultancy, AI-marketing en een AI-besturingssysteem voor je zaak. Concreet werk met AI voor Belgische zelfstandigen en kmo's.",
  alternates: { canonical: "/diensten" },
};

export default function DienstenOverviewPage() {
  // Public cards only — this page stays static. An admin reaches the hidden
  // services through the Consulting tab that NavSession adds to the header.
  const shown = visibleServices(false);

  return (
    <>
      <Nav />
      <main className="diensten-overview">
        <section className="diensten-hero" aria-label="Diensten">
          <div className="container diensten-hero__inner">
            <span className="section-eyebrow">Diensten</span>
            <h1 className="diensten-hero__title">Wat ik voor je bouw</h1>
            <p className="diensten-hero__lead">
              Van een website op maat tot een AI-laag die je hele zaak laat
              draaien. Kies waar je vandaag mee verder wil.
            </p>
          </div>
        </section>

        <section className="diensten-grid-wrap" aria-label="Onze diensten">
          <div className="container">
            <ul className="diensten-grid">
              {shown.map((service) => (
                <li key={service.slug} className="diensten-card">
                  <a
                    href={`/diensten/${service.slug}`}
                    className="diensten-card__link"
                  >
                    <span className="diensten-card__icon" aria-hidden="true">
                      <ServiceIcon icon={service.icon} size={24} />
                    </span>
                    <h2 className="diensten-card__title">{service.navTitle}</h2>
                    <p className="diensten-card__desc">{service.intro}</p>
                    <span className="diensten-card__more">Lees meer →</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
