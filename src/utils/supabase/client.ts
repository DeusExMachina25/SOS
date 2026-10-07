import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the new publishable key; fall back to the legacy anon key for compatibility.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client (cookie-based session via @supabase/ssr).
 * Safe to import in Client Components. Uses the publishable key only.
 */
export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or publishable key. Check .env.local."
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}

/**
 * Shared browser client instance. `null` only when env keys are absent, so
 * existing dev-bypass checks (`!supabase`) still behave during early setup.
 */
export const supabase =
  supabaseUrl && supabaseKey ? createBrowserClient(supabaseUrl, supabaseKey) : null;
