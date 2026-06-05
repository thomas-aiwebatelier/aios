import { notFound, redirect } from "next/navigation";
import { getUser, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startFromUrl } from "@/lib/brand-actions";
import OperateIntakeForm from "@/components/OperateIntakeForm";
import PollRefresh from "@/components/PollRefresh";

const PRODUCTS: Record<string, { title: string; cta: string }> = {
  build: { title: "Build — je AI-website", cta: "Bouw mijn site" },
  market: { title: "Market — je merkkit & advertenties", cta: "Maak mijn merkkit" },
  operate: { title: "Operate — je AI-besturingssysteem", cta: "Start de intake" },
};

// Friendly Dutch status for the lead-driven Build pipeline.
function buildStatusLabel(status: string | null): string {
  switch (status) {
    case "discovered":
    case "researching":
      return "Ik analyseer je site en je merk…";
    case "awaiting_approval":
      return "Je aanvraag is geanalyseerd. Ik bekijk ze en zet de bouw in gang.";
    case "approved":
    case "generating":
    case "generated":
      return "Je site wordt gebouwd…";
    case "deployed":
      return "Klaar! Je site staat online.";
    case "generation_failed":
      return "Er liep iets mis bij het bouwen. Ik kijk ernaar.";
    default:
      return "Aanvraag ontvangen.";
  }
}

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
    .select("id, source_url, status, lead_id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // Start trigger from the front door (?url=) — confirm + kick off.
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

  // Build: lead-driven pipeline status (read via service client — leads has no
  // customer RLS, so we never query it from the user role).
  if (product === "build") {
    let leadStatus: string | null = null;
    let liveUrl: string | null = null;
    if (brand?.lead_id) {
      const svc = createServiceSupabase();
      const { data: lead } = await svc
        .from("leads")
        .select("status")
        .eq("id", brand.lead_id)
        .maybeSingle();
      leadStatus = (lead?.status as string | undefined) ?? null;
      if (leadStatus === "deployed") {
        const { data: site } = await svc
          .from("generated_sites")
          .select("cloudflare_preview_url")
          .eq("lead_id", brand.lead_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        liveUrl = (site?.cloudflare_preview_url as string | undefined) ?? null;
      }
    }
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">{meta.title}</h1>
        {!brand?.lead_id ? (
          <p className="portal-home__lead">
            Nog niets gestart. Voeg je website toe op de Build-pagina.
          </p>
        ) : (
          <>
            <p className="portal-home__lead">{buildStatusLabel(leadStatus)}</p>
            {leadStatus &&
              leadStatus !== "deployed" &&
              leadStatus !== "generation_failed" && <PollRefresh intervalMs={8000} />}
            {liveUrl && (
              <p className="portal-home__lead">
                <a className="btn btn--primary" href={liveUrl} target="_blank" rel="noreferrer">
                  Bekijk je site →
                </a>
              </p>
            )}
          </>
        )}
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

  // Market: brand-kit status.
  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">{meta.title}</h1>
      {brand ? (
        <p className="portal-home__lead">
          Status: <strong>{brand.status}</strong>
          {brand.source_url ? ` — ${brand.source_url}` : ""}
          {brand.status === "ready" && (
            <>
              {" "}
              · <a href="/app/market/brand">bekijk je merkkit →</a>
            </>
          )}
        </p>
      ) : (
        <p className="portal-home__lead">
          Nog niets gestart. Voeg je website toe op de Market-pagina.
        </p>
      )}
    </main>
  );
}
