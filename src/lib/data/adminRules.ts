/**
 * The rules behind the admin console, kept pure so they can be tested without
 * a database: which expert status changes are offered, how experts and
 * payouts are ordered and summarised, and when a payout or refund is allowed.
 */

import type { ExpertStatus, PaymentStatus, SessionStatus } from "./types";

export interface ExpertAction {
  to: ExpertStatus;
  label: string;
  /** "primary" is the expected next step; "danger" removes or blocks an expert. */
  tone: "primary" | "danger" | "neutral";
  /** Asked before running, because it changes who clients can book. */
  confirm?: string;
}

/** What an admin can do next with an expert in this state. */
export function expertActions(status: ExpertStatus): ExpertAction[] {
  switch (status) {
    case "profile_submitted":
      return [
        { to: "approved", label: "Approve", tone: "primary", confirm: "Approve this expert? They become visible and bookable straight away." },
        { to: "rejected", label: "Reject", tone: "danger", confirm: "Reject this application? They stay hidden and cannot be booked." },
      ];
    case "approved":
      return [
        { to: "suspended", label: "Suspend", tone: "danger", confirm: "Suspend this expert? They disappear from the directory and can't be booked. Existing sessions are not cancelled." },
      ];
    case "suspended":
      return [{ to: "approved", label: "Reinstate", tone: "primary", confirm: "Reinstate this expert? They become bookable again." }];
    case "rejected":
      return [{ to: "approved", label: "Approve instead", tone: "neutral", confirm: "Approve this previously rejected expert?" }];
    case "invited":
    default:
      return []; // hasn't submitted a profile yet, so there is nothing to review
  }
}

export const EXPERT_STATUS_LABEL: Record<ExpertStatus, string> = {
  invited: "Invited",
  profile_submitted: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

const EXPERT_ORDER: ExpertStatus[] = ["profile_submitted", "suspended", "invited", "rejected", "approved"];

/** Needs-review first, then the rest; newest first inside a group. */
export function sortExperts<T extends { status: ExpertStatus; createdAt: string }>(experts: T[]): T[] {
  return [...experts].sort((a, b) => {
    const byStatus = EXPERT_ORDER.indexOf(a.status) - EXPERT_ORDER.indexOf(b.status);
    return byStatus !== 0 ? byStatus : b.createdAt.localeCompare(a.createdAt);
  });
}

export type TransferStatus = "pending" | "transferred" | "skipped_route_not_active" | "failed" | "cancelled";
export type TransferType = "booking_release" | "completion_release";

export interface PayoutLike {
  type: TransferType;
  status: TransferStatus;
  amountInr: number;
  sessionStatus: SessionStatus;
}

/** A payout the admin still owes the expert (not yet sent, not cancelled). */
export const isOwed = (p: Pick<PayoutLike, "status">) => p.status === "pending" || p.status === "skipped_route_not_active";

export const TRANSFER_LABEL: Record<TransferType, string> = {
  booking_release: "Booking payout (60%)",
  completion_release: "Completion payout (40%)",
};

/**
 * Whether it is time to send this payout. The booking share can go out once
 * the client has paid; the completion share waits until the expert has
 * actually delivered, so a refund stays possible until then.
 */
export function payoutReadiness(p: PayoutLike): { ready: boolean; reason?: string } {
  if (!isOwed(p)) return { ready: false, reason: p.status === "transferred" ? "Already sent" : "Cancelled" };
  if (p.sessionStatus === "cancelled") return { ready: false, reason: "The session was cancelled. Check whether this should be refunded instead." };
  if (p.type === "completion_release" && p.sessionStatus !== "completed") {
    return { ready: false, reason: "Wait until the session is marked completed." };
  }
  return { ready: true };
}

export function summarisePayouts(payouts: PayoutLike[]): { owedInr: number; owedCount: number; sentInr: number; readyCount: number } {
  let owedInr = 0;
  let owedCount = 0;
  let sentInr = 0;
  let readyCount = 0;
  for (const p of payouts) {
    if (isOwed(p)) {
      owedInr += p.amountInr;
      owedCount += 1;
      if (payoutReadiness(p).ready) readyCount += 1;
    } else if (p.status === "transferred") {
      sentInr += p.amountInr;
    }
  }
  return { owedInr, owedCount, sentInr, readyCount };
}

/** A refund is recorded for sessions that were actually paid. */
export function canRefund(s: { paymentStatus: PaymentStatus }): boolean {
  return s.paymentStatus === "escrow_held" || s.paymentStatus === "released";
}

/** Plain-language caveat shown before a refund, depending on how the client paid. */
export function refundWarning(s: { paymentStatus: PaymentStatus }): string {
  return s.paymentStatus === "released"
    ? "This was paid straight to the expert by UPI, so SOS never held the money. Recording the refund cancels the session; the expert has to return the money themselves."
    : "This records the refund and cancels any payouts not yet sent. It does not move money: refund the client in Razorpay yourself.";
}

/** The pending-review queue length, for the overview tile and the sidebar. */
export function pendingReviewCount(experts: { status: ExpertStatus }[]): number {
  return experts.filter((e) => e.status === "profile_submitted").length;
}
