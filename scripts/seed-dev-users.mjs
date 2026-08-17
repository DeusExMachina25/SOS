/**
 * Seeds dev/test accounts into Supabase using the service-role key.
 * Idempotent: re-running updates profiles/expert_profiles rather than erroring.
 *
 * Run:  node scripts/seed-dev-users.mjs
 *
 * Reads keys from .env.local. NEVER run against production with these creds —
 * the shared password below is for local development only.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const DEV_PASSWORD = "password"; // dev-only, matches legacy bypass muscle memory

const accounts = [
  { email: "admin@sos.com", full_name: "SOS Admin", role: "admin" },
  { email: "expert@sos.com", full_name: "Dr. Sarah Jenkins", role: "expert" },
  { email: "client@sos.com", full_name: "Client User", role: "client" },
];

async function findUserByEmail(email) {
  // listUsers is paginated; the dev project is tiny so page 1 suffices.
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data.users.find((u) => u.email === email) ?? null;
}

const ids = {};

for (const acc of accounts) {
  let user = await findUserByEmail(acc.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name },
    });
    if (error) throw new Error(`createUser ${acc.email}: ${error.message}`);
    user = data.user;
    console.log(`+ created auth user ${acc.email}`);
  } else {
    console.log(`= auth user ${acc.email} exists`);
  }
  ids[acc.role] = user.id;

  const { error: pErr } = await admin.from("profiles").upsert({
    id: user.id,
    email: acc.email,
    full_name: acc.full_name,
    role: acc.role,
  });
  if (pErr) throw new Error(`profiles ${acc.email}: ${pErr.message}`);
  console.log(`  profile upserted (${acc.role})`);
}

// Approved expert profile so the carousel + booking have real data.
const { error: eErr } = await admin.from("expert_profiles").upsert({
  profile_id: ids.expert,
  professional_title: "Lead Architectural Consultant",
  bio: "Twenty years shaping calm, light-filled homes and sustainable civic spaces across India.",
  location: "Bengaluru",
  timezone: "Asia/Kolkata",
  years_experience: 18,
  session_rate_inr: 5000,
  specialties: ["Residential", "Sustainable", "Interiors"],
  firm: "Jenkins Studio",
  coa_registration: "CA/2006/12345",
  credentials: "B.Arch, M.Arch (Urban Design)",
  languages: ["English", "Hindi", "Kannada"],
  status: "approved",
  invited_by: ids.admin,
});
if (eErr) throw new Error(`expert_profiles: ${eErr.message}`);
console.log("  expert_profiles upserted (approved)");

console.log("\nDev accounts ready (password: '" + DEV_PASSWORD + "'):");
for (const acc of accounts) console.log(`  ${acc.role.padEnd(6)} ${acc.email}`);
