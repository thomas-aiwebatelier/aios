import { createSupabaseServerClient } from "@/lib/supabase/server";

const MODULES = [
  { href: "/app/build", title: "Build", desc: "Je AI-website — aangevraagd, gebouwd en online." },
  { href: "/app/market", title: "Market", desc: "Je merkkit en advertenties, met AI gemaakt." },
  { href: "/app/operate", title: "Operate", desc: "Je AI-besturingssysteem dat het saaie werk overneemt." },
];

export default async function PortalHome() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="container portal-home">
      <span className="section-eyebrow">Portaal</span>
      <h1 className="portal-home__title">
        Welkom{user?.email ? `, ${user.email}` : ""}
      </h1>
      <p className="portal-home__lead">Kies een module om verder te gaan.</p>
      <ul className="pcards">
        {MODULES.map((m) => (
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
