import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "@atelier/db";

function getConnectionString(): string {
  const fromImportMeta = (import.meta as any).env?.SUPABASE_DATABASE_URL;
  const fromProcess =
    typeof process !== "undefined"
      ? process.env?.SUPABASE_DATABASE_URL ?? process.env?.DATABASE_URL
      : undefined;
  const fromGlobal = (globalThis as any).SUPABASE_DATABASE_URL;
  const url = fromImportMeta ?? fromProcess ?? fromGlobal;
  if (!url) {
    throw new Error("SUPABASE_DATABASE_URL not configured");
  }
  return url;
}

const client = postgres(getConnectionString(), { prepare: false });
export const db = drizzle(client, { schema });
