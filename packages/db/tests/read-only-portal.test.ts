import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * The portal is read-only. This test guards the two halves of that, because
 * both are easy to undo by accident and neither fails loudly when it breaks.
 *
 * Half one — REVOKE. Policies do not take grants back. A table with a lovely
 * SELECT-only policy still accepts an INSERT from `authenticated` if the grant
 * was never revoked. Every locked table must appear in a revoke statement.
 *
 * Half two — no write POLICIES. A `for all` policy re-opens writes the moment
 * someone re-grants, and `for all` is exactly what these policies used to be,
 * so this is a real regression risk rather than a hypothetical one.
 *
 * This reads the SQL rather than talking to Postgres on purpose: it runs in CI
 * with no database, and it catches the mistake at the point it is made — in the
 * migration file — instead of in production.
 */

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "..", "sql", "rls-and-auth.sql"), "utf8").toLowerCase();

/** Tables a signed-in customer may read but must never write. */
const READ_ONLY_TABLES = [
  "profiles",
  "brands",
  "brand_kit_files",
  "brand_kit_assets",
  "operate_projects",
  "ad_assets",
  "video_deliverables",
];

describe("portal read-only guarantees", () => {
  it.each(READ_ONLY_TABLES)("revokes write grants on %s", (table) => {
    const pattern = new RegExp(
      `revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+public\\.${table}\\s+from`,
    );
    expect(
      pattern.test(sql),
      `public.${table} has no REVOKE. RLS policies alone do NOT remove grants — ` +
        `without this a customer can still write to it.`,
    ).toBe(true);
  });

  it.each(READ_ONLY_TABLES)("grants select on %s so the portal still renders", (table) => {
    const pattern = new RegExp(`grant\\s+select\\s+on\\s+public\\.${table}\\s+to`);
    expect(pattern.test(sql)).toBe(true);
  });

  it("declares no write policies on read-only tables", () => {
    // `create policy "x" on public.<t> for all|insert|update|delete`
    const offenders: string[] = [];
    const re = /create\s+policy\s+"[^"]+"\s+on\s+public\.([a-z_]+)\s+([\s\S]*?)(?=create\s+policy|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
      const [, table, body] = m;
      if (!READ_ONLY_TABLES.includes(table)) continue;
      if (/\bfor\s+(all|insert|update|delete)\b/.test(body)) offenders.push(table);
    }
    expect(
      offenders,
      `write policies found on read-only table(s): ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps lead_intents insert-only — the one writable table", () => {
    // The front door must accept an insert from someone with no account yet…
    expect(/grant\s+insert\s+on\s+public\.lead_intents\s+to/.test(sql)).toBe(true);
    // …but must never be readable by a client, or it becomes a lead scraper.
    expect(/revoke\s+select,\s*update,\s*delete\s+on\s+public\.lead_intents/.test(sql)).toBe(true);
    expect(/create\s+policy\s+"lead_intents_select_admin"/.test(sql)).toBe(true);
  });

  it("enables RLS on every table it grants select on", () => {
    for (const table of [...READ_ONLY_TABLES, "lead_intents"]) {
      const pattern = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`);
      expect(pattern.test(sql), `RLS not enabled on public.${table}`).toBe(true);
    }
  });
});

describe("server actions that spend money are admin-gated", () => {
  const actionsDir = join(here, "..", "..", "..", "apps", "agency-site", "lib");
  const ACTIONS = [
    "brand-actions.ts",
    "creative-actions.ts",
    "brand-file-actions.ts",
    "operate-actions.ts",
  ];

  it.each(ACTIONS)("%s calls requireAdmin, not requireUser", (file) => {
    const src = readFileSync(join(actionsDir, file), "utf8");
    expect(src.includes("requireAdmin"), `${file} must gate on requireAdmin`).toBe(true);
    expect(
      /\brequireUser\s*\(/.test(src),
      `${file} still calls requireUser — any signed-in customer can invoke it`,
    ).toBe(false);
  });
});
