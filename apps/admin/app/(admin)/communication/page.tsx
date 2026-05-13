/**
 * Communication page — Task 4.6
 *
 * Two visual sub-tabs (not separate routes):
 *   Outreach  — leads in status: deployed | email_drafted | email_sent | accepted | declined
 *   Inbound   — inbound_inquiries (populated by Task 4.8 agency homepage contact form)
 */

import Link from "next/link";
import { getDb } from "@/lib/db";
import { leads, inboundInquiries } from "@atelier/db";
import { inArray } from "drizzle-orm";

const OUTREACH_STATUSES = [
  "deployed",
  "email_drafted",
  "email_sent",
  "accepted",
  "declined",
] as const;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    deployed: "bg-blue-100 text-blue-800",
    email_drafted: "bg-yellow-100 text-yellow-800",
    email_sent: "bg-green-100 text-green-800",
    accepted: "bg-emerald-100 text-emerald-800",
    declined: "bg-red-100 text-red-800",
    new: "bg-stone-100 text-stone-700",
    read: "bg-blue-50 text-blue-700",
    replied: "bg-green-100 text-green-700",
    archived: "bg-stone-200 text-stone-500",
  };
  const cls = map[status] ?? "bg-stone-100 text-stone-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const db = getDb();
  const resolvedParams = searchParams ? await searchParams : {};
  const tab = resolvedParams.tab === "inbound" ? "inbound" : "outreach";

  // Outreach leads
  const outreachLeads = db
    .select({
      id: leads.id,
      businessName: leads.businessName,
      slug: leads.slug,
      city: leads.city,
      status: leads.status,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(inArray(leads.status, [...OUTREACH_STATUSES]))
    .all();

  // Inbound inquiries — sorted newest first in JS (SQLite integer timestamp)
  const inquiries = db
    .select({
      id: inboundInquiries.id,
      name: inboundInquiries.name,
      email: inboundInquiries.email,
      message: inboundInquiries.message,
      status: inboundInquiries.status,
      createdAt: inboundInquiries.createdAt,
    })
    .from(inboundInquiries)
    .all()
    .sort((a, b) => {
      const aMs = a.createdAt ? Number(a.createdAt) : 0;
      const bMs = b.createdAt ? Number(b.createdAt) : 0;
      return bMs - aMs;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Communication</h1>
        <p className="text-stone-500 text-sm mt-1">
          Outreach emails and inbound inquiries
        </p>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-2 border-b border-stone-200">
        <Link
          href="/communication?tab=outreach"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "outreach"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          Outreach ({outreachLeads.length})
        </Link>
        <Link
          href="/communication?tab=inbound"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "inbound"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          Inbound ({inquiries.length})
        </Link>
      </div>

      {/* Outreach tab */}
      {tab === "outreach" && (
        <div>
          {outreachLeads.length === 0 ? (
            <p className="text-stone-500 text-sm">
              No leads ready for outreach. Leads appear here after the deploy worker completes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-stone-500">
                    <th className="pb-2 font-medium pr-4">Business</th>
                    <th className="pb-2 font-medium pr-4">City</th>
                    <th className="pb-2 font-medium pr-4">Status</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {outreachLeads.map((lead) => (
                    <tr key={lead.id} className="py-2">
                      <td className="py-2 pr-4 font-medium text-stone-900">
                        <div>{lead.businessName}</div>
                        <div className="text-xs text-stone-400 font-mono">{lead.slug}</div>
                      </td>
                      <td className="py-2 pr-4 text-stone-600">{lead.city}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="py-2">
                        {lead.status === "deployed" || lead.status === "email_drafted" ? (
                          <Link
                            href={`/communication/${lead.id}`}
                            className="inline-flex items-center rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700"
                          >
                            Compose email
                          </Link>
                        ) : (
                          <Link
                            href={`/communication/${lead.id}`}
                            className="inline-flex items-center rounded-md border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Inbound tab */}
      {tab === "inbound" && (
        <div>
          {inquiries.length === 0 ? (
            <p className="text-stone-500 text-sm">
              No inbound inquiries yet. These will appear here once the agency homepage (Task 4.8) is live.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-stone-500">
                    <th className="pb-2 font-medium pr-4">Name</th>
                    <th className="pb-2 font-medium pr-4">Email</th>
                    <th className="pb-2 font-medium pr-4">Message</th>
                    <th className="pb-2 font-medium pr-4">Status</th>
                    <th className="pb-2 font-medium pr-4">Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className="py-2">
                      <td className="py-2 pr-4 font-medium text-stone-900">
                        {inq.name ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-stone-600">{inq.email ?? "—"}</td>
                      <td className="py-2 pr-4 text-stone-600 max-w-xs truncate">
                        {inq.message
                          ? inq.message.slice(0, 80) + (inq.message.length > 80 ? "…" : "")
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={inq.status} />
                      </td>
                      <td className="py-2 pr-4 text-stone-500 whitespace-nowrap">
                        {inq.createdAt
                          ? new Date(Number(inq.createdAt)).toLocaleDateString("nl-BE")
                          : "—"}
                      </td>
                      <td className="py-2">
                        {inq.email && (
                          <a
                            href={`mailto:${inq.email}?subject=Re: Uw bericht aan AI Web Atelier`}
                            className="inline-flex items-center rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Reply
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
