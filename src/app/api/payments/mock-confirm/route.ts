import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * MOCKED Razorpay escrow confirmation.
 *
 * No real Razorpay API is called and no real money moves — Razorpay Route
 * (needed for the automatic 60/40 split to an expert's linked account)
 * requires RBI compliance approval this account does not yet have (deadline
 * was 2025-12-31). See supabase/migrations/0009_payments_phase2.sql.
 *
 * This route exists to exercise and demonstrate the full intended escrow
 * timeline (payment -> 60% booking release -> 40% completion release), and
 * to give a single, backend-only swap point for real Razorpay Orders +
 * Route Transfers once Route is approved — the schema and client code do
 * not need to change.
 *
 * Runs as a Route Handler (not client-side) because only admin/service-role
 * may write `payment_transfers` rows (see RLS in the migration above) —
 * modeling the real system, where only our backend ever triggers a transfer.
 */
export async function POST(request: NextRequest) {
  const { sessionId } = await request.json();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS restricts this to sessions the caller participates in.
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, client_id, amount_inr")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.client_id !== user.id) {
    return NextResponse.json(
      { error: "Only the client can pay for their own session" },
      { status: 403 }
    );
  }
  if (!session.amount_inr) {
    return NextResponse.json({ error: "Session has no amount set" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const now = Date.now();

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .upsert(
      {
        session_id: sessionId,
        method: "razorpay_mock",
        status: "paid",
        amount_inr: session.amount_inr,
        razorpay_order_id: `order_mock_${now}`,
        razorpay_payment_id: `pay_mock_${now}`,
      },
      { onConflict: "session_id" }
    )
    .select(
      "id, session_id, method, status, amount_inr, razorpay_order_id, razorpay_payment_id"
    )
    .single();

  if (paymentError || !payment) {
    return NextResponse.json(
      { error: paymentError?.message ?? "Failed to record payment" },
      { status: 500 }
    );
  }

  const bookingRelease = Math.round(session.amount_inr * 0.6);
  const completionRelease = session.amount_inr - bookingRelease;

  const { error: transferError } = await admin.from("payment_transfers").upsert(
    [
      {
        payment_id: payment.id,
        transfer_type: "booking_release",
        amount_inr: bookingRelease,
        status: "skipped_route_not_active",
      },
      {
        payment_id: payment.id,
        transfer_type: "completion_release",
        amount_inr: completionRelease,
        status: "skipped_route_not_active",
      },
    ],
    { onConflict: "payment_id,transfer_type" }
  );

  if (transferError) {
    return NextResponse.json({ error: transferError.message }, { status: 500 });
  }

  await admin.from("sessions").update({ payment_status: "escrow_held" }).eq("id", sessionId);

  return NextResponse.json({ payment });
}
