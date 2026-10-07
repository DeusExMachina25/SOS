import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createRazorpayOrder, razorpayKeys } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

/** Creates (or reuses) a Razorpay order for the caller's own unpaid session. */
export async function POST(request: NextRequest) {
  const keys = razorpayKeys();
  if (!keys) {
    return NextResponse.json(
      { error: "Online payments are not available right now" },
      { status: 503 }
    );
  }

  const { sessionId } = await request.json().catch(() => ({}));
  if (typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: session } = await supabase
    .from("sessions")
    .select("id, client_id, amount_inr, payment_status, status")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.client_id !== user.id) {
    return NextResponse.json(
      { error: "Only the client can pay for this session" },
      { status: 403 }
    );
  }
  if (session.status === "cancelled") {
    return NextResponse.json({ error: "This session was cancelled" }, { status: 409 });
  }
  if (session.payment_status !== "unpaid") {
    return NextResponse.json({ error: "This session is already paid" }, { status: 409 });
  }
  if (!session.amount_inr || session.amount_inr <= 0) {
    return NextResponse.json({ error: "Session has no price set" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("payments")
    .select("status, method, razorpay_order_id, amount_inr")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing?.status === "paid") {
    return NextResponse.json({ error: "This session is already paid" }, { status: 409 });
  }

  let orderId =
    existing?.method === "razorpay" && existing.amount_inr === session.amount_inr
      ? existing.razorpay_order_id
      : null;
  if (!orderId) {
    const order = await createRazorpayOrder({
      amountInr: session.amount_inr,
      receipt: `sos_${sessionId.replace(/-/g, "")}`,
      notes: { session_id: sessionId },
    }).catch(() => null);
    if (!order) {
      return NextResponse.json({ error: "Could not start payment" }, { status: 502 });
    }
    orderId = order.id;
    const { error } = await admin.from("payments").upsert(
      {
        session_id: sessionId,
        method: "razorpay",
        status: "created",
        amount_inr: session.amount_inr,
        razorpay_order_id: orderId,
        razorpay_payment_id: null,
      },
      { onConflict: "session_id" }
    );
    if (error) {
      return NextResponse.json({ error: "Could not start payment" }, { status: 500 });
    }
  }

  return NextResponse.json({
    keyId: keys.keyId,
    orderId,
    amount: session.amount_inr * 100,
    currency: "INR",
    email: user.email ?? null,
  });
}
