import { getDb } from "@/lib/db";
import { videoDeliverables, profiles } from "@atelier/db";
import { desc, eq } from "drizzle-orm";
import { PublishVideoForm } from "./PublishVideoForm";
import { StatusPicker } from "./StatusPicker";

/**
 * Video delivery desk — the Firestore → Postgres handoff.
 *
 * The studio produces into Firebase; the client portal reads Supabase. Rather
 * than have the portal reach across clouds on a page load, the handoff happens
 * once, here, when a video is actually finished.
 */

export const dynamic = "force-dynamic";

export default async function AdminVideoPage() {
  const db = getDb();

  const rows = await db
    .select({
      id: videoDeliverables.id,
      ownerUserId: videoDeliverables.ownerUserId,
      title: videoDeliverables.title,
      status: videoDeliverables.status,
      videoUrl: videoDeliverables.videoUrl,
      durationSeconds: videoDeliverables.durationSeconds,
      createdAt: videoDeliverables.createdAt,
    })
    .from(videoDeliverables)
    .orderBy(desc(videoDeliverables.createdAt))
    .limit(100);

  // Customers only — an admin has no client portal to publish into.
  const customers = await db
    .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.role, "customer"));

  return (
    <main className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Video</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Publiceer een afgewerkte video naar het portaal van een klant. De MP4
          wordt naar Supabase Storage gekopieerd — nooit rechtstreeks vanuit
          Firebase gelinkt, want die URL&apos;s verlopen.
        </p>
      </header>

      <section className="mb-10 max-w-2xl rounded-lg border p-5">
        <h2 className="mb-4 text-lg font-medium">Nieuwe oplevering</h2>
        <PublishVideoForm customers={customers} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Opgeleverd</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Nog niets gepubliceerd.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr className="border-b">
                <th className="py-2 pr-4">Titel</th>
                <th className="py-2 pr-4">Klant</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Video</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const who = customers.find((c) => c.id === r.ownerUserId);
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-4 font-medium">{r.title}</td>
                    <td className="py-2 pr-4">{who?.email ?? r.ownerUserId}</td>
                    <td className="py-2 pr-4">
                      <StatusPicker id={r.id} status={r.status} />
                    </td>
                    <td className="py-2 pr-4">
                      {r.videoUrl ? (
                        <a
                          className="text-blue-600 underline"
                          href={r.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          bekijk
                        </a>
                      ) : (
                        <span className="text-neutral-400">nog geen bestand</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
