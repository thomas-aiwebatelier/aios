"use client";

import { useState } from "react";
import { captureLeadIntent } from "@/lib/lead-intent-actions";

/**
 * The Educate setup questionnaire. One question per screen — the same reason
 * LeadCaptureForm is two steps: the same questions split across screens
 * converts better than one long wall of fields, and each answer is kept as we
 * go rather than only on submit.
 *
 * Answers land in `lead_intents` as {service:'educate', payload:{answers}}, so
 * they sit in the same queue as every other front-door capture instead of in a
 * fifth bespoke place.
 */

type Question = {
  id: string;
  q: string;
  hint?: string;
  type: "choice" | "text";
  options?: string[];
};

const QUESTIONS: Question[] = [
  {
    id: "business",
    q: "Wat doet je zaak precies?",
    hint: "Eén of twee zinnen volstaan.",
    type: "text",
  },
  {
    id: "size",
    q: "Met hoeveel zijn jullie?",
    type: "choice",
    options: ["Alleen", "2–5", "6–20", "Meer dan 20"],
  },
  {
    id: "time_sink",
    q: "Waar gaat je tijd elke week naartoe zonder dat het iets opbrengt?",
    hint: "Offertes, planning, administratie, klantvragen…",
    type: "text",
  },
  {
    id: "tools",
    q: "Welke tools gebruik je nu dagelijks?",
    hint: "Boekhouding, agenda, CRM, WhatsApp — noem er gerust een paar.",
    type: "text",
  },
  {
    id: "leads",
    q: "Hoe komen klanten vandaag bij je terecht?",
    type: "choice",
    options: ["Mond-aan-mond", "Sociale media", "Google", "Vaste klanten", "Weet ik niet goed"],
  },
  {
    id: "ai_today",
    q: "Gebruik je vandaag al AI voor iets?",
    type: "choice",
    options: ["Nee, nog niet", "Af en toe ChatGPT", "Ja, een paar tools", "Ja, ingebouwd in mijn werk"],
  },
  {
    id: "goal",
    q: "Als er één ding beter zou draaien binnen zes maanden, wat is dat dan?",
    type: "text",
  },
];

export default function SetupQuestionnaire() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const current = answers[q?.id] ?? "";

  function set(value: string) {
    setAnswers((a) => ({ ...a, [q.id]: value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("service", "educate");
    fd.set("answers", JSON.stringify(answers));
    fd.set("source_path", window.location.pathname);
    const res = await captureLeadIntent(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  function next() {
    if (!current.trim()) {
      setError("Vul deze vraag in om verder te gaan.");
      return;
    }
    setError(null);
    if (isLast) void submit();
    else setStep((s) => s + 1);
  }

  if (done) {
    return (
      <div className="quiz quiz--done" role="status" aria-live="polite">
        <h2 className="quiz__title">Bedankt — je antwoorden zijn binnen.</h2>
        <p className="quiz__body">
          Ik stel je persoonlijke AI-setup samen en neem binnen 24 uur contact
          op met een concrete eerste stap.
        </p>
      </div>
    );
  }

  return (
    <div className="quiz">
      <p className="quiz__progress">
        Vraag {step + 1} van {QUESTIONS.length}
      </p>

      <h2 className="quiz__title">{q.q}</h2>
      {q.hint ? <p className="quiz__hint">{q.hint}</p> : null}

      {q.type === "text" ? (
        <textarea
          className="quiz__input"
          rows={4}
          value={current}
          onChange={(e) => set(e.target.value)}
          autoFocus
        />
      ) : (
        <div className="quiz__options">
          {q.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`quiz__option ${current === opt ? "quiz__option--on" : ""}`}
              aria-pressed={current === opt}
              onClick={() => set(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div className="quiz__nav">
        {step > 0 && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
          >
            Terug
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={next} disabled={busy}>
          {busy ? "Even geduld…" : isLast ? "Verstuur" : "Volgende"}
        </button>
      </div>

      {error ? (
        <p className="quiz__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
