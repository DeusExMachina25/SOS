import "server-only";
import type { createSupabaseAdminClient } from "@/utils/supabase/admin";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
export type EmailKind = "booking_paid" | "session_reminder";

/**
 * Claims the right to send one kind of email about a session. Only the first
 * caller gets true; later callers find the row taken (see 0023_email_log.sql),
 * so racing triggers send one email, not two.
 */
export async function claimEmail(admin: Admin, sessionId: string, kind: EmailKind): Promise<boolean> {
  const { data, error } = await admin
    .from("email_log")
    .upsert({ session_id: sessionId, kind }, { onConflict: "session_id,kind", ignoreDuplicates: true })
    .select("session_id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** Hands a claim back when every send failed, so a later attempt can try again. */
export async function releaseEmail(admin: Admin, sessionId: string, kind: EmailKind) {
  const { error } = await admin.from("email_log").delete().eq("session_id", sessionId).eq("kind", kind);
  if (error) console.error("Could not release email claim", sessionId, kind, error.message);
}
