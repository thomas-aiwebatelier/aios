/**
 * The list of services the front-door capture form knows about.
 *
 * This lives outside lead-intent-actions.ts on purpose: a "use server" file may
 * only export async functions. Exporting this array from there compiles and
 * typechecks fine, then fails the production build with
 * "A 'use server' file can only export async functions, found object."
 */
export const LEAD_SERVICES = ["build", "video", "market", "educate"] as const;

export type LeadService = (typeof LEAD_SERVICES)[number];

export type LeadIntentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };
