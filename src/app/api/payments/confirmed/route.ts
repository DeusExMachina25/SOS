import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { notifySessionPaid } from "@/lib/email/notifyBookingPaid";

export const dynamic = "force-dynamic";

/**
 * The expert's dashboard calls this right after they confirm a direct UPI
 * payment, so both sides get the booking confirmation email. The payment is
 * already recorded by then (the database only lets the session's expert
 * confirm it); this route only sends the email, and only once per session.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const sessionId = (body as { sessionId?: unknown }).sessionId;
  if (typeof sessionId !== "string" || sessionId.length > 64) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Row-level security returns a session only to its own client or expert.
  const { data: session } = await supabase
    .from("sessions")
    .select("id, client_id, expert_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || (session.expert_id !== user.id && session.client_id !== user.id)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // notifySessionPaid checks the payment is really paid before sending.
  after(() => notifySessionPaid(sessionId));
  return NextResponse.json({ ok: true });
}
