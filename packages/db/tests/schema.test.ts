import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb } from "../src/client.js";
import { leads } from "../src/schema.js";

describe("schema (pglite)", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;

  beforeEach(async () => {
    db = await getTestDb();
  });

  it("inserts and reads a lead", async () => {
    await db.insert(leads).values({
      id: "test-1",
      slug: "test-bakery-antw-x4k2",
      status: "discovered",
      businessName: "Test Bakery",
      city: "Antwerpen",
      industryKey: "bakery-restaurant",
    });
    const rows = await db.select().from(leads);
    expect(rows).toHaveLength(1);
    expect(rows[0].businessName).toBe("Test Bakery");
  });

  it("enforces unique slug", async () => {
    await db.insert(leads).values({
      id: "test-2",
      slug: "dup",
      status: "discovered",
      businessName: "X",
      city: "Y",
      industryKey: "professional-services",
    });
    await expect(
      db.insert(leads).values({
        id: "test-3",
        slug: "dup",
        status: "discovered",
        businessName: "Z",
        city: "Y",
        industryKey: "professional-services",
      }),
    ).rejects.toThrow(/unique|duplicate/i);
  });
});
