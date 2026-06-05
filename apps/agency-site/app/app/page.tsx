import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PortalHome() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">
        Welkom{user?.email ? `, ${user.email}` : ""}
      </h1>
      <p className="portal-home__lead">
        Dit wordt je portaal. Straks beheer je hier je merk en je drie modules:
      </p>
      <ul className="portal-home__modules">
        <li><strong>Build</strong> — je AI-website</li>
        <li><strong>Market</strong> — je merkkit en advertenties</li>
        <li><strong>Operate</strong> — je AI-besturingssysteem</li>
      </ul>
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn btn--ghost">Afmelden</button>
      </form>
    </main>
  );
}
