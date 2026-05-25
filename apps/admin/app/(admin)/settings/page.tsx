/**
 * Settings page — /settings
 *
 * Hosts the admin-editable outreach email template editor. Loads all three
 * angle templates server-side and hands them to the client <TemplateEditor>.
 */

import { loadActiveEmailTemplate, DEFAULT_TEMPLATES, TEMPLATE_PLACEHOLDERS } from "@/lib/email-template";
import { sequenceAngleValues } from "@atelier/db";
import { TemplateEditor } from "./_components/TemplateEditor";

export const dynamic = "force-dynamic";

const ANGLE_LABELS: Record<string, string> = {
  reveal: "1 · Onthulling",
  social_proof: "2 · Social proof",
  breakup: "3 · Afsluiter",
};

export default async function SettingsPage() {
  const templates = await Promise.all(
    sequenceAngleValues.map(async (angle) => {
      const t = await loadActiveEmailTemplate(angle);
      return {
        angle,
        label: ANGLE_LABELS[angle] ?? angle,
        subject: t.subject,
        body: t.body,
        defaultSubject: DEFAULT_TEMPLATES[angle].subject,
        defaultBody: DEFAULT_TEMPLATES[angle].body,
      };
    }),
  );
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500 text-sm mt-1">
          Outreach e-mailsjablonen — één per stap in de sequence. De gepersonaliseerde
          observatie wordt automatisch uit de research van elke lead opgebouwd.
        </p>
      </div>
      <TemplateEditor templates={templates} placeholders={[...TEMPLATE_PLACEHOLDERS]} />
    </div>
  );
}
