import { describe, it, expect } from "vitest";
import { paymentBadge, payoutProgressBySession } from "@/lib/data/paymentBadge";

const razorpayPaid = (status: "scheduled" | "completed" | "cancelled") => ({ status, paymentStatus: "escrow_held" as const });

describe("paymentBadge: client", () => {
  it("never says escrow, and says the money is held only while the session is ahead", () => {
    const upcoming = paymentBadge({ viewer: "client", session: razorpayPaid("scheduled") });
    expect(upcoming.label).toBe("Paid · held until your session");
    expect(upcoming.hint).toMatch(/released to your expert once the session is delivered/);

    const done = paymentBadge({ viewer: "client", session: razorpayPaid("completed") });
    expect(done).toEqual({ label: "Paid", tone: "good" });
    expect(`${upcoming.label} ${done.label}`).not.toMatch(/escrow/i);
  });

  it("shows a UPI payment as simply paid", () => {
    expect(paymentBadge({ viewer: "client", session: { status: "scheduled", paymentStatus: "released" } }).label).toBe("Paid");
  });

  it("says unpaid, refunded and awaiting confirmation plainly", () => {
    expect(paymentBadge({ viewer: "client", session: { status: "scheduled", paymentStatus: "unpaid" } }).label).toBe("Unpaid");
    expect(paymentBadge({ viewer: "client", session: { status: "cancelled", paymentStatus: "refunded" } }).label).toBe("Refunded");
    const waiting = paymentBadge({
      viewer: "client",
      session: { status: "scheduled", paymentStatus: "unpaid" },
      payment: { status: "processing", method: "upi_direct" },
    });
    expect(waiting.label).toBe("Awaiting confirmation");
    expect(waiting.hint).toMatch(/your expert/);
  });
});

describe("paymentBadge: expert and admin follow the payouts", () => {
  for (const viewer of ["expert", "admin"] as const) {
    describe(viewer, () => {
      it("is pending before the session and due once it is completed with nothing sent", () => {
        expect(paymentBadge({ viewer, session: razorpayPaid("scheduled"), payouts: { total: 2, sent: 0 } }).label).toBe("Paid · payout pending");
        const due = paymentBadge({ viewer, session: razorpayPaid("completed"), payouts: { total: 2, sent: 0 } });
        expect(due.label).toBe("Paid · payout due");
        expect(due.tone).toBe("warn");
      });

      it("shows partial progress, then paid out", () => {
        const partial = paymentBadge({ viewer, session: razorpayPaid("scheduled"), payouts: { total: 2, sent: 1 } });
        expect(partial.label).toBe("Partly paid out");
        expect(partial.hint).toBe("1 of 2 payouts sent.");
        expect(paymentBadge({ viewer, session: razorpayPaid("completed"), payouts: { total: 2, sent: 2 } })).toMatchObject({ label: "Paid out", tone: "good" });
      });

      it("copes with payout rows not being known, or not existing yet", () => {
        expect(paymentBadge({ viewer, session: razorpayPaid("scheduled") }).label).toBe("Paid · payout pending");
        expect(paymentBadge({ viewer, session: razorpayPaid("completed"), payouts: null }).label).toBe("Paid · payout due");
        // zero payouts must not read as "all sent"
        expect(paymentBadge({ viewer, session: razorpayPaid("completed"), payouts: { total: 0, sent: 0 } }).label).toBe("Paid · payout due");
      });

      it("shows a UPI payment as paid directly, and a refund as refunded", () => {
        expect(paymentBadge({ viewer, session: { status: "completed", paymentStatus: "released" } }).label).toBe("Paid directly");
        expect(paymentBadge({ viewer, session: { status: "cancelled", paymentStatus: "refunded" } }).label).toBe("Refunded");
      });
    });
  }

  it("does not use the word escrow anywhere", () => {
    const labels: string[] = [];
    for (const viewer of ["client", "expert", "admin"] as const) {
      for (const status of ["scheduled", "completed", "cancelled"] as const) {
        for (const paymentStatus of ["unpaid", "escrow_held", "released", "refunded"] as const) {
          for (const payouts of [null, { total: 2, sent: 0 }, { total: 2, sent: 1 }, { total: 2, sent: 2 }]) {
            const b = paymentBadge({ viewer, session: { status, paymentStatus }, payouts });
            labels.push(b.label, b.hint ?? "");
          }
        }
      }
    }
    expect(labels.join(" ")).not.toMatch(/escrow/i);
    expect(labels.every((l) => !/undefined|null/.test(l))).toBe(true);
  });
});

describe("payoutProgressBySession", () => {
  it("counts sent and total per session and ignores cancelled payouts", () => {
    const m = payoutProgressBySession([
      { sessionId: "a", status: "transferred" },
      { sessionId: "a", status: "pending" },
      { sessionId: "b", status: "cancelled" },
      { sessionId: "b", status: "cancelled" },
      { sessionId: "c", status: "skipped_route_not_active" },
    ]);
    expect(m.get("a")).toEqual({ total: 2, sent: 1 });
    expect(m.has("b")).toBe(false); // fully refunded: nothing to track
    expect(m.get("c")).toEqual({ total: 1, sent: 0 });
  });

  it("is empty for no rows", () => {
    expect(payoutProgressBySession([]).size).toBe(0);
  });
});
