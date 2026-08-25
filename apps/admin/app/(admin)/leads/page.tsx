import { getDb } from "@/lib/db";
import { leadIntents } from "@atelier/db";
import { desc } from "drizzle-orm";

/**
 * Front-door queue — everything captured on the public service pages.
 *
 * This exists because the site now promises a reply "binnen 24 uur" on four
 * pages. Without somewhere to see the intents, that promise is only true by
 * accident.
 *
 * Rows with no email are people who filled in step 1 and bounced before giving
 * their name. They are shown deliberately: an abandoned intent still tells you
 * a real business typed their URL in, and that is the whole reason the capture
 * is persisted before identity is asked for.
 */

export const dynamic = "force-dynamic";

const SERVICE_LABEL: Record<string, string> = {
  build: "Build",
  video: "Video",
  market: "Market",
  educate: "Educate",
};

function summarise(service: string, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (service === "build") return String(p.url ?? p.rawInput ?? "—");
  if (service === "video") return String(p.idea ?? "—").slice(0, 140);
  if (service === "market") return p.url ? String(p.url) : "Gratis audit aangevraagd";
  if (service === "educate") {
    const answers = (p.answers ?? {}) as Record<string, string>;
    return String(answers.business ?? "Vragenlijst ingevuld").slice(0, 140);
  }
  return "—";
}

function age(d: Date | null): string {
  if (!d) return "—";
  const hours = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  if (hours < 1) return "< 1 u";
  if (hours < 48) return `${hours} u`;
  return `${Math.floor(hours / 24)} d`;
}

export default async function LeadIntentsPage() {
  const db = getDb();
  const rows = await db
    .select()
    .from(leadIntents)
    .orderBy(desc(leadIntents.createdAt))
    .limit(200);

  const fresh = rows.filter((r) => r.status === "new");

  return (
    <main className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Aanvragen</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {fresh.length} nieuw · {rows.length} totaal. De site belooft antwoord
          binnen 24 uur — alles boven de 24 u staat rood.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Nog geen aanvragen.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr className="border-b">
                <th className="py-2 pr-4">Dienst</th>
                <th className="py-2 pr-4">Wie</th>
                <th className="py-2 pr-4">Aanvraag</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Ouderdom</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hours = r.createdAt
                  ? (Date.now() - r.createdAt.getTime()) / 3_600_000
                  : 0;
                const late = r.status === "new" && hours > 24;
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-4 font-medium">
                      {SERVICE_LABEL[r.service] ?? r.service}
                    </td>
                    <td className="py-2 pr-4">
                      {r.email ? (
                        <>
                          <div>
                            {r.firstName} {r.lastName}
                          </div>
                          <div className="text-neutral-500">{r.email}</div>
                        </>
                      ) : (
                        <span className="text-neutral-400 italic">
                          afgehaakt bij stap 2
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 max-w-md break-words">
                      {summarise(r.service, r.payload)}
                    </td>
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className={`py-2 pr-4 ${late ? "font-semibold text-red-600" : ""}`}>
                      {age(r.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
