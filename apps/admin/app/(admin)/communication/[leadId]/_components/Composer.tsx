"use client";

/**
 * Composer.tsx — Client component for the outreach email composer.
 *
 * Features:
 *   - Editable subject + body textareas (pre-filled by server-rendered template)
 *   - Preview panel (body rendered with line-breaks preserved)
 *   - "Send" button → POST /api/leads/[id]/outreach/send
 *   - 30-second countdown UI after send with "Cancel" button
 *   - At countdown=0 → navigate to /communication/[leadId]?sent=1
 *   - "Cancel" button → POST /api/leads/[id]/outreach/cancel, navigate back
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ComposerProps {
  leadId: string;
  to: string;
  initialSubject: string;
  initialBody: string;
  stepId?: string | null;
}

type Phase = "editing" | "countdown" | "sending";

const UNDO_SECONDS = 30;

export function Composer({ leadId, to, initialSubject, initialBody, stepId }: ComposerProps) {
  const router = useRouter();

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [phase, setPhase] = useState<Phase>("editing");
  const [secondsLeft, setSecondsLeft] = useState(UNDO_SECONDS);
  const [outreachMessageId, setOutreachMessageId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  // ── Countdown tick ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "countdown") return;

    if (secondsLeft <= 0) {
      router.push(`/communication/${leadId}?sent=1`);
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, leadId, router]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    setError(null);
    setPhase("sending");

    try {
      const res = await fetch(`/api/leads/${leadId}/outreach/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, stepId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setOutreachMessageId(data.outreachMessageId ?? null);
      setJobId(data.jobId ?? null);
      setSecondsLeft(UNDO_SECONDS);
      setPhase("countdown");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("editing");
    }
  }, [leadId, subject, body]);

  const handleSkip = useCallback(async () => {
    if (!stepId) return;
    try {
      await fetch(`/api/leads/${leadId}/sequence/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      });
    } catch {
      // best-effort
    }
    router.refresh();
  }, [leadId, stepId, router]);

  const handleCancel = useCallback(async () => {
    if (!outreachMessageId) return;
    setError(null);

    try {
      await fetch(`/api/leads/${leadId}/outreach/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachMessageId }),
      });
    } catch {
      // Silently swallow — cancellation is best-effort; the job status check
      // in the worker is the safety net.
    }

    router.push("/communication");
  }, [leadId, outreachMessageId, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "countdown") {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-900">Email queued for delivery</p>
            <p className="text-sm text-yellow-700 mt-1">
              Sending in <span className="font-bold text-yellow-900">{secondsLeft}s</span> to{" "}
              <span className="font-mono">{to}</span>
            </p>
          </div>
          <div
            className="text-4xl font-bold text-yellow-800 tabular-nums"
            aria-live="polite"
          >
            {secondsLeft}
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="inline-flex items-center rounded-md border border-yellow-700 bg-white px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
        >
          Cancel send
        </button>

        <p className="text-xs text-yellow-600">
          The email will be sent automatically when the countdown reaches 0.
          Click "Cancel send" to abort.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* To field (read-only) */}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">To</label>
        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 font-mono">
          {to || <span className="text-red-500">No email address on file</span>}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={phase === "sending"}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      {/* Body / Preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-stone-500">Body</label>
          <button
            onClick={() => setPreview((p) => !p)}
            className="text-xs text-stone-500 hover:text-stone-700 underline"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>

        {preview ? (
          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-800 whitespace-pre-wrap min-h-[320px]">
            {body}
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={phase === "sending"}
            rows={18}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
          />
        )}
      </div>

      {/* Send button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSend}
          disabled={phase === "sending" || !to || !subject || !body}
          className="inline-flex items-center rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === "sending" ? "Queuing…" : "Send email"}
        </button>
        {stepId && (
          <button
            onClick={handleSkip}
            disabled={phase === "sending"}
            className="inline-flex items-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stap overslaan
          </button>
        )}
        <p className="text-xs text-stone-400">
          After clicking Send you have 30 seconds to cancel.
        </p>
      </div>
    </div>
  );
}
