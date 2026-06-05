import { redirect } from "next/navigation";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startFromUrl } from "@/lib/brand-actions";
import PollRefresh from "@/components/PollRefresh";

export default async function MarketDashboard({
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

  // Start trigger from the public front door.
  if (url) {
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">Market</h1>
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

  let adCount = 0;
  if (brand) {
    const { count } = await supabase
      .from("ad_assets")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brand.id);
    adCount = count ?? 0;
  }
  const building = !!brand && brand.status !== "ready" && brand.status !== "failed";

  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">Dashboard</h1>
      {!brand ? (
        <p className="portal-home__lead">
          Voeg je website toe op de <a href="/diensten/market">Market-pagina</a> om
          te starten.
        </p>
      ) : (
        <>
          {building && <PollRefresh />}
          <div className="stat-grid">
            <div className="stat">
              <span className="stat__label">Merkkit</span>
              <span className="stat__value">{brand.status}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Advertenties</span>
              <span className="stat__value">{adCount}</span>
            </div>
          </div>
          <p className="portal-home__lead">Bron: {brand.source_url}</p>
          <div className="dash-links">
            <a className="btn btn--primary" href="/app/market/creative">
              Nieuwe advertentie →
            </a>
            <a className="btn btn--ghost" href="/app/market/brand">
              Bekijk je merkkit →
            </a>
          </div>
        </>
      )}
    </main>
  );
}
