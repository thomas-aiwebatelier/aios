import { notFound, redirect } from "next/navigation";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startFromUrl } from "@/lib/brand-actions";
import OperateIntakeForm from "@/components/OperateIntakeForm";

const PRODUCTS: Record<string, { title: string; cta: string }> = {
  build: { title: "Build — je AI-website", cta: "Bouw mijn site" },
  market: { title: "Market — je merkkit & advertenties", cta: "Maak mijn merkkit" },
  operate: { title: "Operate — je AI-besturingssysteem", cta: "Start de intake" },
};

export default async function ProductModule({
  params,
  searchParams,
}: {
  params: Promise<{ product: string }>;
  searchParams: Promise<{ url?: string }>;
}) {
  const { product } = await params;
  const { url } = await searchParams;
  const meta = PRODUCTS[product];
  if (!meta) notFound();

  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) redirect(`/login?next=/app/${product}`);

  const { data: brand } = await supabase
    .from("brands")
    .select("id, source_url, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // Start trigger: arriving from the front door with ?url= — confirm + kick off.
  if (url) {
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">{meta.title}</h1>
        <form action={startFromUrl} className="start-form">
          <input type="hidden" name="product" value={product} />
          <input type="hidden" name="url" value={url} />
          <p className="portal-home__lead">
            Klaar om te starten voor <strong>{url}</strong>?
          </p>
          <button type="submit" className="btn btn--primary">
            {meta.cta}
          </button>
        </form>
      </main>
    );
  }

  // Operate: intake-only (no async job in v1).
  if (product === "operate") {
    let project: { id: string; status: string } | null = null;
    if (brand) {
      const { data } = await supabase
        .from("operate_projects")
        .select("id, status")
        .eq("brand_id", brand.id)
        .maybeSingle();
      project = data;
    }
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">{meta.title}</h1>
        {!brand ? (
          <p className="portal-home__lead">
            Voeg eerst je website toe op de Operate-pagina om te beginnen.
          </p>
        ) : project ? (
          <p className="portal-home__lead">
            Intake ontvangen — status: <strong>{project.status}</strong>. Ik neem
            dit op en kom bij je terug met een voorstel.
          </p>
        ) : (
          <>
            <p className="portal-home__lead">
              Vertel me kort hoe je zaak draait, dan stel ik je AI-systeem samen.
            </p>
            <OperateIntakeForm />
          </>
        )}
      </main>
    );
  }

  // Build / Market: brand status.
  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">{meta.title}</h1>
      {brand ? (
        <p className="portal-home__lead">
          Status: <strong>{brand.status}</strong>
          {brand.source_url ? ` — ${brand.source_url}` : ""}
        </p>
      ) : (
        <p className="portal-home__lead">
          Nog niets gestart. Voeg je website toe op de {product}-pagina.
        </p>
      )}
    </main>
  );
}
