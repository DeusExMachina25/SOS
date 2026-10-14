import { describe, it, expect } from "vitest";
import {
  expertActions,
  sortExperts,
  payoutReadiness,
  summarisePayouts,
  canRefund,
  refundWarning,
  pendingReviewCount,
  isOwed,
  type PayoutLike,
} from "@/lib/data/adminRules";
import type { ExpertStatus } from "@/lib/data/types";

const payout = (over: Partial<PayoutLike> = {}): PayoutLike => ({
  type: "booking_release",
  status: "pending",
  amountInr: 3000,
  sessionStatus: "scheduled",
  ...over,
});

describe("expertActions", () => {
  it("offers approve and reject for a submitted application, and asks first", () => {
    const actions = expertActions("profile_submitted");
    expect(actions.map((a) => a.to)).toEqual(["approved", "rejected"]);
    expect(actions.every((a) => a.confirm)).toBe(true);
  });

  it("only offers suspending an approved expert", () => {
    expect(expertActions("approved").map((a) => a.to)).toEqual(["suspended"]);
  });

  it("lets a suspended or rejected expert be brought back, never straight to suspended", () => {
    expect(expertActions("suspended").map((a) => a.to)).toEqual(["approved"]);
    expect(expertActions("rejected").map((a) => a.to)).toEqual(["approved"]);
  });

  it("offers nothing for an expert who has not submitted a profile", () => {
    expect(expertActions("invited")).toEqual([]);
  });

  it("never offers the status an expert is already in", () => {
    const all: ExpertStatus[] = ["invited", "profile_submitted", "approved", "rejected", "suspended"];
    for (const status of all) {
      expect(expertActions(status).map((a) => a.to)).not.toContain(status);
    }
  });
});

describe("sortExperts", () => {
  it("puts applications needing review first, then newest first within a group", () => {
    const list = [
      { id: "a", status: "approved" as const, createdAt: "2026-10-01" },
      { id: "b", status: "profile_submitted" as const, createdAt: "2026-09-01" },
      { id: "c", status: "profile_submitted" as const, createdAt: "2026-10-05" },
      { id: "d", status: "suspended" as const, createdAt: "2026-10-02" },
    ];
    expect(sortExperts(list).map((e) => e.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("does not mutate its input", () => {
    const list = [
      { status: "approved" as const, createdAt: "1" },
      { status: "profile_submitted" as const, createdAt: "2" },
    ];
    const before = JSON.stringify(list);
    sortExperts(list);
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe("payoutReadiness", () => {
  it("lets the booking share go out once paid", () => {
    expect(payoutReadiness(payout()).ready).toBe(true);
  });

  it("holds the completion share until the session is completed", () => {
    const early = payoutReadiness(payout({ type: "completion_release" }));
    expect(early.ready).toBe(false);
    expect(early.reason).toMatch(/completed/);
    expect(payoutReadiness(payout({ type: "completion_release", sessionStatus: "completed" })).ready).toBe(true);
  });

  it("refuses a payout on a cancelled session and points at refunds", () => {
    const r = payoutReadiness(payout({ sessionStatus: "cancelled" }));
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/refund/i);
  });

  it("refuses a payout that was already sent or cancelled", () => {
    expect(payoutReadiness(payout({ status: "transferred" })).reason).toBe("Already sent");
    expect(payoutReadiness(payout({ status: "cancelled" })).reason).toBe("Cancelled");
  });

  it("treats the legacy 'route not active' rows as owed", () => {
    expect(isOwed({ status: "skipped_route_not_active" })).toBe(true);
    expect(payoutReadiness(payout({ status: "skipped_route_not_active" })).ready).toBe(true);
  });
});

describe("summarisePayouts", () => {
  it("adds up what is owed, what is ready, and what has been sent", () => {
    const s = summarisePayouts([
      payout({ amountInr: 3000 }), // owed, ready
      payout({ amountInr: 2000, type: "completion_release" }), // owed, not ready
      payout({ amountInr: 1500, status: "transferred" }),
      payout({ amountInr: 999, status: "cancelled" }),
    ]);
    expect(s).toEqual({ owedInr: 5000, owedCount: 2, sentInr: 1500, readyCount: 1 });
  });

  it("is all zeros for no payouts", () => {
    expect(summarisePayouts([])).toEqual({ owedInr: 0, owedCount: 0, sentInr: 0, readyCount: 0 });
  });
});

describe("refunds", () => {
  it("only allows refunding a paid session", () => {
    expect(canRefund({ paymentStatus: "escrow_held" })).toBe(true);
    expect(canRefund({ paymentStatus: "released" })).toBe(true);
    expect(canRefund({ paymentStatus: "unpaid" })).toBe(false);
    expect(canRefund({ paymentStatus: "refunded" })).toBe(false);
  });

  it("is honest that recording a refund does not move money", () => {
    expect(refundWarning({ paymentStatus: "escrow_held" })).toMatch(/does not move money/);
    expect(refundWarning({ paymentStatus: "released" })).toMatch(/expert has to return the money/);
  });
});

describe("pendingReviewCount", () => {
  it("counts only applications awaiting review", () => {
    expect(pendingReviewCount([{ status: "profile_submitted" }, { status: "approved" }, { status: "profile_submitted" }, { status: "invited" }])).toBe(2);
    expect(pendingReviewCount([])).toBe(0);
  });
});
