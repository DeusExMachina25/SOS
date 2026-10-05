import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout callback signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
) {
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export async function createRazorpayOrder(args: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const keys = razorpayKeys();
  if (!keys) throw new Error("Razorpay is not configured");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: args.amountInr * 100, // paise
      currency: "INR",
      receipt: args.receipt.slice(0, 40),
      notes: args.notes ?? {},
    }),
  });
  if (!res.ok) {
    console.error("Razorpay order error", res.status, await res.text());
    throw new Error("Could not create payment order");
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}

/**
 * Idempotently records a verified payment: marks the payments row paid (a DB
 * trigger then moves sessions.payment_status to escrow_held) and schedules the
 * 60/40 payout rows for manual disbursement. Funds sit in the platform's
 * Razorpay balance until an admin pays the expert out.
 */
export async function markOrderPaid(orderId: string, paymentId: string) {
  const admin = createSupabaseAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .update({ status: "paid", razorpay_payment_id: paymentId })
    .eq("razorpay_order_id", orderId)
    .neq("status", "paid")
    .select("id, amount_inr")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return false; // unknown order, or already processed

  const booking = Math.round(payment.amount_inr * 0.6);
  const { error: tErr } = await admin.from("payment_transfers").upsert(
    [
      {
        payment_id: payment.id,
        transfer_type: "booking_release",
        amount_inr: booking,
        status: "pending",
      },
      {
        payment_id: payment.id,
        transfer_type: "completion_release",
        amount_inr: payment.amount_inr - booking,
        status: "pending",
      },
    ],
    { onConflict: "payment_id,transfer_type" }
  );
  if (tErr) throw new Error(tErr.message);
  return true;
}
