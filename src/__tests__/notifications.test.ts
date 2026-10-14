import { describe, it, expect } from "vitest";
import { buildNotices, actionCount } from "@/lib/data/notifications";
import { searchDashboard, type SearchCorpus } from "@/lib/data/search";
import type { Payment, Session } from "@/lib/data/types";

const NOW = Date.parse("2026-11-02T10:00:00.000Z");
const H = 3600_000;

const session = (over: Partial<Session> & { id: string }): Session => ({
  title: "Architecture Review",
  clientId: "c",
  expertId: "e",
  clientName: "Asha Rao",
  expertName: "Dr. Sarah Jenkins",
  date: "Nov 3, 2026",
  time: "10:00 AM",
  startsAt: new Date(NOW + 24 * H).toISOString(),
  endsAt: new Date(NOW + 25 * H).toISOString(),
  status: "scheduled",
  durationMinutes: 60,
  duration: "60 min",
  amountInr: 5000,
  paymentStatus: "unpaid",
  ...over,
});

const upi = (sessionId: string, status: Payment["status"] = "processing"): Payment => ({
  id: `p-${sessionId}`,
  sessionId,
  method: "upi_direct",
  status,
  amountInr: 5000,
  razorpayOrderId: null,
  razorpayPaymentId: null,
});

describe("buildNotices: client", () => {
  const client = (sessions: Session[], payments: Payment[] = []) => buildNotices({ role: "client", sessions, payments, now: NOW });

  it("says nothing when there is nothing to do", () => {
    expect(client([])).toEqual([]);
  });

  it("asks for payment on an unpaid upcoming session", () => {
    const [n] = client([session({ id: "a" })]);
    expect(n.tone).toBe("action");
    expect(n.title).toMatch(/Payment due/);
    expect(n.href).toBe("/dashboard/client/sessions");
  });

  it("switches to a waiting note once a UPI payment is sent", () => {
    const list = client([session({ id: "a" })], [upi("a")]);
    expect(list).toHaveLength(1);
    expect(list[0].tone).toBe("info");
    expect(list[0].title).toMatch(/Waiting for Dr. Sarah Jenkins/);
  });

  it("links to the call when a paid session starts within a day, and when it is live", () => {
    const soon = client([session({ id: "a", paymentStatus: "escrow_held", startsAt: new Date(NOW + 3 * H).toISOString() })]);
    expect(soon[0].title).toMatch(/Starting soon/);
    expect(soon[0].href).toContain("/dashboard/video-call?sessionId=a");

    const live = client([
      session({ id: "b", paymentStatus: "released", startsAt: new Date(NOW - 10 * 60_000).toISOString(), endsAt: new Date(NOW + 50 * 60_000).toISOString() }),
    ]);
    expect(live[0].title).toMatch(/Live now/);
  });

  it("does not nag about a paid session that is days away, or about cancelled and completed ones", () => {
    const far = session({ id: "a", paymentStatus: "escrow_held", startsAt: new Date(NOW + 5 * 24 * H).toISOString() });
    const cancelled = session({ id: "b", status: "cancelled" });
    const completed = session({ id: "c", status: "completed", paymentStatus: "released" });
    expect(client([far, cancelled, completed])).toEqual([]);
  });

  it("copes with a session that has no times", () => {
    expect(() => client([session({ id: "a", startsAt: null, endsAt: null })])).not.toThrow();
  });
});

describe("buildNotices: expert", () => {
  const expert = (sessions: Session[], payments: Payment[] = []) => buildNotices({ role: "expert", sessions, payments, now: NOW });

  it("asks the expert to confirm a UPI payment", () => {
    const [n] = expert([session({ id: "a" })], [upi("a")]);
    expect(n.tone).toBe("action");
    expect(n.title).toMatch(/Confirm payment received from Asha Rao/);
  });

  it("asks to mark a paid session completed once it has ended", () => {
    const ended = session({ id: "a", paymentStatus: "escrow_held", startsAt: new Date(NOW - 2 * H).toISOString(), endsAt: new Date(NOW - H).toISOString() });
    const [n] = expert([ended]);
    expect(n.title).toMatch(/Mark as completed/);
    expect(n.href).toBe("/dashboard/expert/sessions");
  });

  it("does not ask to complete a session that is still running", () => {
    const running = session({ id: "a", paymentStatus: "escrow_held", startsAt: new Date(NOW - 10 * 60_000).toISOString(), endsAt: new Date(NOW + 50 * 60_000).toISOString() });
    const titles = expert([running]).map((n) => n.title);
    expect(titles.some((t) => /Mark as completed/.test(t))).toBe(false);
    expect(titles.some((t) => /Live now/.test(t))).toBe(true);
  });

  it("flags an unpaid session that starts soon as information only", () => {
    const [n] = expert([session({ id: "a", startsAt: new Date(NOW + 5 * H).toISOString() })]);
    expect(n.tone).toBe("info");
  });

  it("puts actions before information and counts only actions", () => {
    const list = expert([
      session({ id: "info", startsAt: new Date(NOW + 5 * H).toISOString() }),
      session({ id: "act", paymentStatus: "escrow_held", startsAt: new Date(NOW - 2 * H).toISOString(), endsAt: new Date(NOW - H).toISOString() }),
    ]);
    expect(list.map((n) => n.tone)).toEqual(["action", "info"]);
    expect(actionCount(list)).toBe(1);
  });
});

describe("searchDashboard", () => {
  const corpus: SearchCorpus = {
    role: "client",
    pages: [
      { name: "Overview", href: "/dashboard/client" },
      { name: "Sessions", href: "/dashboard/client/sessions" },
      { name: "Vault", href: "/dashboard/client/vault" },
    ],
    sessions: [session({ id: "s1", title: "Facade options" }), session({ id: "s2", title: "Budget review", status: "completed" })],
    files: [
      { id: "f1", sessionId: "s1", uploadedBy: "c", uploaderName: "Asha Rao", name: "site-survey.pdf", storagePath: "x", mimeType: null, sizeBytes: 10, createdAt: "2026-10-01T00:00:00Z" },
    ],
    threads: [{ id: "t1", counterpartId: "e", counterpartName: "Dr. Sarah Jenkins", lastMessage: "I'll mark up the south elevation", lastMessageAt: null }],
  };

  it("lists the pages as suggestions when the box is empty", () => {
    const hits = searchDashboard("", corpus);
    expect(hits.map((h) => h.group)).toEqual(["Pages", "Pages", "Pages"]);
  });

  it("finds across sessions, files and conversations, grouped in a fixed order", () => {
    const hits = searchDashboard("s", corpus);
    const groups = hits.map((h) => h.group);
    expect(groups).toEqual([...groups].sort((a, b) => ["Pages", "Sessions", "Files", "Conversations"].indexOf(a) - ["Pages", "Sessions", "Files", "Conversations"].indexOf(b)));
  });

  it("matches case-insensitively and ignores accents", () => {
    expect(searchDashboard("FACADE", corpus).map((h) => h.title)).toContain("Facade options");
    expect(searchDashboard("facâde", corpus).map((h) => h.title)).toContain("Facade options");
  });

  it("requires every word to match, in the title or the detail", () => {
    expect(searchDashboard("sarah south", corpus).map((h) => h.group)).toContain("Conversations");
    expect(searchDashboard("sarah zzzz", corpus)).toEqual([]);
  });

  it("matches the message text of a conversation", () => {
    expect(searchDashboard("elevation", corpus).map((h) => h.id)).toEqual(["thread-t1"]);
  });

  it("sends each hit to the right page for the role", () => {
    const hits = searchDashboard("site-survey", corpus);
    expect(hits[0].href).toBe("/dashboard/client/vault");
    expect(searchDashboard("facade", { ...corpus, role: "expert" })[0].href).toBe("/dashboard/expert/sessions");
  });

  it("ranks an exact or prefix title match first", () => {
    const hits = searchDashboard("vault", corpus);
    expect(hits[0].title).toBe("Vault");
  });

  it("returns nothing for nonsense and never throws on empty data", () => {
    expect(searchDashboard("qqqqq", corpus)).toEqual([]);
    expect(searchDashboard("x", { role: "client", pages: [], sessions: [], files: [], threads: [] })).toEqual([]);
  });

  it("caps each group", () => {
    const many = Array.from({ length: 20 }, (_, i) => session({ id: `m${i}`, title: `Review ${i}` }));
    const hits = searchDashboard("review", { ...corpus, sessions: many });
    expect(hits.filter((h) => h.group === "Sessions")).toHaveLength(5);
  });
});
