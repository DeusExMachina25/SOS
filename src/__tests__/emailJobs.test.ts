import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/email/context", () => ({ loadSessionEmailDetails: vi.fn() }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(), emailConfigured: vi.fn(() => true) }));

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { loadSessionEmailDetails } from "@/lib/email/context";
import { sendEmail } from "@/lib/email/send";
import { sendSessionReminders, REMINDER_WINDOW_HOURS } from "@/lib/email/reminders";
import { notifySessionPaid } from "@/lib/email/notifyBookingPaid";
import type { SessionEmailDetails } from "@/lib/email/bookingEmails";

type Call = [string, unknown[]];
type Result = { data: unknown; error: { message: string } | null };

/**
 * Stand-in for the supabase-js query builder. Every chained call is recorded;
 * awaiting the chain (or maybeSingle) asks `respond` for that query's result.
 */
function fakeAdmin(respond: (table: string, calls: Call[]) => Result) {
  const queries: { table: string; calls: Call[] }[] = [];
  const from = vi.fn((table: string) => {
    const calls: Call[] = [];
    queries.push({ table, calls });
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "gt", "lte", "order", "limit", "upsert", "delete"]) {
      b[m] = (...args: unknown[]) => {
        calls.push([m, args]);
        return b;
      };
    }
    b.maybeSingle = () => Promise.resolve(respond(table, calls));
    b.then = (ok: (r: Result) => unknown, fail: (e: unknown) => unknown) =>
      Promise.resolve(respond(table, calls)).then(ok, fail);
    return b;
  });
  vi.mocked(createSupabaseAdminClient).mockReturnValue({ from } as never);
  return queries;
}

const details = (id: string): SessionEmailDetails => ({
  sessionId: id,
  title: "Kitchen quote",
  startsAt: "2026-11-12T10:30:00Z",
  endsAt: "2026-11-12T11:30:00Z",
  timezone: "Asia/Kolkata",
  client: { name: "Asha", email: "asha@example.com" },
  expert: { name: "Shravani Reddy", email: "shravani@example.com" },
  siteUrl: "https://sos.example",
});

/** The session an email_log upsert is claiming, or undefined for other calls. */
const claimedSession = (calls: Call[]) =>
  (calls.find(([m]) => m === "upsert")?.[1][0] as { session_id?: string } | undefined)?.session_id;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadSessionEmailDetails).mockImplementation(async (_admin, id) => details(id));
  vi.mocked(sendEmail).mockResolvedValue(true);
});

describe("sendSessionReminders", () => {
  const now = new Date("2026-11-11T02:30:00Z");

  it("emails both sides of each due session once, skipping ones already reminded", async () => {
    const queries = fakeAdmin((table, calls) => {
      if (table === "sessions") return { data: [{ id: "s1" }, { id: "s2" }], error: null };
      if (table === "email_log") {
        // s2's reminder was already claimed by an earlier run.
        return { data: claimedSession(calls) === "s1" ? [{ session_id: "s1" }] : [], error: null };
      }
      return { data: null, error: null };
    });

    const result = await sendSessionReminders({ now, gapMs: 0 });

    expect(result).toEqual({ due: 2, sent: 2 });
    expect(vi.mocked(sendEmail).mock.calls.map(([e]) => e.to)).toEqual(["asha@example.com", "shravani@example.com"]);
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toMatch(/^Reminder: Shravani Reddy/);

    const due = queries.find((q) => q.table === "sessions")!.calls;
    expect(due).toContainEqual(["eq", ["status", "scheduled"]]);
    expect(due).toContainEqual(["in", ["payment_status", ["escrow_held", "released"]]]);
    expect(due).toContainEqual(["gt", ["starts_at", now.toISOString()]]);
    const until = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3_600_000).toISOString();
    expect(due).toContainEqual(["lte", ["starts_at", until]]);
  });

  it("gives the claim back when every send fails, so a later run can retry", async () => {
    vi.mocked(sendEmail).mockResolvedValue(false);
    const queries = fakeAdmin((table) => {
      if (table === "sessions") return { data: [{ id: "s1" }], error: null };
      if (table === "email_log") return { data: [{ session_id: "s1" }], error: null };
      return { data: null, error: null };
    });

    expect(await sendSessionReminders({ now, gapMs: 0 })).toEqual({ due: 1, sent: 0 });
    const released = queries.find((q) => q.table === "email_log" && q.calls.some(([m]) => m === "delete"));
    expect(released?.calls).toContainEqual(["eq", ["session_id", "s1"]]);
    expect(released?.calls).toContainEqual(["eq", ["kind", "session_reminder"]]);
  });

  it("keeps going when one session fails", async () => {
    vi.mocked(loadSessionEmailDetails).mockImplementation(async (_admin, id) => {
      if (id === "bad") throw new Error("boom");
      return details(id);
    });
    fakeAdmin((table) => {
      if (table === "sessions") return { data: [{ id: "bad" }, { id: "s1" }], error: null };
      if (table === "email_log") return { data: [{ session_id: "s1" }], error: null };
      return { data: null, error: null };
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendSessionReminders({ now, gapMs: 0 })).toEqual({ due: 2, sent: 2 });
  });
});

describe("notifySessionPaid", () => {
  it("sends the UPI wording when the expert confirmed a direct payment", async () => {
    fakeAdmin((table) => {
      if (table === "payments") return { data: { amount_inr: 3500, method: "upi_direct" }, error: null };
      if (table === "email_log") return { data: [{ session_id: "s1" }], error: null };
      return { data: null, error: null };
    });

    await notifySessionPaid("s1");

    const [client] = vi.mocked(sendEmail).mock.calls.map(([e]) => e);
    expect(client.to).toBe("asha@example.com");
    expect(client.text).toContain("confirmed your UPI payment");
    expect(client.text).toContain("₹3,500");
  });

  it("sends nothing when the session isn't paid", async () => {
    const queries = fakeAdmin(() => ({ data: null, error: null }));
    await notifySessionPaid("s1");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(queries.some((q) => q.table === "email_log")).toBe(false);
  });

  it("sends nothing the second time", async () => {
    fakeAdmin((table) => {
      if (table === "payments") return { data: { amount_inr: 3500, method: "razorpay" }, error: null };
      if (table === "email_log") return { data: [], error: null }; // already claimed
      return { data: null, error: null };
    });
    await notifySessionPaid("s1");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
