import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, requireAdmin, getRole } from "./guards";

/** Minimal SupabaseClient stub covering auth.getUser + profiles role lookup. */
function mockSupabase(opts: { user: unknown; role?: string | null }): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: opts.user } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: opts.role == null ? null : { role: opts.role },
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
}

describe("auth guards", () => {
  it("requireUser throws UNAUTHENTICATED when signed out", async () => {
    await expect(requireUser(mockSupabase({ user: null }))).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("requireUser returns the user when signed in", async () => {
    await expect(
      requireUser(mockSupabase({ user: { id: "u1" } })),
    ).resolves.toMatchObject({ id: "u1" });
  });

  it("getRole defaults to customer when there is no profile row", async () => {
    expect(await getRole(mockSupabase({ user: { id: "u1" }, role: null }), "u1")).toBe(
      "customer",
    );
  });

  it("getRole returns admin when the profile says so", async () => {
    expect(await getRole(mockSupabase({ user: { id: "u1" }, role: "admin" }), "u1")).toBe(
      "admin",
    );
  });

  it("requireAdmin throws FORBIDDEN for a customer", async () => {
    await expect(
      requireAdmin(mockSupabase({ user: { id: "u1" }, role: "customer" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireAdmin throws UNAUTHENTICATED when signed out", async () => {
    await expect(
      requireAdmin(mockSupabase({ user: null })),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("requireAdmin returns the user for an admin", async () => {
    await expect(
      requireAdmin(mockSupabase({ user: { id: "u1" }, role: "admin" })),
    ).resolves.toMatchObject({ id: "u1" });
  });
});
