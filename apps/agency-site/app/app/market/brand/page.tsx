import { redirect } from "next/navigation";
import { marked } from "marked";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BrandKitTabs, { type KitTab } from "@/components/BrandKitTabs";
import PollRefresh from "@/components/PollRefresh";

const TITLES: Record<string, string> = {
  "visual-identity": "Visuele identiteit",
  "voice-and-messaging": "Tone of voice & boodschap",
  business: "Business & aanbod",
};
const ORDER = ["visual-identity", "voice-and-messaging", "business"];

type Kit = { id: string; type: string; content: string };
type AssetRow = { id: string; role: string; storage_path: string; original_url: string | null };
type Signals = {
  palette?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
};

const ASSET_LABEL: Record<string, string> = {
  logo: "Logo",
  hero: "Hoofdbeeld",
  product: "Product",
  other: "Visual",
};

export default async function MarketBrandAssets() {
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) redirect("/login?next=/app/market/brand");

  const { data: brand } = await supabase
    .from("brands")
    .select("id, source_url, status, extracted_signals")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!brand) {
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">Brand assets</h1>
        <p className="portal-home__lead">
          Voeg eerst je website toe op de Market-pagina om je merkkit te genereren.
        </p>
      </main>
    );
  }

  const [{ data: files }, { data: assetRows }] = await Promise.all([
    supabase.from("brand_kit_files").select("id, type, content").eq("brand_id", brand.id),
    supabase
      .from("brand_kit_assets")
      .select("id, role, storage_path, original_url")
      .eq("brand_id", brand.id),
  ]);

  const ordered = ORDER.map((t) => (files as Kit[] | null)?.find((f) => f.type === t)).filter(
    Boolean,
  ) as Kit[];
  const tabs: KitTab[] = await Promise.all(
    ordered.map(async (f) => ({
      id: f.id,
      title: TITLES[f.type] ?? f.type,
      content: f.content,
      html: String(await marked.parse(f.content)),
    })),
  );

  // ── Colours (swatches) from the extracted signals ──────────────────────────
  const sig = (brand.extracted_signals as Signals | null) ?? {};
  const named = [
    sig.primaryColor && { hex: sig.primaryColor, label: "Primair" },
    sig.secondaryColor && { hex: sig.secondaryColor, label: "Secundair" },
    sig.accentColor && { hex: sig.accentColor, label: "Accent" },
  ].filter(Boolean) as { hex: string; label: string }[];
  const seenHex = new Set(named.map((n) => n.hex.toLowerCase()));
  const extra = (sig.palette ?? [])
    .filter((h) => h && !seenHex.has(h.toLowerCase()))
    .map((hex) => ({ hex, label: "" }));
  const swatches = [...named, ...extra];

  // ── Assets (logo + visuals scraped from the site) ──────────────────────────
  const assets = ((assetRows as AssetRow[] | null) ?? [])
    // Prefer our re-hosted copy (storage_path); fall back to the source URL.
    .map((a) => ({ id: a.id, role: a.role, url: a.storage_path || a.original_url || "" }))
    .filter((a) => a.url);

  const building = brand.status !== "ready" && brand.status !== "failed";

  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">Brand assets</h1>

      {(swatches.length > 0 || assets.length > 0) && (
        <div className="brandkit-visuals">
          {swatches.length > 0 && (
            <section className="brandkit-panel">
              <h2 className="brandkit-panel__title">Kleuren</h2>
              <div className="swatches">
                {swatches.map((s) => (
                  <div key={s.hex + s.label} className="swatch">
                    <span className="swatch__chip" style={{ backgroundColor: s.hex }} />
                    <span className="swatch__meta">
                      {s.label && <strong className="swatch__label">{s.label}</strong>}
                      <code className="swatch__hex">{s.hex}</code>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {assets.length > 0 && (
            <section className="brandkit-panel">
              <h2 className="brandkit-panel__title">Logo &amp; visuals</h2>
              <div className="brandkit-asset-grid">
                {assets.map((a) => (
                  <figure key={a.id} className={`asset-tile asset-tile--${a.role}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={ASSET_LABEL[a.role] ?? "Visual"} loading="lazy" />
                    <figcaption>{ASSET_LABEL[a.role] ?? "Visual"}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tabs.length > 0 ? (
        <BrandKitTabs files={tabs} />
      ) : building ? (
        <div className="processing">
          <span className="processing__spinner" aria-hidden="true" />
          <p className="portal-home__lead">
            Je merkkit wordt gegenereerd op basis van {brand.source_url}. Dit duurt
            ongeveer een minuut…
          </p>
          <PollRefresh />
        </div>
      ) : brand.status === "failed" ? (
        <p className="portal-home__lead">
          Het genereren is misgelopen. Probeer het opnieuw vanaf de Market-pagina.
        </p>
      ) : (
        <p className="portal-home__lead">Nog geen merkkit.</p>
      )}
    </main>
  );
}
