import "server-only";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { buildBookingPaidEmails } from "./bookingEmails";
import { claimEmail, releaseEmail } from "./claim";
import { loadSessionEmailDetails } from "./context";
import { emailConfigured, sendEmail } from "./send";

/** Razorpay paths know the order, not the session: look it up, then notify. */
export async function notifyBookingPaid(orderId: string) {
  if (!emailConfigured()) return;
  try {
    const admin = createSupabaseAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("session_id")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    if (payment?.session_id) await notifySessionPaid(payment.session_id);
  } catch (e) {
    console.error("notifyBookingPaid failed", e);
  }
}

/**
 * Emails the client and the expert that a session is paid and booked: after a
 * Razorpay payment, or when the expert confirms a direct UPI transfer.
 * Safe to call more than once: the email goes out the first time only.
 * Never throws, because a missing email must not fail a payment.
 */
export async function notifySessionPaid(sessionId: string) {
  if (!emailConfigured()) return;
  try {
    const admin = createSupabaseAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("amount_inr, method")
      .eq("session_id", sessionId)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();
    if (!payment) return;

    const details = await loadSessionEmailDetails(admin, sessionId);
    if (!details) return;
    if (!(await claimEmail(admin, sessionId, "booking_paid"))) return;

    const emails = buildBookingPaidEmails({
      ...details,
      amountInr: payment.amount_inr,
      method: payment.method === "upi_direct" ? "upi_direct" : "razorpay",
    });
    const sent = await Promise.all(emails.map(sendEmail));
    if (emails.length > 0 && !sent.some(Boolean)) await releaseEmail(admin, sessionId, "booking_paid");
  } catch (e) {
    console.error("notifySessionPaid failed", e);
  }
}
