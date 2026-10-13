/**
 * Populates the dev client/expert accounts with sample sessions, payments,
 * chat and vault rows so the dashboards have something to render.
 * Every session title starts with "[demo]"; re-running deletes and recreates
 * them, and `--clean` removes them without re-seeding.
 *
 * Run:  node scripts/seed-dev-users.mjs && node scripts/seed-demo-data.mjs
 *
 * Uses the service-role key from .env.local. Dev projects only.
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const must = (label, { error, data }) => {
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const idOf = async (email) => {
  const rows = must("profiles", await admin.from("profiles").select("id").eq("email", email));
  if (!rows.length) throw new Error(`${email} not found — run scripts/seed-dev-users.mjs first`);
  return rows[0].id;
};

const clientId = await idOf("client@sos.com");
const expertId = await idOf("expert@sos.com");

// Remove any previous demo rows (payments and vault files cascade from sessions).
must("clean", await admin.from("sessions").delete().like("title", "[demo]%"));
if (process.argv.includes("--clean")) {
  console.log("Demo sessions removed.");
  process.exit(0);
}

// Weekly availability, Mon-Fri 09:00-17:00, only if the expert has none.
const rules = must("rules", await admin.from("expert_availability").select("id").eq("expert_id", expertId));
if (!rules.length) {
  must(
    "availability",
    await admin.from("expert_availability").insert(
      [1, 2, 3, 4, 5].map((weekday) => ({ expert_id: expertId, weekday, start_time: "09:00", end_time: "17:00" }))
    )
  );
}

const RATE = 5000;
const at = (iso) => new Date(iso).toISOString();
const plusHour = (iso) => new Date(new Date(iso).getTime() + 3600_000).toISOString();

// status / payment: completed+paid, or future scheduled with the given payment state.
const sessions = [
  { title: "[demo] Site plan review", start: "2026-07-20T10:00:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Structural check-in", start: "2026-08-14T09:30:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Material selection", start: "2026-09-05T11:00:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Floor plan walkthrough", start: "2026-09-19T14:00:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Facade options", start: "2026-10-02T10:00:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Lighting strategy", start: "2026-10-06T12:00:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Budget review", start: "2026-10-09T09:30:00Z", status: "completed", pay: "paid" },
  { title: "[demo] Architecture Review", start: "2026-10-15T10:00:00Z", status: "scheduled", pay: "paid" },
  { title: "[demo] Permit strategy", start: "2026-10-17T11:00:00Z", status: "scheduled", pay: "none" },
  { title: "[demo] Landscape consult", start: "2026-10-20T14:00:00Z", status: "scheduled", pay: "upi" },
];

const created = [];
for (const s of sessions) {
  const [row] = must(
    s.title,
    await admin
      .from("sessions")
      .insert({
        client_id: clientId,
        expert_id: expertId,
        title: s.title,
        status: s.status,
        starts_at: at(s.start),
        ends_at: plusHour(s.start),
        amount_inr: RATE,
      })
      .select("id")
  );
  created.push({ ...s, id: row.id });
}

for (const s of created) {
  if (s.pay === "none") continue;
  const upi = s.pay === "upi";
  must(
    `payment ${s.title}`,
    await admin.from("payments").insert({
      session_id: s.id,
      method: upi ? "upi_direct" : "razorpay_mock",
      status: upi ? "processing" : "paid",
      amount_inr: RATE,
    })
  );
}

// Vault files (metadata rows only; no storage objects behind them).
const vaultFor = created.find((s) => s.title.includes("Architecture Review"));
must(
  "vault",
  await admin.from("vault_files").insert([
    { session_id: vaultFor.id, uploaded_by: clientId, name: "site-survey.pdf", storage_path: `demo/${vaultFor.id}/site-survey.pdf`, mime_type: "application/pdf", size_bytes: 2_400_000 },
    { session_id: vaultFor.id, uploaded_by: expertId, name: "markup-v1.png", storage_path: `demo/${vaultFor.id}/markup-v1.png`, mime_type: "image/png", size_bytes: 860_000 },
  ])
);

// Chat thread (unique per client/expert pair).
let thread = must("thread", await admin.from("chat_threads").select("id").eq("client_id", clientId).eq("expert_id", expertId))[0];
if (!thread) {
  thread = must("thread", await admin.from("chat_threads").insert({ client_id: clientId, expert_id: expertId }).select("id"))[0];
}
must("clear msgs", await admin.from("messages").delete().eq("thread_id", thread.id).like("body", "[demo]%"));
must(
  "messages",
  await admin.from("messages").insert([
    { thread_id: thread.id, sender_id: clientId, body: "[demo] Hi Sarah, I've uploaded the site survey ahead of Thursday.", created_at: at("2026-10-10T09:12:00Z") },
    { thread_id: thread.id, sender_id: expertId, body: "[demo] Thanks, got it. I'll mark up the south elevation before we meet.", created_at: at("2026-10-10T11:40:00Z") },
  ])
);

console.log(`Seeded ${created.length} sessions, payments, 2 vault files, 2 messages.`);
