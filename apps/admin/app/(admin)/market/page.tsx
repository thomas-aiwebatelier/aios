import { getDb } from "@/lib/db";
import { brands, adAssets } from "@atelier/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminMarketPage() {
  const db = getDb();

  const brandRows = await db
    .select({
      id: brands.id,
      sourceUrl: brands.sourceUrl,
      status: brands.status,
      createdAt: brands.createdAt,
    })
    .from(brands)
    .orderBy(desc(brands.createdAt));

  const ads = await db
    .select({
      id: adAssets.id,
      brandId: adAssets.brandId,
      prompt: adAssets.prompt,
      status: adAssets.status,
      state: adAssets.state,
      mediaUrl: adAssets.mediaUrl,
      headline: adAssets.headline,
    })
    .from(adAssets)
    .orderBy(desc(adAssets.createdAt))
    .limit(60);

  const urlByBrand = new Map(brandRows.map((b) => [b.id, b.sourceUrl]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Market</h1>
        <p className="text-stone-500 text-sm mt-1">
          {brandRows.length} brand{brandRows.length !== 1 ? "s" : ""} · {ads.length} recente advertenties
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-stone-700 mb-2">Brands</h2>
        <div className="overflow-x-auto border border-stone-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Website</th>
                <th className="px-3 py-2 font-medium">Merkkit status</th>
                <th className="px-3 py-2 font-medium">Aangemaakt</th>
              </tr>
            </thead>
            <tbody>
              {brandRows.map((b) => (
                <tr key={b.id} className="border-t border-stone-100">
                  <td className="px-3 py-2">
                    <a className="text-indigo-600" href={b.sourceUrl} target="_blank" rel="noreferrer">
                      {b.sourceUrl}
                    </a>
                  </td>
                  <td className="px-3 py-2">{b.status}</td>
                  <td className="px-3 py-2 text-stone-500">
                    {b.createdAt?.toLocaleDateString("nl-BE")}
                  </td>
                </tr>
              ))}
              {brandRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-stone-400">
                    Nog geen brands.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-stone-700 mb-2">Recente advertenties</h2>
        {ads.length === 0 ? (
          <p className="text-stone-400 text-sm">Nog geen advertenties.</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ads.map((a) => (
              <li key={a.id} className="border border-stone-200 rounded-lg overflow-hidden">
                {a.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.mediaUrl} alt={a.headline ?? "ad"} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                    {a.status === "failed" ? "Mislukt" : "Bezig…"}
                  </div>
                )}
                <div className="p-2">
                  <div className="text-xs font-medium text-stone-800 truncate">
                    {a.headline ?? a.prompt}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {urlByBrand.get(a.brandId)}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {a.status} · {a.state}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
