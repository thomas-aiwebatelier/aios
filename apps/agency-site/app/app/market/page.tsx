import { redirect } from "next/navigation";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startFromUrl } from "@/lib/brand-actions";
import CreativeChat from "@/components/CreativeChat";
import PollRefresh from "@/components/PollRefresh";

type AssetRow = {
  id: string;
  prompt: string;
  placement: string | null;
  status: string;
  headline: string | null;
  primary_text: string | null;
  description: string | null;
  media_url: string | null;
  state: string;
};

export default async function MarketModule({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) redirect("/login?next=/app/market");

  const { data: brand } = await supabase
    .from("brands")
    .select("id, source_url, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // Start trigger from the front door.
  if (url) {
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">Market — je merkkit & advertenties</h1>
        <form action={startFromUrl} className="start-form">
          <input type="hidden" name="product" value="market" />
          <input type="hidden" name="url" value={url} />
          <p className="portal-home__lead">
            Klaar om te starten voor <strong>{url}</strong>?
          </p>
          <button type="submit" className="btn btn--primary">
            Maak mijn merkkit
          </button>
        </form>
      </main>
    );
  }

  let assets: AssetRow[] = [];
  if (brand) {
    const { data } = await supabase
      .from("ad_assets")
      .select("id, prompt, placement, status, headline, primary_text, description, media_url, state")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false });
    assets = (data as AssetRow[] | null) ?? [];
  }

  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">Market</h1>
      {!brand ? (
        <p className="portal-home__lead">
          Voeg je website toe op de Market-pagina om te beginnen.
        </p>
      ) : (
        <>
          <p className="portal-home__lead">
            Merkkit: <strong>{brand.status}</strong> ·{" "}
            <a href="/app/brand">bekijk &amp; bewerk →</a>
          </p>
          {((brand.status !== "ready" && brand.status !== "failed") ||
            assets.some((a) => a.status === "queued" || a.status === "generating")) && (
            <PollRefresh />
          )}

          <section className="creative">
            <h2 className="creative__title">Nieuwe advertentie</h2>
            <CreativeChat />
          </section>

          <section className="asset-lib">
            <h2 className="creative__title">Je advertenties</h2>
            {assets.length === 0 ? (
              <p className="portal-home__lead">
                Nog geen advertenties. Beschrijf hierboven een campagne.
              </p>
            ) : (
              <ul className="asset-grid">
                {assets.map((a) => (
                  <li key={a.id} className="asset-card">
                    {a.media_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="asset-card__img"
                        src={a.media_url}
                        alt={a.headline ?? "advertentie"}
                      />
                    ) : (
                      <div className="asset-card__placeholder">
                        {a.status === "failed" ? "Mislukt" : "Bezig…"}
                      </div>
                    )}
                    <div className="asset-card__body">
                      {a.headline && <strong>{a.headline}</strong>}
                      {a.primary_text && <p>{a.primary_text}</p>}
                      <span className="asset-card__meta">
                        {a.placement} · {a.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
