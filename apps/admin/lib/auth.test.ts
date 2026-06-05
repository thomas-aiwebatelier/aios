import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate auth() from Next (cookies) and the shared guards.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({})),
}));
vi.mock("@atelier/auth", () => ({
  getUser: vi.fn(),
  getRole: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getUser, getRole } from "@atelier/auth";

const mockGetUser = getUser as unknown as ReturnType<typeof vi.fn>;
const mockGetRole = getRole as unknown as ReturnType<typeof vi.fn>;

describe("admin auth()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when not signed in", async () => {
    mockGetUser.mockResolvedValue(null);
    expect(await auth()).toBeNull();
  });

  it("returns null for a non-admin (customer)", async () => {
    mockGetUser.mockResolvedValue({ id: "u1", email: "x@y.z" });
    mockGetRole.mockResolvedValue("customer");
    expect(await auth()).toBeNull();
  });

  it("returns a session for an admin", async () => {
    mockGetUser.mockResolvedValue({ id: "u1", email: "a@b.c" });
    mockGetRole.mockResolvedValue("admin");
    const session = await auth();
    expect(session?.user).toEqual({ id: "u1", email: "a@b.c" });
  });
});
