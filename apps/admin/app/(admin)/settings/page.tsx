/**
 * Settings page — /settings
 *
 * Hosts the admin-editable outreach email template editor. Loads the active
 * template (or the built-in default) server-side and hands it to the client
 * <TemplateEditor>.
 */

import {
  loadActiveEmailTemplate,
  TEMPLATE_PLACEHOLDERS,
  DEFAULT_SUBJECT_TEMPLATE,
  DEFAULT_BODY_TEMPLATE,
} from "@/lib/email-template";
import { TemplateEditor } from "./_components/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { subject, body } = await loadActiveEmailTemplate();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500 text-sm mt-1">
          Outreach e-mailsjabloon — pas de standaardtekst aan die de composer
          voorinvult. De gepersonaliseerde observatie wordt automatisch uit de
          research van elke lead opgebouwd.
        </p>
      </div>

      <TemplateEditor
        initialSubject={subject}
        initialBody={body}
        defaultSubject={DEFAULT_SUBJECT_TEMPLATE}
        defaultBody={DEFAULT_BODY_TEMPLATE}
        placeholders={[...TEMPLATE_PLACEHOLDERS]}
      />
    </div>
  );
}
