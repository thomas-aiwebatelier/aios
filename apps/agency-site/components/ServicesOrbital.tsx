"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ServicesOrbital.module.css";

type Service = {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
};

const services: Service[] = [
  {
    id: "websites",
    title: "AI-websites",
    desc: "Websites op maat, gebouwd met AI — inclusief hosting en onderhoud. Eenmalig €499, optioneel €9,99/maand.",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="4" width="19" height="13" rx="2" />
        <path d="M2.5 9h19" />
        <path d="M9 20h6M12 17v3" />
      </svg>
    ),
  },
  {
    id: "consultancy",
    title: "AI-consultancy",
    desc: "Advies over hoe AI uw bedrijf concreet vooruithelpt — van strategie tot de juiste tools.",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
      </svg>
    ),
  },
  {
    id: "marketing",
    title: "AI-marketing",
    desc: "Creatieve generatie én performance marketing. Content die opvalt, campagnes die renderen.",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20V9" />
        <path d="M10 20V5" />
        <path d="M16 20v-7" />
        <path d="M21 4l-4 4-3-2-4 3" />
      </svg>
    ),
  },
  {
    id: "os",
    title: "AI-besturingssysteem",
    desc: "Een AI-OS dat uw terugkerende taken automatiseert en uw tools met elkaar verbindt.",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

function HubMark() {
  return (
    <svg viewBox="0 0 50 50" width="46" height="46" fill="none" aria-hidden="true">
      <path d="M11 40 L23 13" stroke="var(--color-forest)" strokeWidth="4" strokeLinecap="round" />
      <path d="M37 40 L25 13" stroke="var(--color-forest)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="28" r="4.8" fill="var(--color-accent)" />
    </svg>
  );
}

export default function ServicesOrbital() {
  const [active, setActive] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const blurTimer = useRef<number | null>(null);

  // Resume only when nothing is active and pointer/focus has left.
  useEffect(() => {
    if (active === null) setPaused(false);
  }, [active]);

  const select = (i: number) => {
    setActive((prev) => (prev === i ? null : i));
    setPaused((prev) => (active === i ? false : true));
  };

  const onEnter = (i: number) => {
    setActive(i);
    setPaused(true);
  };

  const onLeaveRing = () => {
    // Defer so moving between nodes doesn't flicker resume.
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => {
      setActive(null);
      setPaused(false);
    }, 120);
  };

  const onEnterRing = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  };

  const count = services.length;
  const activeService = active !== null ? services[active] : null;

  return (
    <section id="diensten" className={styles.section} aria-label="Onze diensten">
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Onze diensten</span>
          <h2 className={styles.title}>Wat we voor u bouwen</h2>
        </header>

        {/* Orbital visual — wider screens only */}
        <div
          className={styles.stage}
          onMouseEnter={onEnterRing}
          onMouseLeave={onLeaveRing}
        >
          <div
            className={`${styles.ring} ${paused ? styles.ringPaused : ""}`}
          >
            <span className={styles.orbitLine} aria-hidden="true" />
            {services.map((s, i) => {
              const angle = (360 / count) * i;
              const isActive = active === i;
              return (
                <div
                  key={s.id}
                  className={styles.nodeSlot}
                  style={{ ["--angle" as string]: `${angle}deg` }}
                >
                  <span className={styles.connector} aria-hidden="true" />
                  <div className={styles.nodeCounter}>
                    <button
                      type="button"
                      className={`${styles.node} ${isActive ? styles.nodeActive : ""}`}
                      aria-pressed={isActive}
                      aria-label={s.title}
                      onClick={() => select(i)}
                      onMouseEnter={() => onEnter(i)}
                      onFocus={() => onEnter(i)}
                    >
                      <span className={styles.nodeIcon}>{s.icon}</span>
                    </button>
                    <span className={styles.nodeLabel}>{s.title}</span>
                  </div>
                </div>
              );
            })}

            <div className={styles.hubCounter}>
              <div className={styles.hub}>
                <HubMark />
                <span className={styles.hubLabel}>AI Web Atelier</span>
              </div>
            </div>
          </div>

          <div
            className={`${styles.panel} ${activeService ? styles.panelVisible : ""}`}
            role="status"
            aria-live="polite"
          >
            {activeService && (
              <>
                <h3 className={styles.panelTitle}>{activeService.title}</h3>
                <p className={styles.panelDesc}>{activeService.desc}</p>
                <a className={styles.panelLink} href="#contact">
                  Vraag een voorbeeld →
                </a>
              </>
            )}
          </div>
        </div>

        {/* Vertical card stack — narrow screens */}
        <ul className={styles.cards}>
          {services.map((s) => (
            <li key={s.id} className={styles.card}>
              <span className={styles.cardIcon}>{s.icon}</span>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardDesc}>{s.desc}</p>
                <a className={styles.cardLink} href="#contact">
                  Vraag een voorbeeld →
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
