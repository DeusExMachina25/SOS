/**
 * The payment badge on a session, worked out for whoever is looking at it.
 *
 * sessions.payment_status is a coarse database flag: for an online (Razorpay)
 * payment it reads "escrow_held" from the moment the client pays until the
 * end of time, even after the session is delivered and every payout has been
 * sent. Showing that flag as-is told people their money was still in escrow
 * long after it wasn't. What is true depends on the viewer:
 *   - a client cares that they've paid, and that it's safe until delivery;
 *   - an expert and an admin care how far the payouts have got, which lives
 *     in the payout rows.
 */

import type { Payment, Session } from "./types";

export type BadgeTone = "neutral" | "warn" | "primary" | "good";

export interface PaymentBadge {
  label: string;
  tone: BadgeTone;
  /** One line of explanation, shown as a tooltip. */
  hint?: string;
}

export interface PayoutProgress {
  /** Payouts that still count (cancelled ones are ignored). */
  total: number;
  sent: number;
}

export type Viewer = "client" | "expert" | "admin";

/** Per-session progress from a flat list of payout rows. */
export function payoutProgressBySession(rows: { sessionId: string; status: string }[]): Map<string, PayoutProgress> {
  const out = new Map<string, PayoutProgress>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const p = out.get(r.sessionId) ?? { total: 0, sent: 0 };
    p.total += 1;
    if (r.status === "transferred") p.sent += 1;
    out.set(r.sessionId, p);
  }
  return out;
}

export function paymentBadge(input: {
  viewer: Viewer;
  session: Pick<Session, "status" | "paymentStatus">;
  payment?: Pick<Payment, "status" | "method"> | null;
  payouts?: PayoutProgress | null;
}): PaymentBadge {
  const { viewer, session, payment, payouts } = input;

  if (payment?.status === "processing" && session.paymentStatus === "unpaid") {
    return {
      label: "Awaiting confirmation",
      tone: "warn",
      hint: viewer === "client" ? "Waiting for your expert to confirm they received your UPI payment." : "A UPI payment is waiting to be confirmed as received.",
    };
  }

  switch (session.paymentStatus) {
    case "unpaid":
      return { label: "Unpaid", tone: "neutral" };

    case "refunded":
      return { label: "Refunded", tone: "neutral" };

    case "released":
      // Paid straight to the expert by UPI: nothing is ever held.
      return { label: viewer === "client" ? "Paid" : "Paid directly", tone: "good", hint: viewer === "client" ? undefined : "Paid straight to the expert by UPI." };

    case "escrow_held": {
      if (viewer === "client") {
        return session.status === "scheduled"
          ? { label: "Paid · held until your session", tone: "primary", hint: "Your payment is held securely and released to your expert once the session is delivered." }
          : { label: "Paid", tone: "good" };
      }

      const total = payouts?.total ?? 0;
      const sent = payouts?.sent ?? 0;
      if (total > 0 && sent === total) {
        return { label: "Paid out", tone: "good", hint: "Every payout for this session has been sent." };
      }
      if (sent > 0) {
        return { label: "Partly paid out", tone: "primary", hint: `${sent} of ${total} payouts sent.` };
      }
      return session.status === "completed"
        ? { label: "Paid · payout due", tone: "warn", hint: "The session is complete and the payout hasn't been sent yet." }
        : { label: "Paid · payout pending", tone: "primary", hint: "Paid by the client. The payout is sent as the session progresses." };
    }

    default:
      return { label: "Unpaid", tone: "neutral" };
  }
}

export const BADGE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-strong)]",
  warn: "bg-[var(--color-orange)]/10 text-[var(--color-orange)] border-[var(--color-orange)]/20",
  primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20",
  good: "bg-[var(--color-green)]/10 text-[var(--color-green)] border-[var(--color-green)]/20",
};
