/**
 * activity.ts — lead activity-timeline helpers.
 *
 * Auto-logged events (email sent, reply, stage change, sequence enrolled,
 * step skipped) and manual notes are recorded here and surfaced on the CRM
 * record page in reverse-chronological order.
 */

import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { leadActivities, type Db, type ActivityType } from "@atelier/db";

export async function logActivity(
  db: Db,
  a: {
    leadId: string;
    type: ActivityType;
    body?: string;
    metadata?: Record<string, unknown>;
    author?: string;
  },
): Promise<void> {
  await db.insert(leadActivities).values({
    id: nanoid(),
    leadId: a.leadId,
    type: a.type,
    body: a.body ?? null,
    metadata: a.metadata ?? null,
    author: a.author ?? "thomas",
  });
}

export async function listActivities(db: Db, leadId: string) {
  return db
    .select()
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.createdAt));
}
