// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

type Result = { data?: unknown; error?: { message?: string; status?: number; code?: string } | null };

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  role: null as string | null,
  admin: null as ReturnType<typeof makeAdminShape> | null,
}));

function makeAdminShape(o: {
  invite?: Result;
  link?: Result;
  profileUpsert?: Result;
  expertInsert?: Result;
  deleteUser?: Result;
  getUser?: Result;
  expertRow?: Result;
  profileRow?: Result;
}) {
  const writes: { table: string; op: string; row: Record<string, unknown> }[] = [];
  return {
    writes,
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(async () => o.invite ?? { data: { user: { id: "new-id" } }, error: null }),
        generateLink: vi.fn(async () => o.link ?? { data: { user: { id: "new-id" }, properties: { action_link: "https://supabase.test/verify?token=abc" } }, error: null }),
        deleteUser: vi.fn(async () => o.deleteUser ?? { error: null }),
        getUserById: vi.fn(async () => o.getUser ?? { data: { user: { id: "ex-1", email: "ravi@example.com", last_sign_in_at: null } }, error: null }),
      },
    },
    from: (table: string) => ({
      upsert: async (row: Record<string, unknown>) => {
        writes.push({ table, op: "upsert", row });
        return o.profileUpsert ?? { error: null };
      },
      insert: async (row: Record<string, unknown>) => {
        writes.push({ table, op: "insert", row });
        return o.expertInsert ?? { error: null };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: async () => (table === "expert_profiles" ? o.expertRow ?? { data: { status: "invited" } } : o.profileRow ?? { data: { role: "expert" } }),
        }),
      }),
    }),
  };
}

vi.mock("@/utils/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.role ? { role: state.role } : null }) }) }) }),
  }),
}));
vi.mock("@/utils/supabase/admin", () => ({ createSupabaseAdminClient: () => state.admin }));

import { POST } from "@/app/api/admin/experts/invite/route";

const EXPERT_ID = "11111111-2222-3333-4444-555555555555";

async function call(body: unknown, opts: { origin?: string | null; raw?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.origin !== null) headers.origin = opts.origin ?? "http://localhost:3000";
  const res = await POST(
    new NextRequest("http://localhost:3000/api/admin/experts/invite", {
      method: "POST",
      headers,
      body: opts.raw ?? JSON.stringify(body),
    })
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

const asAdmin = (shape: Parameters<typeof makeAdminShape>[0] = {}) => {
  state.user = { id: "admin-1" };
  state.role = "admin";
  state.admin = makeAdminShape(shape);
  return state.admin;
};

beforeEach(() => {
  state.user = null;
  state.role = null;
  state.admin = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("invite route: who may call it", () => {
  const good = { action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" };

  it("refuses a request from another site before doing anything else", async () => {
    const admin = asAdmin();
    expect((await call(good, { origin: "https://evil.example" })).status).toBe(403);
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("refuses an unreadable body", async () => {
    asAdmin();
    expect((await call(null, { raw: "{not json" })).status).toBe(400);
    expect((await call(null, { raw: "" })).status).toBe(400);
  });

  it("refuses someone who is not signed in", async () => {
    state.admin = makeAdminShape({});
    expect((await call(good)).status).toBe(401);
    expect(state.admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("refuses clients, experts and users with no profile, creating nothing", async () => {
    for (const role of ["client", "expert", null]) {
      state.user = { id: "u" };
      state.role = role;
      state.admin = makeAdminShape({});
      expect((await call(good)).status, String(role)).toBe(403);
      expect(state.admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
      expect(state.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
      expect(state.admin.writes).toEqual([]);
    }
  });

  it("refuses the other actions for a non-admin too", async () => {
    state.user = { id: "u" };
    state.role = "expert";
    state.admin = makeAdminShape({});
    expect((await call({ action: "revoke", expertId: EXPERT_ID })).status).toBe(403);
    expect((await call({ action: "relink", expertId: EXPERT_ID })).status).toBe(403);
    expect(state.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("rejects an unknown action", async () => {
    asAdmin();
    expect((await call({ action: "promote" })).status).toBe(400);
  });
});

describe("invite route: inviting", () => {
  it("emails an invitation, makes them an expert with an 'invited' row, and records who invited them", async () => {
    const admin = asAdmin();
    const { status, json } = await call({ action: "invite", email: "  Ravi@Example.com ", fullName: "Ravi  Menon", deliver: "email" });
    expect(status).toBe(200);
    expect(json).toMatchObject({ ok: true, expertId: "new-id", link: null, emailed: true });

    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith("ravi@example.com", {
      data: { full_name: "Ravi Menon" },
      redirectTo: "http://localhost:3000/auth/accept",
    });
    expect(admin.writes).toEqual([
      { table: "profiles", op: "upsert", row: { id: "new-id", email: "ravi@example.com", full_name: "Ravi Menon", role: "expert" } },
      { table: "expert_profiles", op: "insert", row: expect.objectContaining({ profile_id: "new-id", status: "invited", invited_by: "admin-1" }) },
    ]);
  });

  it("creates a link instead of sending an email when asked", async () => {
    const admin = asAdmin();
    const { json } = await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon", deliver: "link" });
    expect(json).toMatchObject({ ok: true, link: "https://supabase.test/verify?token=abc", emailed: false });
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "invite", email: "ravi@example.com" }));
  });

  it("sends the expert back to the configured site address when one is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sos.example/");
    const admin = asAdmin();
    await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" });
    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith("ravi@example.com", expect.objectContaining({ redirectTo: "https://sos.example/auth/accept" }));
  });

  it("rejects bad input with a message and the failing fields, before creating anything", async () => {
    const admin = asAdmin();
    const { status, json } = await call({ action: "invite", email: "nope", fullName: "R" });
    expect(status).toBe(400);
    expect(json.fields).toEqual({ email: expect.any(String), fullName: expect.any(String) });
    expect(admin.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("treats a missing email or name as invalid rather than crashing", async () => {
    asAdmin();
    expect((await call({ action: "invite" })).status).toBe(400);
    expect((await call({ action: "invite", email: 42, fullName: {} })).status).toBe(400);
  });

  it("will not turn an existing account into an expert", async () => {
    const admin = asAdmin({ invite: { data: { user: null }, error: { message: "A user with this email address has already been registered", code: "email_exists", status: 422 } } });
    const { status, json } = await call({ action: "invite", email: "client@example.com", fullName: "Some Client" });
    expect(status).toBe(409);
    expect(String(json.error)).toMatch(/already has an account/);
    expect(admin.writes).toEqual([]);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("points at the link option when the email limit is hit", async () => {
    asAdmin({ invite: { data: { user: null }, error: { message: "email rate limit exceeded", status: 429 } } });
    const { status, json } = await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" });
    expect(status).toBe(429);
    expect(String(json.error)).toMatch(/Create link/);
  });

  it("doesn't leak the provider's raw error for other failures", async () => {
    asAdmin({ invite: { data: { user: null }, error: { message: "SMTP password for smtp.secret.internal is wrong", status: 500 } } });
    const { status, json } = await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" });
    expect(status).toBe(502);
    expect(JSON.stringify(json)).not.toMatch(/smtp|secret/i);
  });
});

describe("invite route: failing halfway leaves nothing behind", () => {
  it("removes the account again if the profile can't be written, and never adds an expert row", async () => {
    const admin = asAdmin({ profileUpsert: { error: { message: "db down" } } });
    const { status, json } = await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" });
    expect(status).toBe(500);
    expect(String(json.error)).toMatch(/cancelled/);
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("new-id");
    expect(admin.writes.some((w) => w.table === "expert_profiles")).toBe(false);
  });

  it("removes the account again if the expert row can't be written", async () => {
    const admin = asAdmin({ expertInsert: { error: { message: "constraint" } } });
    expect((await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" })).status).toBe(500);
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("new-id");
  });

  it("still answers cleanly when even the clean-up fails", async () => {
    asAdmin({ expertInsert: { error: { message: "constraint" } }, deleteUser: { error: { message: "also down" } } });
    const { status } = await call({ action: "invite", email: "ravi@example.com", fullName: "Ravi Menon" });
    expect(status).toBe(500);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Could not remove the half-created account"), expect.anything());
  });
});

describe("invite route: re-sending and cancelling", () => {
  it("makes a fresh sign-in link for an invitation that is still open", async () => {
    const admin = asAdmin();
    const { status, json } = await call({ action: "relink", expertId: EXPERT_ID });
    expect(status).toBe(200);
    expect(json.link).toBe("https://supabase.test/verify?token=abc");
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "magiclink", email: "ravi@example.com" }));
  });

  it("will not hand out a sign-in link for an expert who has already submitted a profile", async () => {
    const admin = asAdmin({ expertRow: { data: { status: "approved" } } });
    expect((await call({ action: "relink", expertId: EXPERT_ID })).status).toBe(409);
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  it("will not hand out a link for someone who is not an expert at all", async () => {
    const admin = asAdmin({ profileRow: { data: { role: "client" } } });
    expect((await call({ action: "relink", expertId: EXPERT_ID })).status).toBe(404);
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  it("rejects an id that isn't an id, and one that doesn't exist", async () => {
    const admin = asAdmin({ expertRow: { data: null } });
    expect((await call({ action: "revoke", expertId: "../etc/passwd" })).status).toBe(400);
    expect((await call({ action: "revoke", expertId: EXPERT_ID })).status).toBe(404);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("cancels an invitation nobody has signed in to", async () => {
    const admin = asAdmin();
    expect((await call({ action: "revoke", expertId: EXPERT_ID })).status).toBe(200);
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith(EXPERT_ID);
  });

  it("will not delete an account that has already signed in", async () => {
    const admin = asAdmin({ getUser: { data: { user: { id: EXPERT_ID, email: "ravi@example.com", last_sign_in_at: "2026-10-10T00:00:00Z" } }, error: null } });
    const { status, json } = await call({ action: "revoke", expertId: EXPERT_ID });
    expect(status).toBe(409);
    expect(String(json.error)).toMatch(/already signed in/);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("will not delete an expert who has submitted a profile", async () => {
    const admin = asAdmin({ expertRow: { data: { status: "profile_submitted" } } });
    expect((await call({ action: "revoke", expertId: EXPERT_ID })).status).toBe(409);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("reports a failed cancellation rather than pretending it worked", async () => {
    asAdmin({ deleteUser: { error: { message: "down" } } });
    expect((await call({ action: "revoke", expertId: EXPERT_ID })).status).toBe(500);
  });
});
