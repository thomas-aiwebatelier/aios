"use client";

import { createElement, useEffect, useRef, useState } from "react";
import styles from "./HandWritingText.module.css";

export interface HandWritingTextProps {
  text: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

export default function HandWritingText({
  text,
  as = "span",
  className,
}: HandWritingTextProps) {
  const Tag: React.ElementType = as;
  const ref = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const classes = [styles.root, active ? styles.active : "", className]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <span className={styles.clip} aria-hidden="true">
        <span className={styles.text}>{text}</span>
        <span className={styles.pen} />
      </span>
      <svg
        className={styles.underline}
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className={styles.stroke}
          d="M1 5 C 20 7.5, 38 2.5, 56 4.5 S 84 6.5, 99 3"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </>
  );

  return createElement(
    Tag,
    { ref, className: classes, "aria-label": text },
    inner
  );
}
