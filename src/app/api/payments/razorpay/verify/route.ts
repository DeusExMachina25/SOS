import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  markOrderPaid,
  razorpayKeys,
  verifyCheckoutSignature,
} from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

/** Verifies the Checkout callback signature and records the payment. */
export async function POST(request: NextRequest) {
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });

  const b = await request.json().catch(() => ({}));
  const {
    sessionId,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = b;
  if ([sessionId, orderId, paymentId, signature].some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: session } = await supabase
    .from("sessions")
    .select("id, client_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.client_id !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("razorpay_order_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!payment || payment.razorpay_order_id !== orderId) {
    return NextResponse.json({ error: "Order does not match this session" }, { status: 400 });
  }

  if (!verifyCheckoutSignature(orderId, paymentId, signature, keys.keySecret)) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  try {
    await markOrderPaid(orderId, paymentId);
  } catch (e) {
    console.error("markOrderPaid failed", e);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
