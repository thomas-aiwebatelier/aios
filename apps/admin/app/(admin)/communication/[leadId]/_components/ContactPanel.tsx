"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ContactPanelProps {
  lead: {
    id: string;
    businessName: string;
    contactName: string | null;
    contactRole: string | null;
    contactEmail: string | null;
    email: string | null;
    mobilePhone: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string;
  };
  socials: Record<string, string> | null;
}

export function ContactPanel({ lead, socials }: ContactPanelProps) {
  const router = useRouter();

  const [contactName, setContactName] = useState(lead.contactName ?? "");
  const [contactRole, setContactRole] = useState(lead.contactRole ?? "");
  const [contactEmail, setContactEmail] = useState(lead.contactEmail ?? "");
  const [mobilePhone, setMobilePhone] = useState(lead.mobilePhone ?? "");
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/leads/${lead.id}/contact`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, contactRole, contactEmail, mobilePhone, whatsapp, address }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [lead.id, contactName, contactRole, contactEmail, mobilePhone, whatsapp, address, router]);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-stone-700">Contactgegevens</h2>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">{error}</div>
      )}

      {/* Read-only fields */}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Bedrijfsnaam</label>
        <div className="text-sm text-stone-600">{lead.businessName}</div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Gemeente</label>
        <div className="text-sm text-stone-600">{lead.city}</div>
      </div>

      {/* Editable fields */}
      {([
        ["Naam contact", contactName, setContactName],
        ["Functie", contactRole, setContactRole],
        ["E-mail contact", contactEmail, setContactEmail],
        ["GSM", mobilePhone, setMobilePhone],
        ["WhatsApp", whatsapp, setWhatsapp],
        ["Adres", address, setAddress],
      ] as [string, string, (v: string) => void][]).map(([label, value, setter]) => (
        <div key={label}>
          <label className="block text-xs font-medium text-stone-400 mb-1">{label}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setter(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {saving ? "Opslaan…" : "Opslaan"}
      </button>
      {saved && <span className="ml-2 text-xs text-green-600">Opgeslagen</span>}

      {/* Socials */}
      {socials && Object.keys(socials).length > 0 && (
        <div className="pt-2 border-t border-stone-100 space-y-1">
          <p className="text-xs font-medium text-stone-400">Socials</p>
          {Object.entries(socials).map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-stone-500 hover:text-stone-800 truncate"
            >
              {platform}: {url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
