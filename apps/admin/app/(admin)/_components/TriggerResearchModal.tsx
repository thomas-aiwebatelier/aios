"use client";

import { useRef, useState } from "react";

type ModalTab = "query" | "mapsUrl" | "leadId";

export function TriggerResearchModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("query");
  const [loading, setLoading] = useState(false);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    let body: Record<string, string>;
    if (activeTab === "query") {
      body = { type: "discovery", query: data.get("query") as string };
    } else if (activeTab === "mapsUrl") {
      body = { type: "discovery", googleMapsUrl: data.get("googleMapsUrl") as string };
    } else {
      body = { type: "research", leadId: data.get("leadId") as string };
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        alert("Error: " + (json.error ?? res.statusText));
      } else {
        alert("Job enqueued: " + json.jobId);
        form.reset();
        close();
      }
    } catch (err) {
      alert("Network error: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (tab: ModalTab) =>
    `px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
      activeTab === tab
        ? "border-indigo-600 text-indigo-700 font-medium"
        : "border-transparent text-stone-500 hover:text-stone-800"
    }`;

  return (
    <>
      <button
        onClick={open}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
      >
        Trigger research
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-lg shadow-xl border border-stone-200 p-0 w-[480px] backdrop:bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="px-6 pt-5 pb-2 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-800">Trigger research job</h2>
        </div>

        <div className="px-6 pt-3 flex gap-2 border-b border-stone-200">
          <button type="button" className={tabClass("query")} onClick={() => setActiveTab("query")}>
            By query
          </button>
          <button type="button" className={tabClass("mapsUrl")} onClick={() => setActiveTab("mapsUrl")}>
            Google Maps URL
          </button>
          <button type="button" className={tabClass("leadId")} onClick={() => setActiveTab("leadId")}>
            Re-research lead
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {activeTab === "query" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Search query</label>
              <input
                name="query"
                type="text"
                required
                placeholder="bakkerij Antwerpen"
                className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {activeTab === "mapsUrl" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Google Maps URL</label>
              <input
                name="googleMapsUrl"
                type="url"
                required
                placeholder="https://www.google.com/maps/..."
                className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {activeTab === "leadId" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Lead ID</label>
              <input
                name="leadId"
                type="text"
                required
                placeholder="abc123..."
                className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Enqueueing…" : "Enqueue job"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
