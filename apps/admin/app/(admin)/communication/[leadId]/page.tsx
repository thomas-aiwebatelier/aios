/**
 * Composer page — /communication/[leadId]
 *
 * Server Component:
 *   1. Loads lead + brandProfile + latest generatedSite.
 *   2. Calls renderOutreachEmail() to produce the initial subject + body.
 *   3. Renders <Composer> client component with the pre-filled fields.
 *
 * If the lead has already had an email sent (status=email_sent), shows
 * the thread summary instead of the composer.
 */

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { leads, brandProfiles, generatedSites, outreachMessages } from "@atelier/db";
import { eq, desc } from "drizzle-orm";
import { renderOutreachEmail } from "@/lib/email-template";
import { Composer } from "./_components/Composer";

interface PageProps {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<{ sent?: string }>;
}

export default async function ComposerPage({ params, searchParams }: PageProps) {
  const db = getDb();
  const { leadId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // 1. Load lead
  const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
  if (!lead) notFound();

  // 2. Load brandProfile (optional)
  const brandProfile = ((await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.leadId, leadId))
    ))[0] ?? null;

  // 3. Load latest generatedSite
  const generatedSite = ((await db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.leadId, leadId))
    .orderBy(desc(generatedSites.version))
    ))[0];

  if (!generatedSite?.cloudflarePreviewUrl) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">{lead.businessName}</h1>
        <p className="text-stone-500">
          No deployed site found for this lead. The email composer requires a live preview URL.
          Wait for the deploy worker to complete.
        </p>
      </div>
    );
  }

  // 4. If already sent, show confirmation
  if (resolvedSearchParams.sent === "1") {
    const latestMsg = ((await db
      .select()
      .from(outreachMessages)
      .where(eq(outreachMessages.leadId, leadId))
      .orderBy(desc(outreachMessages.sentAt))
      ))[0];
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">{lead.businessName}</h1>
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800">
          <p className="font-medium">Email sent successfully.</p>
          {latestMsg?.sentAt && (
            <p className="text-sm mt-1">
              Sent at {new Date(Number(latestMsg.sentAt)).toLocaleString("nl-BE")}
            </p>
          )}
        </div>
        <a
          href="/communication"
          className="inline-flex items-center text-sm text-stone-600 hover:text-stone-900 underline"
        >
          Back to Communication
        </a>
      </div>
    );
  }

  // 5. Render email template (calls Claude for personalized_observation)
  const { subject, body } = await renderOutreachEmail({
    lead: {
      businessName: lead.businessName,
      firstName: null, // leads table has no firstName field; using null
      city: lead.city,
      industryKey: lead.industryKey,
      existingWebsiteUrl: lead.existingWebsiteUrl ?? null,
    },
    brandProfile: brandProfile
      ? { toneOfVoiceSummary: brandProfile.toneOfVoiceSummary }
      : null,
    generatedSite: {
      cloudflarePreviewUrl: generatedSite.cloudflarePreviewUrl,
      lighthouseScores: generatedSite.lighthouseScores as Record<string, number> | null,
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{lead.businessName}</h1>
          <p className="text-stone-500 text-sm mt-1">
            {lead.city} · {lead.email ?? "no email on file"}
          </p>
        </div>
        <a
          href="/communication"
          className="text-sm text-stone-500 hover:text-stone-700 underline"
        >
          Back
        </a>
      </div>

      {/* Composer client component */}
      <Composer
        leadId={leadId}
        to={lead.email ?? ""}
        initialSubject={subject}
        initialBody={body}
      />
    </div>
  );
}
