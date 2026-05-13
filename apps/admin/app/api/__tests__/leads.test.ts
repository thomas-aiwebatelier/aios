import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDb, createSchema, leads, pipelineJobs } from "@atelier/db";
import { nanoid } from "nanoid";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeDb() {
  const db = createDb(":memory:");
  createSchema(db);
  return db;
}

function insertLead(
  db: ReturnType<typeof createDb>,
  overrides: Partial<{
    status: string;
    businessName: string;
    industryKey: string;
    city: string;
    slug: string;
  }> = {}
) {
  const id = nanoid();
  db.insert(leads)
    .values({
      id,
      slug: overrides.slug ?? `slug-${id}`,
      status: (overrides.status ?? "discovered") as typeof leads.$inferInsert["status"],
      businessName: overrides.businessName ?? "Test Bakkerij",
      city: overrides.city ?? "Antwerpen",
      industryKey: overrides.industryKey ?? "bakery-restaurant",
    })
    .run();
  return id;
}

// ── mock @/lib/db to return an in-memory DB ───────────────────────────────────

let currentDb: ReturnType<typeof createDb>;

vi.mock("@/lib/db", () => ({
  getDb: () => currentDb,
}));

// ── mock @/lib/industry-keys ──────────────────────────────────────────────────

vi.mock("@/lib/industry-keys", () => ({
  getValidIndustryKeys: () => [
    "automotive",
    "bakery-restaurant",
    "beauty-personal-care",
    "creative-services",
    "fitness-sport",
    "health-wellness",
    "professional-services",
    "real-estate-property",
    "retail-boutique",
    "trades-construction",
  ],
}));

// ── GET /api/leads ─────────────────────────────────────────────────────────

describe("GET /api/leads", () => {
  beforeEach(() => {
    currentDb = makeDb();
  });

  it("returns all leads when no status filter", async () => {
    insertLead(currentDb, { status: "discovered" });
    insertLead(currentDb, { status: "awaiting_approval" });

    const { GET } = await import("../leads/route.js");
    const req = new Request("http://localhost/api/leads");
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.leads).toHaveLength(2);
  });

  it("filters by single status", async () => {
    insertLead(currentDb, { status: "discovered" });
    insertLead(currentDb, { status: "awaiting_approval" });

    const { GET } = await import("../leads/route.js");
    const req = new Request("http://localhost/api/leads?status=discovered");
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.leads).toHaveLength(1);
    expect(json.leads[0].status).toBe("discovered");
  });

  it("returns 400 for invalid status", async () => {
    const { GET } = await import("../leads/route.js");
    const req = new Request("http://localhost/api/leads?status=bogus");
    const res = await GET(req as any);

    expect(res.status).toBe(400);
  });
});

// ── POST /api/leads/[id]/approve ──────────────────────────────────────────────

describe("POST /api/leads/[id]/approve", () => {
  beforeEach(() => {
    currentDb = makeDb();
  });

  it("flips status to approved and enqueues generation job", async () => {
    const id = insertLead(currentDb, { status: "awaiting_approval" });

    const { POST } = await import("../leads/[id]/approve/route.js");
    const req = new Request(`http://localhost/api/leads/${id}/approve`, { method: "POST" });
    const res = await POST(req as any, { params: Promise.resolve({ id }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.jobId).toBeTruthy();

    const lead = currentDb.select().from(leads).all().find((l: any) => l.id === id);
    expect(lead?.status).toBe("approved");
    expect(lead?.approvedAt).toBeTruthy();

    const jobs = currentDb.select().from(pipelineJobs).all();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].pipelineStep).toBe("generation");
    expect(jobs[0].leadId).toBe(id);
    expect(jobs[0].status).toBe("queued");
  });

  it("returns 404 for non-existent lead", async () => {
    const { POST } = await import("../leads/[id]/approve/route.js");
    const req = new Request("http://localhost/api/leads/nope/approve", { method: "POST" });
    const res = await POST(req as any, { params: Promise.resolve({ id: "nope" }) });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/leads/[id]/reject ───────────────────────────────────────────────

describe("POST /api/leads/[id]/reject", () => {
  beforeEach(() => {
    currentDb = makeDb();
  });

  it("sets status to archived", async () => {
    const id = insertLead(currentDb, { status: "awaiting_approval" });

    const { POST } = await import("../leads/[id]/reject/route.js");
    const req = new Request(`http://localhost/api/leads/${id}/reject`, { method: "POST" });
    const res = await POST(req as any, { params: Promise.resolve({ id }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const all = currentDb.select().from(leads).all();
    const lead = all.find((l: any) => l.id === id);
    expect(lead?.status).toBe("archived");
  });

  it("returns 404 for non-existent lead", async () => {
    const { POST } = await import("../leads/[id]/reject/route.js");
    const req = new Request("http://localhost/api/leads/nope/reject", { method: "POST" });
    const res = await POST(req as any, { params: Promise.resolve({ id: "nope" }) });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/leads/[id]/industry-override ────────────────────────────────────

describe("POST /api/leads/[id]/industry-override", () => {
  beforeEach(() => {
    currentDb = makeDb();
  });

  it("updates industry key and sets confidence to 1.0", async () => {
    const id = insertLead(currentDb, { industryKey: "automotive" });

    const { POST } = await import("../leads/[id]/industry-override/route.js");
    const req = new Request(`http://localhost/api/leads/${id}/industry-override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry_key: "bakery-restaurant" }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ id }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const all = currentDb.select().from(leads).all();
    const lead = all.find((l: any) => l.id === id);
    expect(lead?.industryKey).toBe("bakery-restaurant");
    expect(lead?.industryClassificationConfidence).toBe(1.0);
  });

  it("returns 400 for invalid industry key", async () => {
    const id = insertLead(currentDb);

    const { POST } = await import("../leads/[id]/industry-override/route.js");
    const req = new Request(`http://localhost/api/leads/${id}/industry-override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry_key: "not-a-real-industry" }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ id }) });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent lead", async () => {
    const { POST } = await import("../leads/[id]/industry-override/route.js");
    const req = new Request("http://localhost/api/leads/nope/industry-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry_key: "automotive" }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ id: "nope" }) });

    expect(res.status).toBe(404);
  });
});

// ── POST /api/pipeline/trigger ────────────────────────────────────────────────

describe("POST /api/pipeline/trigger", () => {
  beforeEach(() => {
    currentDb = makeDb();
  });

  it("enqueues discovery job for type=discovery with query", async () => {
    const { POST } = await import("../pipeline/trigger/route.js");
    const req = new Request("http://localhost/api/pipeline/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "discovery", query: "bakkerij Antwerpen" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.jobId).toBeTruthy();

    const jobs = currentDb.select().from(pipelineJobs).all();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].pipelineStep).toBe("discovery");
    expect((jobs[0].payload as any).query).toBe("bakkerij Antwerpen");
  });

  it("enqueues discovery job for type=discovery with googleMapsUrl", async () => {
    const { POST } = await import("../pipeline/trigger/route.js");
    const req = new Request("http://localhost/api/pipeline/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "discovery", googleMapsUrl: "https://maps.google.com/xyz" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    const jobs = currentDb.select().from(pipelineJobs).all();
    expect(jobs[0].pipelineStep).toBe("discovery");
    expect((jobs[0].payload as any).googleMapsUrl).toBe("https://maps.google.com/xyz");
  });

  it("enqueues research job for type=research", async () => {
    const leadId = insertLead(currentDb);

    const { POST } = await import("../pipeline/trigger/route.js");
    const req = new Request("http://localhost/api/pipeline/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "research", leadId }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    const jobs = currentDb.select().from(pipelineJobs).all();
    expect(jobs[0].pipelineStep).toBe("research");
    expect(jobs[0].leadId).toBe(leadId);
  });

  it("returns 400 for unknown type", async () => {
    const { POST } = await import("../pipeline/trigger/route.js");
    const req = new Request("http://localhost/api/pipeline/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "foobar" }),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
  });

  it("returns 400 for discovery without query or googleMapsUrl", async () => {
    const { POST } = await import("../pipeline/trigger/route.js");
    const req = new Request("http://localhost/api/pipeline/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "discovery" }),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
  });
});
