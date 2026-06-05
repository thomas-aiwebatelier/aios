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

export default async function BrandGuidelines() {
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) redirect("/login?next=/app/brand");

  const { data: brand } = await supabase
    .from("brands")
    .select("id, source_url, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!brand) {
    return (
      <main className="container portal-home">
        <h1 className="portal-home__title">Merkkit</h1>
        <p className="portal-home__lead">
          Voeg eerst je website toe (op de Build- of Market-pagina) om je merkkit
          te genereren.
        </p>
      </main>
    );
  }

  const { data: files } = await supabase
    .from("brand_kit_files")
    .select("id, type, content")
    .eq("brand_id", brand.id);

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

  const building = brand.status !== "ready" && brand.status !== "failed";

  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">Merkkit</h1>

      {tabs.length > 0 ? (
        <BrandKitTabs files={tabs} />
      ) : building ? (
        <div className="processing">
          <span className="processing__spinner" aria-hidden="true" />
          <p className="portal-home__lead">
            Je merkkit wordt gegenereerd op basis van {brand.source_url}. Dit
            duurt ongeveer een minuut…
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
