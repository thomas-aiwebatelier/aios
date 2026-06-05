import type { ServiceContent } from "@/app/diensten/content";
import ServiceIcon from "@/components/ServiceIcon";
import Faq from "@/components/Faq";
import UrlCaptureForm from "@/components/UrlCaptureForm";

const SELF_SERVE = new Set(["build", "market", "operate"]);

export default function ServicePage({ service }: { service: ServiceContent }) {
  return (
    <main className="servicepage">
      {/* Hero */}
      <section className="svc-hero" aria-label={service.title}>
        <div className="container svc-hero__inner">
          <span className="svc-hero__icon" aria-hidden="true">
            <ServiceIcon icon={service.icon} size={30} />
          </span>
          <span className="section-eyebrow">{service.eyebrow}</span>
          <h1 className="svc-hero__title">{service.title}</h1>
          <p className="svc-hero__lead">{service.heroLead}</p>
          {SELF_SERVE.has(service.slug) ? (
            <UrlCaptureForm
              product={service.slug as "build" | "market" | "operate"}
              cta={service.heroCtaLabel}
            />
          ) : (
            <a href={service.heroCtaHref} className="btn btn--primary svc-hero__cta">
              {service.heroCtaLabel}
            </a>
          )}
        </div>
      </section>

      {/* Problem / solution */}
      <section className="svc-ps" aria-label="Probleem en aanpak">
        <div className="container svc-ps__grid">
          <article className="svc-ps__card svc-ps__card--problem">
            <h2 className="svc-ps__title">{service.problemTitle}</h2>
            <p className="svc-ps__body">{service.problemBody}</p>
          </article>
          <article className="svc-ps__card svc-ps__card--solution">
            <h2 className="svc-ps__title">{service.solutionTitle}</h2>
            <p className="svc-ps__body">{service.solutionBody}</p>
          </article>
        </div>
      </section>

      {/* Includes */}
      <section className="svc-includes" aria-label={service.includesTitle}>
        <div className="container">
          <h2 className="section-title svc-includes__title">
            {service.includesTitle}
          </h2>
          <ul className="svc-includes__list">
            {service.includes.map((item) => (
              <li key={item} className="svc-includes__item">
                <span className="svc-includes__check" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className="svc-process" aria-label="Werkwijze">
        <div className="container">
          <span className="section-eyebrow">Werkwijze</span>
          <h2 className="section-title svc-process__title">Zo gaan we te werk</h2>
          <ol className="svc-process__steps">
            {service.process.map((step) => (
              <li key={step.label} className="svc-process__step">
                <span className="svc-process__label">{step.label}</span>
                <h3 className="svc-process__step-title">{step.title}</h3>
                <p className="svc-process__step-body">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="svc-faq" id="faq" aria-label="Veelgestelde vragen">
        <div className="container svc-faq__inner">
          <span className="section-eyebrow">Veelgestelde vragen</span>
          <h2 className="section-title svc-faq__title">Goed om te weten</h2>
          <Faq items={service.faq} />
        </div>
      </section>

      {/* CTA band */}
      <section className="svc-cta" aria-label="Aan de slag">
        <div className="container svc-cta__inner">
          <h2 className="svc-cta__title">{service.ctaTitle}</h2>
          <p className="svc-cta__body">{service.ctaBody}</p>
          <a href={service.ctaHref} className="btn btn--primary svc-cta__btn">
            {service.ctaLabel}
          </a>
        </div>
      </section>
    </main>
  );
}
