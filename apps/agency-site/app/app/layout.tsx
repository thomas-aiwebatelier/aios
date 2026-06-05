import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Portaal — AI Web Atelier",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/app", label: "Home" },
  { href: "/app/build", label: "Build" },
  { href: "/app/market", label: "Market" },
  { href: "/app/operate", label: "Operate" },
  { href: "/app/brand", label: "Merkkit" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already gates /app; re-check server-side as defence in depth.
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) redirect("/login?next=/app");

  return (
    <div className="portal">
      <nav className="portal-nav" aria-label="Portaalnavigatie">
        <a href="/" className="portal-nav__brand">
          AI&nbsp;Web&nbsp;Atelier
        </a>
        <div className="portal-nav__links">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="portal-nav__out">
            Afmelden
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
