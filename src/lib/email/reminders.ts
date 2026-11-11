import "server-only";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { buildReminderEmails } from "./bookingEmails";
import { claimEmail, releaseEmail } from "./claim";
import { loadSessionEmailDetails } from "./context";
import { sendEmail } from "./send";

/**
 * How far ahead the daily job looks. It runs once a day and the host may start
 * it anywhere within its hour, so the window is a little over a day; the
 * email log still lets each reminder go out once.
 */
export const REMINDER_WINDOW_HOURS = 26;

/** Resend accepts about two requests a second by default. */
const DEFAULT_GAP_MS = 600;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends one reminder to the client and one to the expert for every paid,
 * scheduled session starting within the window. Returns how many sessions
 * were due and how many emails went out.
 */
export async function sendSessionReminders({ now = new Date(), gapMs = DEFAULT_GAP_MS } = {}) {
  const admin = createSupabaseAdminClient();
  const until = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3_600_000);
  const { data: due, error } = await admin
    .from("sessions")
    .select("id")
    .eq("status", "scheduled")
    .in("payment_status", ["escrow_held", "released"])
    .gt("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);

  let sent = 0;
  for (const { id } of due ?? []) {
    try {
      const details = await loadSessionEmailDetails(admin, id);
      if (!details) continue;
      if (!(await claimEmail(admin, id, "session_reminder"))) continue;

      const emails = buildReminderEmails(details);
      let ok = 0;
      for (const email of emails) {
        if (await sendEmail(email)) ok++;
        if (gapMs > 0) await pause(gapMs);
      }
      if (emails.length > 0 && ok === 0) await releaseEmail(admin, id, "session_reminder");
      sent += ok;
    } catch (e) {
      console.error("Reminder failed for session", id, e);
    }
  }
  return { due: due?.length ?? 0, sent };
}
