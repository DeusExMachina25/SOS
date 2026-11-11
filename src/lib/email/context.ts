import "server-only";
import type { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { DEFAULT_EXPERT_TIMEZONE } from "@/lib/data/slots";
import type { SessionEmailDetails } from "./bookingEmails";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Everything an email about one session needs: who, when, on whose clock.
 * Null when the session is missing or has no time set.
 */
export async function loadSessionEmailDetails(admin: Admin, sessionId: string): Promise<SessionEmailDetails | null> {
  const { data: session } = await admin
    .from("sessions")
    .select("id, title, starts_at, ends_at, client_id, expert_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.starts_at || !session.ends_at) return null;

  const [client, expert, expertProfile] = await Promise.all([
    contact(admin, session.client_id),
    contact(admin, session.expert_id),
    admin.from("expert_profiles").select("timezone").eq("profile_id", session.expert_id).maybeSingle(),
  ]);

  return {
    sessionId: session.id,
    title: session.title,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    timezone: expertProfile.data?.timezone || DEFAULT_EXPERT_TIMEZONE,
    client: { name: client.name || "Your client", email: client.email },
    expert: { name: expert.name || "Your expert", email: expert.email },
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, ""),
  };
}

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
