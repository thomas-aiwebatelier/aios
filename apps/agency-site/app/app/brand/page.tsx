import { redirect } from "next/navigation";
import { marked } from "marked";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import BrandFileEditor from "@/components/BrandFileEditor";

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
  const rendered = await Promise.all(
    ordered.map(async (f) => ({ ...f, html: String(await marked.parse(f.content)) })),
  );

  return (
    <main className="container portal-home">
      <h1 className="portal-home__title">Merkkit</h1>
      <p className="portal-home__lead">
        Status: <strong>{brand.status}</strong>
        {brand.source_url ? ` — ${brand.source_url}` : ""}
      </p>
      {rendered.length === 0 ? (
        <p className="portal-home__lead">
          Je merkkit verschijnt hier zodra de analyse van je site klaar is.
        </p>
      ) : (
        rendered.map((f) => (
          <BrandFileEditor
            key={f.id}
            id={f.id}
            title={TITLES[f.type] ?? f.type}
            content={f.content}
            html={f.html}
          />
        ))
      )}
    </main>
  );
}
