import { createDb } from "@atelier/db";

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_PATH ?? "./data/atelier.db");
  return _db;
}
