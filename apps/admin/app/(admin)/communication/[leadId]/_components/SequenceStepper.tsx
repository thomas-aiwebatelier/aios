// Server-renderable pure component — no "use client" needed.

export type StepData = {
  id: string;
  stepNumber: number;
  angle: string;
  status: string;
  scheduledAt: string | null;
};

const ANGLE_LABELS: Record<string, string> = {
  reveal: "Onthulling",
  social_proof: "Social proof",
  breakup: "Afsluiter",
};

function statusLabel(step: StepData, now: number): string {
  if (step.status === "sent") return "Verzonden";
  if (step.status === "skipped") return "Overgeslagen";
  if (step.status === "cancelled") return "Geannuleerd";
  if (step.status === "drafted" || step.status === "pending") {
    if (!step.scheduledAt || new Date(step.scheduledAt).getTime() <= now) {
      return "Klaar om na te kijken";
    }
    return `Gepland (${new Date(step.scheduledAt).toLocaleDateString("nl-BE")})`;
  }
  return step.status;
}

function dotClass(step: StepData, now: number): string {
  if (step.status === "sent") return "bg-green-500";
  if (step.status === "skipped" || step.status === "cancelled") return "bg-stone-300";
  if (step.status === "drafted" || step.status === "pending") {
    if (!step.scheduledAt || new Date(step.scheduledAt).getTime() <= now) return "bg-amber-400";
    return "bg-stone-300";
  }
  return "bg-stone-300";
}

function textClass(step: StepData): string {
  if (step.status === "skipped" || step.status === "cancelled") return "line-through text-stone-400";
  return "text-stone-700";
}

interface SequenceStepperProps {
  steps: StepData[];
}

export function SequenceStepper({ steps }: SequenceStepperProps) {
  const now = Date.now();
  const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-stone-700">Sequentie</h2>
      {sorted.length === 0 && (
        <p className="text-xs text-stone-400">Nog geen stappen aangemaakt.</p>
      )}
      <ol className="space-y-2">
        {sorted.map((step) => (
          <li key={step.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex-shrink-0 h-3 w-3 rounded-full ${dotClass(step, now)}`}
            />
            <div>
              <span className={`text-sm font-medium ${textClass(step)}`}>
                Stap {step.stepNumber} — {ANGLE_LABELS[step.angle] ?? step.angle}
              </span>
              <span className="block text-xs text-stone-400">{statusLabel(step, now)}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
