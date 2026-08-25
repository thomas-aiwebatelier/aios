/**
 * One status vocabulary for all four portal modules.
 *
 * Each pipeline has its own internal state names — `leads.status`,
 * `brands.status`, `operate_projects.status`, `video_deliverables.status` — and
 * none of them are words a client should ever read. This maps them to plain
 * Dutch in one place so the four tabs sound like one product.
 *
 * Rules for the copy:
 *  - first person, present tense: "Ik bouw je site" — someone is doing this
 *  - honest about waiting: no fake percentages, no invented ETAs
 *  - a failure says a human is on it, because one is
 */

export type PortalService = "build" | "video" | "market" | "operate";

const LABELS: Record<PortalService, Record<string, string>> = {
  build: {
    discovered: "Ik heb je aanvraag en bekijk je site.",
    researching: "Ik analyseer je site en je merk…",
    awaiting_approval: "Je aanvraag is geanalyseerd. Ik zet de bouw in gang.",
    approved: "Je site wordt gebouwd…",
    generating: "Je site wordt gebouwd…",
    generated: "Je site is klaar, ik zet ze online.",
    deployed: "Klaar — je site staat online.",
    generation_failed: "Er liep iets mis bij het bouwen. Ik kijk ernaar.",
  },
  video: {
    requested: "Je aanvraag is binnen. Ik lees je idee.",
    briefing: "Ik schrijf het scenario en de beeldrichting.",
    producing: "Ik maak de scènes…",
    review: "De eerste versie is klaar, ik bekijk elke take.",
    delivered: "Klaar — je commercial staat hieronder.",
  },
  // Covers both `brands.status` and `ad_assets.status` — they share a
  // vocabulary and a tab, so they share the labels.
  market: {
    queued: "Staat in de rij.",
    running: "Ik analyseer je merk en je kanalen…",
    generating: "Ik maak dit aan…",
    ready: "Klaar.",
    failed: "Er liep iets mis. Ik kijk ernaar.",
  },
  operate: {
    submitted: "Je antwoorden zijn binnen. Ik neem ze door.",
    reviewing: "Ik bekijk waar AI bij jou het meeste oplevert.",
    scoped: "Het voorstel ligt klaar, ik neem contact op.",
    building: "Ik zet je AI-systeem op…",
    live: "Klaar — je AI-systeem draait.",
  },
};

/** States after which nothing more will change on its own. */
const TERMINAL: Record<PortalService, ReadonlySet<string>> = {
  build: new Set(["deployed", "generation_failed"]),
  video: new Set(["delivered"]),
  market: new Set(["ready", "failed"]),
  operate: new Set(["live"]),
};

export function statusLabel(service: PortalService, status: string | null | undefined): string {
  if (!status) return "Aanvraag ontvangen.";
  return LABELS[service][status] ?? "Ik ben ermee bezig.";
}

/**
 * Whether to stop polling. Unknown states are treated as still-running: a
 * spinner that outstays its welcome is a smaller failure than a page that
 * silently stops updating while work is happening.
 */
export function isTerminal(service: PortalService, status: string | null | undefined): boolean {
  if (!status) return false;
  return TERMINAL[service].has(status);
}
