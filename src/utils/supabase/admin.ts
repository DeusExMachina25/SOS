import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Admin Supabase client using the service-role key. BYPASSES RLS.
 *
 * SERVER-ONLY. The `server-only` import above makes the build fail if this
 * is ever imported into client code. Use exclusively for privileged
 * operations (e.g. admin invite/approval flows, verified payment webhooks)
 * where RLS cannot express the rule — never as a shortcut around RLS.
 */
export function createSupabaseAdminClient() {
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
