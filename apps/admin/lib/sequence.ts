import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sequenceSteps, type Db, type SequenceAngle } from "@atelier/db";

const STEP_ANGLES: SequenceAngle[] = ["reveal", "social_proof", "breakup"];
/** Weekday offsets used when scheduling the NEXT step after one is sent.
 *  Index = step number - 1. Step 1 is immediate; step 2 = +3 weekdays after
 *  step 1 sent; step 3 = +4 weekdays after step 2 sent. */
const STEP_OFFSET_WEEKDAYS = [0, 3, 4];

/** Add N weekdays (skipping Sat/Sun) to a date. Pure; never mutates input. */
export function addWeekdays(from: Date, n: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

/** Create the 3 sequence steps for a lead. Idempotent. Step 1 is drafted + due now. */
export async function enrollLead(db: Db, leadId: string): Promise<void> {
  const existing = await db.select().from(sequenceSteps).where(eq(sequenceSteps.leadId, leadId)).limit(1);
  if (existing.length) return;
  const now = new Date();
  for (let i = 0; i < STEP_ANGLES.length; i++) {
    await db.insert(sequenceSteps).values({
      id: nanoid(),
      leadId,
      stepNumber: i + 1,
      angle: STEP_ANGLES[i],
      status: i === 0 ? "drafted" : "pending",
      scheduledAt: i === 0 ? now : null,
    });
  }
}

export async function getSteps(db: Db, leadId: string) {
  return db.select().from(sequenceSteps).where(eq(sequenceSteps.leadId, leadId));
}

/** After step `afterStepNumber` is sent, schedule the next step's scheduledAt. */
export async function scheduleNextStep(db: Db, leadId: string, afterStepNumber: number): Promise<void> {
  const next = afterStepNumber + 1;
  if (next > STEP_ANGLES.length) return;
  const due = addWeekdays(new Date(), STEP_OFFSET_WEEKDAYS[next - 1]);
  await db.update(sequenceSteps)
    .set({ scheduledAt: due })
    .where(and(eq(sequenceSteps.leadId, leadId), eq(sequenceSteps.stepNumber, next)));
}

/** Cancel any not-yet-sent steps (used on reply / accept / decline). */
export async function cancelRemainingSteps(db: Db, leadId: string): Promise<void> {
  await db.update(sequenceSteps)
    .set({ status: "cancelled" })
    .where(and(eq(sequenceSteps.leadId, leadId), inArray(sequenceSteps.status, ["pending", "drafted"])));
}

export async function skipStep(db: Db, stepId: string): Promise<void> {
  await db.update(sequenceSteps).set({ status: "skipped" }).where(eq(sequenceSteps.id, stepId));
}
