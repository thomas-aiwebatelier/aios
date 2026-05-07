import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDb, createSchema } from "../src/client.js";
import { leads } from "../src/schema.js";
import fs from "node:fs";

describe("schema", () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => {
    db = createDb(":memory:");
    createSchema(db);
  });

  it("inserts and reads a lead", () => {
    db.insert(leads).values({
      id: "test-1", slug: "test-bakery-antw-x4k2",
      status: "discovered", businessName: "Test Bakery",
      city: "Antwerpen", industryKey: "bakery-restaurant",
    }).run();
    const rows = db.select().from(leads).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].businessName).toBe("Test Bakery");
  });

  it("enforces unique slug", () => {
    const insert = () => db.insert(leads).values({
      id: "test-2", slug: "dup", status: "discovered",
      businessName: "X", city: "Y", industryKey: "professional-services",
    }).run();
    insert();
    expect(insert).toThrow(/UNIQUE/);
  });

  it("enables WAL mode on file-backed db", () => {
    const path = `./test-wal-${Date.now()}.db`;
    let fileDb: ReturnType<typeof createDb> | undefined;
    try {
      fileDb = createDb(path);
      const result = fileDb.$client.pragma("journal_mode") as Array<{ journal_mode: string }>;
      expect(result[0].journal_mode).toBe("wal");
    } finally {
      // cleanup temp db files
      for (const ext of ["", "-wal", "-shm"]) {
        try { fs.unlinkSync(path + ext); } catch { /* ignore */ }
      }
    }
  });
});
