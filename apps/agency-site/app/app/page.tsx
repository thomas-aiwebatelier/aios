import { getRole } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Same modules, same order, same labels as the tabs in components/PortalNav.tsx.
// If you add one here, add it there too — and to PRODUCTS in app/[product]/page.tsx.
const MODULES = [
  { href: "/app/build", title: "Website", desc: "Je AI-website — aangevraagd, gebouwd en online." },
  { href: "/app/video", title: "Content", desc: "Je AI-commercial van 15 seconden, klaar om te delen." },
  { href: "/app/market", title: "Marketing", desc: "Je merkkit en advertenties, met AI gemaakt." },
  {
    href: "/app/operate",
    title: "Consulting",
    desc: "Je AI-besturingssysteem dat het saaie werk overneemt.",
    adminOnly: true,
  },
];

export default async function PortalHome() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user ? (await getRole(supabase, user.id)) === "admin" : false;
  const modules = MODULES.filter((m) => !m.adminOnly || isAdmin);

  return (
    <main className="container portal-home">
      <span className="section-eyebrow">Portaal</span>
      <h1 className="portal-home__title">
        Welkom{user?.email ? `, ${user.email}` : ""}
      </h1>
      <p className="portal-home__lead">Kies een module om verder te gaan.</p>
      <ul className="pcards">
        {modules.map((m) => (
          <li key={m.href} className="pcard">
            <a href={m.href} className="pcard__link">
              <h2 className="pcard__title">{m.title}</h2>
              <p className="pcard__desc">{m.desc}</p>
              <span className="pcard__more">Open →</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
