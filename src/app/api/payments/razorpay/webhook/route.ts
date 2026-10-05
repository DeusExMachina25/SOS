import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { markOrderPaid, verifyWebhookSignature } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook: backstop for when the browser closes before /verify runs.
 * Configure in the Razorpay dashboard with events payment.captured, order.paid
 * and payment.failed; the secret goes in RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  const raw = await request.text();
  if (!secret || !signature || !verifyWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  const p = event.payload?.payment?.entity;
  if (!p?.order_id || !p.id) return NextResponse.json({ ok: true });

  try {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      await markOrderPaid(p.order_id, p.id);
    } else if (event.event === "payment.failed") {
      await createSupabaseAdminClient()
        .from("payments")
        .update({ status: "failed" })
        .eq("razorpay_order_id", p.order_id)
        .neq("status", "paid");
    }
  } catch (e) {
    console.error("webhook handling failed", e);
    return NextResponse.json({ error: "Retry" }, { status: 500 }); // Razorpay retries
  }
  return NextResponse.json({ ok: true });
}
