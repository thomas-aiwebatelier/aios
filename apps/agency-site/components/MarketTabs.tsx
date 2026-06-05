"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB = [
  { href: "/app/market", label: "Dashboard", exact: true },
  { href: "/app/market/creative", label: "Creative" },
  { href: "/app/market/brand", label: "Brand assets" },
  { href: "/app/market/publish", label: "Publish" },
  { href: "/app/market/monitor", label: "Monitor" },
];

export default function MarketTabs() {
  const path = usePathname();
  return (
    <nav className="msub" aria-label="Market">
      {SUB.map((s) => {
        const active = s.exact
          ? path === s.href
          : path === s.href || path.startsWith(s.href + "/");
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`msub__tab ${active ? "msub__tab--active" : ""}`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
