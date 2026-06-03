"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./Testimonials.module.css";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  tile: "peach" | "sage" | "sage-tint";
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Ze maakten AI aanvoelen als een collega, niet als een bedreiging. Eindelijk staat de site online waar ik twee jaar over twijfelde.",
    name: "Voorbeeld — bakkerij",
    role: "Zaakvoerder, Antwerpen",
    initials: "B",
    tile: "peach",
  },
  {
    quote:
      "Eerlijke prijs, duidelijke afspraken, online binnen de week. Geen verrassingen achteraf.",
    name: "Voorbeeld — advocatenkantoor",
    role: "Vennoot, Gent",
    initials: "A",
    tile: "sage",
  },
  {
    quote:
      "Mijn boekingen lopen nu via de site. Het voelt als vakwerk, niet als een sjabloon.",
    name: "Voorbeeld — bloemist",
    role: "Eigenaar, Mechelen",
    initials: "F",
    tile: "sage-tint",
  },
];

const AUTOPLAY_MS = 5000;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={direction === "prev" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const count = testimonials.length;

  useEffect(() => {
    setReduced(prefersReducedMotion());
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = useCallback(
    (dir: 1 | -1) => {
      setActive((prev) => (prev + dir + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused, count]);

  const current = testimonials[active];
  const words = current.quote.split(" ");

  return (
    <section id="getuigenissen" className={styles.section} aria-label="Wat klanten zeggen">
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Wat klanten zeggen</span>
          <h2 className={styles.title}>Mensen staan centraal</h2>
        </div>

        <div
          className={styles.carousel}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className={styles.deck} aria-hidden="true">
            {testimonials.map((t, i) => {
              const offset = (i - active + count) % count;
              return (
                <div
                  key={t.name}
                  className={`${styles.card} ${offset === 0 ? styles.cardActive : ""} ${
                    reduced ? styles.cardReduced : ""
                  }`}
                  data-tile={t.tile}
                  style={{ "--offset": offset } as CSSProperties}
                >
                  <span className={styles.initials}>{t.initials}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.content}>
            <blockquote
              key={reduced ? undefined : active}
              className={styles.quote}
            >
              {reduced
                ? current.quote
                : words.map((word, i) => (
                    <span
                      key={`${active}-${i}`}
                      className={styles.word}
                      style={{ "--wi": i } as CSSProperties}
                    >
                      {word}{" "}
                    </span>
                  ))}
            </blockquote>

            <div className={styles.person}>
              <span className={styles.name}>{current.name}</span>
              <span className={styles.role}>{current.role}</span>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => go(-1)}
                aria-label="Vorige getuigenis"
              >
                <ArrowIcon direction="prev" />
              </button>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => go(1)}
                aria-label="Volgende getuigenis"
              >
                <ArrowIcon direction="next" />
              </button>
            </div>
          </div>
        </div>

        <p className={styles.caption}>
          Voorbeeldgetuigenissen — echte klantengetuigenissen volgen.
        </p>
      </div>
    </section>
  );
}
