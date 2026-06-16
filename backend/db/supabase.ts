import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://placeholder-project.supabase.co";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "placeholder-anon-key";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_ANON_KEY")) {
  console.warn("⚠️  Missing Supabase environment variables! Using placeholder credentials for initialization.");
}

// Mock database builder for isolated unit tests
class MockQueryBuilder {
  constructor(private table: string) {}

  private getMockData() {
    if (this.table === "profiles") {
      return {
        id: "11111111-1111-1111-1111-111111111111",
        full_name: "John Client",
        email: "client@example.com",
        phone: "+1234567890",
        role: "client",
        created_at: new Date().toISOString()
      };
    }
    if (this.table === "sessions") {
      return {
        id: "44444444-4444-4444-4444-444444444444",
        client_id: "11111111-1111-1111-1111-111111111111",
        expert_id: "22222222-2222-2222-2222-222222222222",
        scheduled_at: new Date().toISOString(),
        duration_minutes: 60,
        status: "scheduled",
        created_at: new Date().toISOString()
      };
    }
    return null;
  }

  select() { return this; }
  eq() { return this; }
  order() { return this; }
  insert() { return this; }
  update() { return this; }
  single() {
    return Promise.resolve({ data: this.getMockData(), error: null });
  }
  then(onfulfilled: any) {
    const data = this.table === "profiles" || this.table === "sessions" 
      ? [this.getMockData()] 
      : [];
    return Promise.resolve({ data, error: null }).then(onfulfilled);
  }
}

const mockSupabaseClient = {
  from(table: string) {
    return new MockQueryBuilder(table);
  }
} as any;

// Client respects RLS
export const supabase = Deno.env.get("DENO_ENV") === "test"
  ? mockSupabaseClient
  : createClient(supabaseUrl, supabaseAnonKey);

// Client bypasses RLS
export const supabaseAdmin = Deno.env.get("DENO_ENV") === "test"
  ? mockSupabaseClient
  : (supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : supabase);
