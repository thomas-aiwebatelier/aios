import { notFound, redirect } from "next/navigation";
import { createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PollRefresh from "@/components/PollRefresh";
import { statusLabel, isTerminal } from "@/lib/portal-status";

/**
 * A client module page. READ-ONLY, by design.
 *
 * The portal used to be self-serve: this page rendered a "start" button wired
 * to startFromUrl, and Operate rendered an intake form. Both are gone. We
 * generate; clients look. The four server actions behind those buttons are now
 * admin-only, and the write grants are revoked at the database — see
 * packages/db/sql/rls-and-auth.sql.
 *
 * Clients ask for work through the capture forms on the public service pages,
 * which land in `lead_intents`.
 */

const PRODUCTS: Record<string, { title: string; blurb: string }> = {
  build: {
    title: "Build — je AI-website",
    blurb: "Je website op maat, gebouwd met AI.",
  },
  video: {
    title: "Video — je AI-commercial",
    blurb: "Je commercial van 15 seconden.",
  },
  market: {
    title: "Market — je merkkit & advertenties",
    blurb: "Je campagnes per kanaal, gestuurd op cijfers.",
  },
  operate: {
    title: "Operate — je AI-besturingssysteem",
    blurb: "De AI-laag onder je dagelijkse werk.",
  },
};

/** Shown when a module has nothing yet — points at the request path, not a button. */
function NotStarted({ service }: { service: string }) {
  return (
    <div className="portal-empty">
      <p className="portal-home__lead">Hier staat nog niets.</p>
      <p className="portal-home__muted">
        Vraag dit aan via{" "}
        <a href={`/diensten/${service}`}>de {service}-pagina</a> — ik ga ermee
        aan de slag en je ziet de voortgang hier verschijnen.
      </p>
    </div>
  );
}

export default async function ProductModule({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product } = await params;
  const meta = PRODUCTS[product];
  if (!meta) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/app/${product}`);

  const { data: brand } = await supabase
    .from("brands")
    .select("id, source_url, status, lead_id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // ── Build: lead-driven pipeline status ─────────────────────────────────────
  // `leads` and `generated_sites` have no customer RLS — they are operational
  // tables — so they are read through the service client and never exposed
  // directly to the user role.
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
          <NotStarted service="build" />
        ) : (
          <>
            <p className="portal-home__lead">{statusLabel("build", leadStatus)}</p>
            {!isTerminal("build", leadStatus) && <PollRefresh intervalMs={8000} />}
            {liveUrl && (
              <p className="portal-home__lead">
                <a
                  className="btn btn--primary"
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Bekijk je site →
                </a>
              </p>
            )}
          </>
        )}
      </main>
    );
  }

  // ── Video: deliverables written by the studio bridge ───────────────────────
  if (product === "video") {
    const { data: videos } = await supabase
      .from("video_deliverables")
      .select("id, title, status, video_url, poster_url, duration_seconds")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });

    const list = videos ?? [];
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">{meta.title}</h1>
        {list.length === 0 ? (
          <NotStarted service="video" />
        ) : (
          <ul className="portal-list">
            {list.map((v) => (
              <li key={v.id} className="portal-card">
                <h2 className="portal-card__title">{v.title ?? "Je commercial"}</h2>
                <p className="portal-card__status">{statusLabel("video", v.status)}</p>
                {v.video_url ? (
                  <>
                    <video
                      className="portal-card__video"
                      controls
                      preload="metadata"
                      poster={v.poster_url ?? undefined}
                      src={v.video_url}
                    />
                    <a
                      className="btn btn--ghost"
                      href={v.video_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download je video →
                    </a>
                  </>
                ) : (
                  <PollRefresh intervalMs={15000} />
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  // ── Operate: project status (intake now happens through lead_intents) ──────
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
        {project ? (
          <p className="portal-home__lead">{statusLabel("operate", project.status)}</p>
        ) : (
          <NotStarted service="educate" />
        )}
      </main>
    );
  }

  // ── Market: brand kit + creative ───────────────────────────────────────────
  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">{meta.title}</h1>
      {brand ? (
        <>
          <p className="portal-home__lead">{statusLabel("market", brand.status)}</p>
          {brand.source_url ? (
            <p className="portal-home__muted">{brand.source_url}</p>
          ) : null}
          {brand.status === "ready" && (
            <p className="portal-home__lead">
              <a href="/app/market/brand">Bekijk je merkkit →</a>
            </p>
          )}
          {!isTerminal("market", brand.status) && <PollRefresh intervalMs={8000} />}
        </>
      ) : (
        <NotStarted service="market" />
      )}
    </main>
  );
}
