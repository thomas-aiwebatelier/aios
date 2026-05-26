/**
 * CRM record page — /communication/[leadId]
 *
 * Two-column layout:
 *   LEFT  — ContactPanel + StagePicker + NextAction
 *   RIGHT — SequenceStepper + (Composer | StartSequenceButton) + ActivityTimeline
 */

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { leads, brandProfiles, generatedSites, outreachMessages } from "@atelier/db";
import { eq, desc } from "drizzle-orm";
import { renderOutreachEmail } from "@/lib/email-template";
import { getSteps } from "@/lib/sequence";
import { listActivities } from "@/lib/activity";

import { Composer } from "./_components/Composer";
import { ContactPanel } from "./_components/ContactPanel";
import { StagePicker } from "./_components/StagePicker";
import { NextAction } from "./_components/NextAction";
import { SequenceStepper } from "./_components/SequenceStepper";
import { ActivityTimeline } from "./_components/ActivityTimeline";
import { StartSequenceButton } from "./_components/StartSequenceButton";
import type { StepData } from "./_components/SequenceStepper";
import type { ActivityData } from "./_components/ActivityTimeline";

interface PageProps {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<{ sent?: string }>;
}

const STAGE_LABELS: Record<string, string> = {
  new: "Nieuw",
  contacted: "Gecontacteerd",
  follow_up: "Opvolging",
  in_gesprek: "In gesprek",
  won: "Gewonnen",
  lost: "Verloren",
};

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export default async function CrmRecordPage({ params, searchParams }: PageProps) {
  const db = getDb();
  const { leadId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // 1. Load lead
  const lead = (await db.select().from(leads).where(eq(leads.id, leadId)))[0];
  if (!lead) notFound();

  // 2. Load brandProfile (optional)
  const brandProfile =
    (await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId)))[0] ?? null;

  // 3. Load latest generatedSite
  const generatedSite =
    (
      await db
        .select()
        .from(generatedSites)
        .where(eq(generatedSites.leadId, leadId))
        .orderBy(desc(generatedSites.version))
    )[0] ?? null;

  // ── ?sent=1 confirmation branch ─────────────────────────────────────────────
  if (resolvedSearchParams.sent === "1") {
    const latestMsg =
      (
        await db
          .select()
          .from(outreachMessages)
          .where(eq(outreachMessages.leadId, leadId))
          .orderBy(desc(outreachMessages.sentAt))
      )[0] ?? null;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">{lead.businessName}</h1>
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800">
          <p className="font-medium">Email sent successfully.</p>
          {latestMsg?.sentAt && (
            <p className="text-sm mt-1">
              Sent at {new Date(latestMsg.sentAt).toLocaleString("nl-BE")}
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

  // ── No deployed site guard ───────────────────────────────────────────────────
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

  // ── Sequence steps + activities ──────────────────────────────────────────────
  const rawSteps = await getSteps(db, leadId);
  const sortedSteps = [...rawSteps].sort((a, b) => a.stepNumber - b.stepNumber);

  const rawActivities = await listActivities(db, leadId);

  // ── Active step ──────────────────────────────────────────────────────────────
  const now = new Date();
  const activeStepRaw = sortedSteps.find(
    (s) =>
      (s.status === "drafted" || s.status === "pending") &&
      (s.scheduledAt == null || new Date(s.scheduledAt) <= now),
  ) ?? null;

  // ── Draft the active step's email if subject/body are empty ─────────────────
  let composerSubject = "";
  let composerBody = "";

  if (activeStepRaw) {
    if (activeStepRaw.subject && activeStepRaw.body) {
      composerSubject = activeStepRaw.subject;
      composerBody = activeStepRaw.body;
    } else {
      try {
        const rendered = await renderOutreachEmail(
          {
            lead: {
              businessName: lead.businessName,
              firstName: lead.contactName ?? null,
              city: lead.city,
              industryKey: lead.industryKey,
              existingWebsiteUrl: lead.existingWebsiteUrl ?? null,
              websiteStalenessScore: lead.websiteStalenessScore ?? null,
            },
            brandProfile: brandProfile
              ? {
                  toneOfVoiceSummary: brandProfile.toneOfVoiceSummary,
                  socialLinks: brandProfile.socialLinks ?? null,
                }
              : null,
            generatedSite: {
              cloudflarePreviewUrl: generatedSite.cloudflarePreviewUrl,
              lighthouseScores: generatedSite.lighthouseScores as Record<string, number> | null,
            },
          },
          activeStepRaw.angle,
        );
        composerSubject = activeStepRaw.subject || rendered.subject;
        composerBody = activeStepRaw.body || rendered.body;
      } catch {
        composerSubject = `Een nieuwe website voor ${lead.businessName} — kijk eens`;
        composerBody = `Beste ondernemer,\n\nIk heb alvast een voorstel voor jullie gebouwd: ${generatedSite.cloudflarePreviewUrl}\n\nVriendelijke groet,\nThomas`;
      }
    }
  }

  // ── Serialize plain data for client components ───────────────────────────────
  const stepsForClient: StepData[] = sortedSteps.map((s) => ({
    id: s.id,
    stepNumber: s.stepNumber,
    angle: s.angle,
    status: s.status,
    scheduledAt: toIso(s.scheduledAt),
  }));

  const activitiesForClient: ActivityData[] = rawActivities.map((a) => ({
    id: a.id,
    type: a.type,
    body: a.body ?? null,
    metadata: (a.metadata ?? null) as Record<string, unknown> | null,
    author: a.author,
    createdAt: toIso(a.createdAt) ?? new Date().toISOString(),
  }));

  const leadForContact = {
    id: lead.id,
    businessName: lead.businessName,
    contactName: lead.contactName ?? null,
    contactRole: lead.contactRole ?? null,
    contactEmail: lead.contactEmail ?? null,
    email: lead.email ?? null,
    mobilePhone: lead.mobilePhone ?? null,
    phone: lead.phone ?? null,
    whatsapp: lead.whatsapp ?? null,
    address: lead.address ?? null,
    city: lead.city,
  };

  const ANGLE_LABELS: Record<string, string> = {
    reveal: "Onthulling",
    social_proof: "Social proof",
    breakup: "Afsluiter",
  };

  const stageLabel = lead.salesStage ? (STAGE_LABELS[lead.salesStage] ?? lead.salesStage) : null;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">{lead.businessName}</h1>
          {stageLabel && (
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
              {stageLabel}
            </span>
          )}
        </div>
        <a
          href="/communication"
          className="text-sm text-stone-500 hover:text-stone-700 underline flex-shrink-0"
        >
          ← Terug
        </a>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 md:grid-cols-[minmax(280px,360px)_1fr]">
        {/* LEFT column */}
        <div className="space-y-4">
          <ContactPanel
            lead={leadForContact}
            socials={brandProfile?.socialLinks ?? null}
          />
          <StagePicker leadId={lead.id} current={lead.salesStage ?? null} />
          <NextAction
            leadId={lead.id}
            nextActionAt={toIso(lead.nextActionAt)}
            nextActionNote={lead.nextActionNote ?? null}
          />
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          <SequenceStepper steps={stepsForClient} />

          {sortedSteps.length === 0 ? (
            <StartSequenceButton leadId={lead.id} />
          ) : activeStepRaw ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-700">
                Stap {activeStepRaw.stepNumber} —{" "}
                {ANGLE_LABELS[activeStepRaw.angle] ?? activeStepRaw.angle}
              </h3>
              <Composer
                leadId={leadId}
                stepId={activeStepRaw.id}
                to={lead.contactEmail ?? lead.email ?? ""}
                initialSubject={composerSubject}
                initialBody={composerBody}
              />
            </div>
          ) : null}

          <ActivityTimeline activities={activitiesForClient} leadId={lead.id} />
        </div>
      </div>
    </div>
  );
}
