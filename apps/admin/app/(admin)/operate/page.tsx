import { getDb } from "@/lib/db";
import { operateProjects, brands } from "@atelier/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminOperatePage() {
  const db = getDb();

  const rows = await db
    .select({
      id: operateProjects.id,
      status: operateProjects.status,
      intake: operateProjects.intake,
      createdAt: operateProjects.createdAt,
      sourceUrl: brands.sourceUrl,
    })
    .from(operateProjects)
    .leftJoin(brands, eq(operateProjects.brandId, brands.id))
    .orderBy(desc(operateProjects.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Operate</h1>
        <p className="text-stone-500 text-sm mt-1">
          {rows.length} intake{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-stone-400 text-sm">Nog geen intakes.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="border border-stone-200 rounded-lg p-4">
              <div className="flex justify-between items-start gap-4">
                <a
                  className="text-indigo-600 text-sm"
                  href={r.sourceUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.sourceUrl ?? "—"}
                </a>
                <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0">
                  {r.status}
                </span>
              </div>
              <dl className="mt-2 text-sm text-stone-700 space-y-1">
                <div>
                  <dt className="inline font-medium">Te automatiseren: </dt>
                  <dd className="inline">{r.intake?.tasksToAutomate || "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Tools: </dt>
                  <dd className="inline">{(r.intake?.toolsUsed ?? []).join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Te koppelen: </dt>
                  <dd className="inline">{(r.intake?.systemsToConnect ?? []).join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Volume: </dt>
                  <dd className="inline">{r.intake?.volume || "—"}</dd>
                </div>
                {r.intake?.notes && (
                  <div>
                    <dt className="inline font-medium">Notities: </dt>
                    <dd className="inline">{r.intake.notes}</dd>
                  </div>
                )}
              </dl>
              <div className="text-[11px] text-stone-400 mt-2">
                {r.createdAt?.toLocaleDateString("nl-BE")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
