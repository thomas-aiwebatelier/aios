"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Order and labels mirror the public nav so the two never disagree.
// Consulting is admin-only — same rule as the public Consulting tab, and the
// real gate is middleware.ts, which 404s /app/operate for everyone else.
const TABS = [
  { href: "/app/build", label: "Website" },
  { href: "/app/video", label: "Content" },
  { href: "/app/market", label: "Marketing" },
  { href: "/app/operate", label: "Consulting", adminOnly: true },
];

export default function PortalNav({
  email,
  isAdmin = false,
}: {
  email?: string | null;
  isAdmin?: boolean;
}) {
  const path = usePathname();
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  return (
    <header className="pnav">
      <div className="container pnav__inner">
        <Link href="/app" className="pnav__brand">
          AI&nbsp;Web&nbsp;Atelier
        </Link>
        <nav className="pnav__tabs" aria-label="Modules">
          {tabs.map((t) => {
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
          {isAdmin && (
            <span className="pnav__badge" title="Je bent aangemeld als beheerder">
              Admin
            </span>
          )}
          {email && <span className="pnav__email">{email}</span>}
          <button type="submit" className="pnav__signout">
            Afmelden
          </button>
        </form>
      </div>
    </header>
  );
}
