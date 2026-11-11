import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // Outside a real request there is no "after the response"; run it now.
  after: (fn: () => unknown) => {
    void fn();
  },
}));
vi.mock("@/utils/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/email/notifyBookingPaid", () => ({ notifySessionPaid: vi.fn() }));
vi.mock("@/lib/email/reminders", () => ({ sendSessionReminders: vi.fn(async () => ({ due: 1, sent: 2 })) }));
vi.mock("@/lib/email/send", () => ({ emailConfigured: vi.fn(() => true) }));

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { notifySessionPaid } from "@/lib/email/notifyBookingPaid";
import { sendSessionReminders } from "@/lib/email/reminders";
import { POST as confirmed } from "@/app/api/payments/confirmed/route";
import { GET as reminders } from "@/app/api/cron/reminders/route";

const EXPERT = "expert-1";
const CLIENT = "client-1";

function signedInAs(userId: string | null, session: { id: string; client_id: string; expert_id: string } | null) {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: session, error: null }) };
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: () => query,
  } as never);
}

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/payments/confirmed", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/payments/confirmed", () => {
  it("asks for the confirmation email when the expert of the session calls", async () => {
    signedInAs(EXPERT, { id: "s1", client_id: CLIENT, expert_id: EXPERT });
    const res = await confirmed(post({ sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(notifySessionPaid).toHaveBeenCalledWith("s1");
  });

  it("refuses someone who isn't signed in", async () => {
    signedInAs(null, null);
    expect((await confirmed(post({ sessionId: "s1" }))).status).toBe(401);
    expect(notifySessionPaid).not.toHaveBeenCalled();
  });

  it("refuses a session that isn't theirs", async () => {
    signedInAs("stranger", { id: "s1", client_id: CLIENT, expert_id: EXPERT });
    expect((await confirmed(post({ sessionId: "s1" }))).status).toBe(404);
    expect(notifySessionPaid).not.toHaveBeenCalled();
  });

  it("rejects a bad payload", async () => {
    signedInAs(EXPERT, null);
    expect((await confirmed(post({ sessionId: 42 }))).status).toBe(400);
  });
});

describe("GET /api/cron/reminders", () => {
  const call = (auth?: string) =>
    reminders(new NextRequest("http://localhost/api/cron/reminders", { headers: auth ? { authorization: auth } : {} }));

  beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret-value-for-tests"));
  afterEach(() => vi.unstubAllEnvs());

  it("runs the job for the scheduler's secret", async () => {
    const res = await call("Bearer s3cret-value-for-tests");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ due: 1, sent: 2 });
    expect(sendSessionReminders).toHaveBeenCalledOnce();
  });

  it("refuses a missing or wrong secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(sendSessionReminders).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    expect(sendSessionReminders).not.toHaveBeenCalled();
  });
});
