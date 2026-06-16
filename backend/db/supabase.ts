import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://placeholder-project.supabase.co";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "placeholder-anon-key";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_ANON_KEY")) {
  console.warn("⚠️  Missing Supabase environment variables! Using placeholder credentials for initialization.");
}

// Client respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client bypasses RLS
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
