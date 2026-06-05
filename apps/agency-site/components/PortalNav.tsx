"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/build", label: "Build" },
  { href: "/app/market", label: "Market" },
  { href: "/app/operate", label: "Operate" },
];

export default function PortalNav({ email }: { email?: string | null }) {
  const path = usePathname();
  return (
    <header className="pnav">
      <div className="container pnav__inner">
        <Link href="/app" className="pnav__brand">
          AI&nbsp;Web&nbsp;Atelier
        </Link>
        <nav className="pnav__tabs" aria-label="Modules">
          {TABS.map((t) => {
            const active = path === t.href || path.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`pnav__tab ${active ? "pnav__tab--active" : ""}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <form action="/auth/signout" method="post" className="pnav__right">
          {email && <span className="pnav__email">{email}</span>}
          <button type="submit" className="pnav__signout">
            Afmelden
          </button>
        </form>
      </div>
    </header>
  );
}
