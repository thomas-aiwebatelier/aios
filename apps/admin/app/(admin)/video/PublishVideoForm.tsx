"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishVideo, createVideoSlot } from "./actions";

type Customer = { id: string; email: string | null; fullName: string | null };

/**
 * Two jobs on one form, because they are the two ends of the same errand:
 *  · "Open een slot" the moment a request is accepted, so the client's Video
 *    tab shows progress instead of an empty page for four days;
 *  · "Publiceer" when the MP4 is done.
 */
export function PublishVideoForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, form: HTMLFormElement) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fn(new FormData(form));
      if (res.ok) {
        setMsg("Gelukt.");
        form.reset();
        router.refresh();
      } else {
        setErr(res.error ?? "Onbekende fout.");
      }
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(publishVideo, e.currentTarget);
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Klant</span>
        <select name="owner_user_id" required className="w-full rounded border px-3 py-2">
          <option value="">— kies een klant —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.email ?? c.id}
              {c.fullName ? ` (${c.fullName})` : ""}
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <span className="mt-1 block text-xs text-neutral-500">
            Nog geen klanten met een account.
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Titel</span>
        <input
          name="title"
          type="text"
          placeholder="Je commercial"
          className="w-full rounded border px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Duur (s)</span>
          <input
            name="duration_seconds"
            type="number"
            min={1}
            max={60}
            defaultValue={15}
            className="w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Studio-project-id</span>
          <input
            name="studio_project_id"
            type="text"
            placeholder="optioneel"
            className="w-full rounded border px-3 py-2"
          />
        </label>
      </div>

      <fieldset className="rounded border p-3">
        <legend className="px-1 text-sm font-medium">Het bestand — kies één</legend>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm">Download-URL uit de studio</span>
          <input
            name="source_url"
            type="url"
            placeholder="https://firebasestorage.googleapis.com/…"
            className="w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">…of upload de MP4</span>
          <input name="file" type="file" accept="video/*" className="w-full text-sm" />
        </label>
        <p className="mt-2 text-xs text-neutral-500">
          Max 200 MB. Het bestand wordt naar Supabase Storage gekopieerd, zodat
          de klant er niet van een verlopende Firebase-URL afhangt.
        </p>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Bezig…" : "Publiceer naar portaal"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            const form = e.currentTarget.form;
            if (form) void run(createVideoSlot, form);
          }}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Open enkel een slot
        </button>
      </div>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
