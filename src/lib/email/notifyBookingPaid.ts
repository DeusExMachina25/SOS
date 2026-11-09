import "server-only";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { DEFAULT_EXPERT_TIMEZONE } from "@/lib/data/slots";
import { buildBookingPaidEmails } from "./bookingEmails";
import { emailConfigured, sendEmail } from "./send";

/**
 * Emails the client and the expert once a Razorpay payment is recorded.
 * Call it only when markOrderPaid reports a fresh payment, so a webhook and
 * the checkout callback racing each other send one email, not two.
 * Never throws: a missing email must not fail the payment.
 */
export async function notifyBookingPaid(orderId: string) {
  if (!emailConfigured()) return;
  try {
    const admin = createSupabaseAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("amount_inr, session_id")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    if (!payment) return;

    const { data: session } = await admin
      .from("sessions")
      .select("id, title, starts_at, ends_at, client_id, expert_id")
      .eq("id", payment.session_id)
      .maybeSingle();
    if (!session?.starts_at || !session.ends_at) return;

    const [client, expert, expertProfile] = await Promise.all([
      contact(admin, session.client_id),
      contact(admin, session.expert_id),
      admin.from("expert_profiles").select("timezone").eq("profile_id", session.expert_id).maybeSingle(),
    ]);

    const emails = buildBookingPaidEmails({
      sessionId: session.id,
      title: session.title,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      amountInr: payment.amount_inr,
      timezone: expertProfile.data?.timezone || DEFAULT_EXPERT_TIMEZONE,
      client: { name: client.name || "Your client", email: client.email },
      expert: { name: expert.name || "Your expert", email: expert.email },
      siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, ""),
    });
    await Promise.all(emails.map(sendEmail));
  } catch (e) {
    console.error("notifyBookingPaid failed", e);
  }
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Name and email for a profile; phone-only users may have no email. */
async function contact(admin: Admin, profileId: string | null) {
  if (!profileId) return { name: null, email: null };
  const { data } = await admin.from("profiles").select("full_name, email").eq("id", profileId).maybeSingle();
  let email: string | null = data?.email ?? null;
  if (!email) {
    const { data: u } = await admin.auth.admin.getUserById(profileId);
    email = u?.user?.email ?? null;
  }
  return { name: (data?.full_name as string | null) ?? null, email };
}
