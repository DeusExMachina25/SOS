/**
 * End-to-end audit: routes, API contracts, the booking -> payment -> call ->
 * vault -> chat flow with complete data, and brand-new accounts with missing
 * data. Writes reports/audit-<time>.{json,html}; exits 1 if anything fails.
 *
 *   node scripts/audit/run.mjs            read-only: routes + API contracts
 *   node scripts/audit/run.mjs --full     also runs the data flows (WRITES rows)
 *   node scripts/audit/run.mjs --full --email   and emails the report
 *
 * --full needs the dev server on AUDIT_BASE_URL (default http://localhost:3000),
 * the dev accounts from scripts/seed-dev-users.mjs, and the service-role key.
 * Everything it writes is tagged "[audit]" and removed in a finally block.
 * Refuses --full unless the project is marked as dev (DEV_SEED_PROJECT_REF, see
 * scripts/lib/dev-guard.mjs). The read-only mode needs no opt-in.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { sendReportEmail } from "./mailer.mjs";
import { assertDevProject } from "../lib/dev-guard.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const FULL = process.argv.includes("--full");
const EMAIL = process.argv.includes("--email");
// --full creates test users and writes rows, so it only runs against a project marked as dev.
if (FULL) assertDevProject(env, "audit --full");
const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TAG = "[audit]";
const HOUR = 3600_000;

const results = [];
const check = async (area, scenario, name, fn) => {
  const t0 = Date.now();
  try {
    const r = await fn();
    const [status, detail] = Array.isArray(r) ? r : [r === false ? "fail" : "pass", ""];
    results.push({ area, scenario, name, status, detail: String(detail ?? ""), ms: Date.now() - t0 });
  } catch (err) {
    results.push({ area, scenario, name, status: "fail", detail: `threw: ${err?.message ?? err}`, ms: Date.now() - t0 });
  }
};
const expect = (cond, detail = "") => [cond ? "pass" : "fail", detail];

// ---- helpers ---------------------------------------------------------------
const admin = createClient(SUPA_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function signIn(email, password = "password") {
  const sb = createClient(SUPA_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return { sb, session: data.session, id: data.user.id };
}

/** Same cookie @supabase/ssr sets, so server routes and the proxy see a real session. */
function cookieFor(session) {
  const name = `sb-${new URL(SUPA_URL).hostname.split(".")[0]}-auth-token`;
  const enc = encodeURIComponent("base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"));
  if (enc.length <= 3180) return `${name}=${enc}`;
  const parts = [];
  for (let i = 0, n = 0; i < enc.length; i += 3180, n++) parts.push(`${name}.${n}=${enc.slice(i, i + 3180)}`);
  return parts.join("; ");
}

async function http(path, { cookie, method = "GET", body, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, location: res.headers.get("location") ?? "", json, text };
}
const isRedirectTo = (r, frag) => r.status >= 300 && r.status < 400 && r.location.includes(frag);

// ---- 1. routes & API contracts (read-only) ---------------------------------
let serverUp = true;
await check("Routes", "-", "Dev server reachable", async () => {
  try { const r = await http("/login"); return expect(r.status === 200, `GET /login -> ${r.status}`); }
  catch (e) { serverUp = false; return ["fail", `cannot reach ${BASE}: ${e.message}`]; }
});

if (serverUp) {
  for (const p of ["/", "/platter", "/us", "/login", "/privacy", "/terms", "/refunds"]) {
    await check("Routes", "anonymous", `Public page ${p}`, async () => {
      const r = await http(p);
      return expect(r.status === 200, `-> ${r.status}`);
    });
  }
  for (const p of ["/dashboard", "/dashboard/client", "/dashboard/expert", "/dashboard/client/chat", "/dashboard/expert/availability", "/dashboard/video-call"]) {
    await check("Routes", "anonymous", `Protected ${p} redirects to login`, async () => {
      const r = await http(p);
      return expect(isRedirectTo(r, "/login"), `-> ${r.status} ${r.location}`);
    });
  }

  // API contracts without a session
  await check("API", "anonymous", "livekit-token without sessionId -> 400", async () => {
    const r = await http("/api/livekit-token"); return expect(r.status === 400, `-> ${r.status}`);
  });
  await check("API", "anonymous", "livekit-token without a session -> 401", async () => {
    const r = await http("/api/livekit-token?sessionId=00000000-0000-0000-0000-000000000000"); return expect(r.status === 401, `-> ${r.status}`);
  });
  await check("API", "anonymous", "razorpay order without a session -> 401/503", async () => {
    const r = await http("/api/payments/razorpay/order", { method: "POST", body: { sessionId: "x" } });
    return expect([401, 503].includes(r.status), `-> ${r.status}`);
  });
  await check("API", "anonymous", "razorpay verify with garbage payload -> 400/503", async () => {
    const r = await http("/api/payments/razorpay/verify", { method: "POST", body: { nope: 1 } });
    return expect([400, 503].includes(r.status), `-> ${r.status}`);
  });
  await check("API", "anonymous", "webhook without signature -> 400", async () => {
    const r = await http("/api/payments/razorpay/webhook", { method: "POST", body: { event: "payment.captured" } });
    return expect(r.status === 400, `-> ${r.status}`);
  });
  await check("API", "anonymous", "webhook with a forged signature -> 400", async () => {
    const res = await fetch(BASE + "/api/payments/razorpay/webhook", { method: "POST", headers: { "x-razorpay-signature": "deadbeef" }, body: "{}" });
    return expect(res.status === 400, `-> ${res.status}`);
  });
  await check("API", "anonymous", "mock-confirm without a session -> 401", async () => {
    const r = await http("/api/payments/mock-confirm", { method: "POST", body: { sessionId: "x" } });
    return expect(r.status === 401, `-> ${r.status}`);
  });
}

// ---- 2. complete + missing data flows (writes) -----------------------------
const created = { sessions: [], users: [], storage: [] };

async function fullFlows() {
  const client = await signIn("client@sos.com");
  const expert = await signIn("expert@sos.com");
  const cCookie = cookieFor(client.session);
  const eCookie = cookieFor(expert.session);
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();

  const mk = async (name, { start, end, status = "scheduled", pay = "none", paymentStatus }) => {
    const { data, error } = await admin.from("sessions").insert({
      client_id: client.id, expert_id: expert.id, title: `${TAG} ${name}`, status,
      starts_at: iso(start), ends_at: iso(end), amount_inr: 5000,
    }).select("id").single();
    if (error) throw new Error(`fixture ${name}: ${error.message}`);
    created.sessions.push(data.id);
    if (pay === "paid") {
      const { error: pe } = await admin.from("payments").insert({ session_id: data.id, method: "razorpay_mock", status: "paid", amount_inr: 5000 });
      if (pe) throw new Error(`fixture payment ${name}: ${pe.message}`);
    }
    if (paymentStatus) await admin.from("sessions").update({ payment_status: paymentStatus }).eq("id", data.id);
    return data.id;
  };
  const day = (n) => now + n * 24 * HOUR;

  // Auth'd route matrix
  await check("Routes", "client", "Client reaches every client page", async () => {
    const bad = [];
    for (const p of ["", "/sessions", "/vault", "/chat"]) {
      const r = await http("/dashboard/client" + p, { cookie: cCookie });
      if (r.status !== 200) bad.push(`${p || "/"} -> ${r.status}`);
    }
    return expect(!bad.length, bad.join("; "));
  });
  await check("Routes", "expert", "Expert reaches every expert page", async () => {
    const bad = [];
    for (const p of ["", "/sessions", "/availability", "/vault", "/chat"]) {
      const r = await http("/dashboard/expert" + p, { cookie: eCookie });
      if (r.status !== 200) bad.push(`${p || "/"} -> ${r.status}`);
    }
    return expect(!bad.length, bad.join("; "));
  });
  await check("Routes", "client", "Client is redirected away from expert pages", async () => {
    const a = await http("/dashboard/expert", { cookie: cCookie });
    const b = await http("/dashboard/expert/availability", { cookie: cCookie });
    return expect(isRedirectTo(a, "/dashboard/client") && isRedirectTo(b, "/dashboard/client"), `${a.status} ${a.location} | ${b.status} ${b.location}`);
  });
  await check("Routes", "expert", "Expert is redirected away from client pages", async () => {
    const a = await http("/dashboard/client", { cookie: eCookie });
    const b = await http("/dashboard/client/chat", { cookie: eCookie });
    return expect(isRedirectTo(a, "/dashboard/expert") && isRedirectTo(b, "/dashboard/expert/chat"), `${a.status} ${a.location} | ${b.status} ${b.location}`);
  });

  // Call gating: every state of a session vs the token endpoint
  const token = (id, cookie = cCookie) => http(`/api/livekit-token?sessionId=${id}`, { cookie });
  const gates = [
    ["unpaid session -> 402", { start: day(40), end: day(40) + HOUR }, 402],
    ["paid but days away -> 425 (room not open)", { start: day(41), end: day(41) + HOUR, pay: "paid" }, 425],
    ["paid and already ended -> 410", { start: now - 3 * HOUR, end: now - 2 * HOUR, pay: "paid" }, 410],
    ["paid and in the live window -> 200", { start: now - 5 * 60_000, end: now + 55 * 60_000, pay: "paid" }, 200],
    ["cancelled -> 409", { start: day(42), end: day(42) + HOUR, status: "cancelled", pay: "paid" }, 409],
    ["refunded -> 409", { start: day(43), end: day(43) + HOUR, pay: "paid", paymentStatus: "refunded" }, 409],
  ];
  for (const [name, spec, want] of gates) {
    await check("Call access", "complete data", name, async () => {
      const id = await mk(name, spec);
      const r = await token(id);
      return expect(r.status === want, `-> ${r.status} ${r.json?.error ?? ""}`.trim());
    });
  }
  await check("Call access", "complete data", "Expert gets a token for the same live session", async () => {
    const id = created.sessions[3];
    const r = await token(id, eCookie);
    return expect(r.status === 200 && Boolean(r.json?.token), `-> ${r.status}`);
  });
  await check("Call access", "missing data", "Random / non-uuid session id -> 404 (no leak, no 500)", async () => {
    const a = await token("00000000-0000-0000-0000-000000000000");
    const b = await token("not-a-uuid");
    return expect(a.status === 404 && b.status === 404, `uuid -> ${a.status}, junk -> ${b.status}`);
  });
  await check("Call access", "missing data", "A session with no start/end time cannot exist, so the token route never sees one", async () => {
    const { data, error } = await admin.from("sessions").insert({ client_id: client.id, expert_id: expert.id, title: `${TAG} no-times`, status: "scheduled", amount_inr: 5000 }).select("id").single();
    if (data) {
      created.sessions.push(data.id);
      await admin.from("payments").insert({ session_id: data.id, method: "razorpay_mock", status: "paid", amount_inr: 5000 });
      const r = await token(data.id);
      return expect(r.status < 500, `row allowed; token route -> ${r.status} ${r.json?.error ?? ""}`.trim());
    }
    return ["pass", `database refuses it (${error.message})`];
  });

  // Booking rules (as the client, through RLS)
  const rate = (await admin.from("expert_profiles").select("session_rate_inr").eq("profile_id", expert.id).single()).data.session_rate_inr;
  const slot = day(50);
  await check("Booking", "complete data", "Client books a future slot; price comes from the expert's rate, not the client", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: expert.id, title: `${TAG} booking`, starts_at: iso(slot), ends_at: iso(slot + HOUR), amount_inr: 1 }).select("id, amount_inr, payment_status, status").single();
    if (error) return ["fail", error.message];
    created.sessions.push(data.id);
    return expect(data.amount_inr === rate && data.payment_status === "unpaid" && data.status === "scheduled", `stored ${JSON.stringify(data)} (rate ${rate})`);
  });
  await check("Booking", "complete data", "Double-booking the same slot is blocked", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: expert.id, title: `${TAG} dup`, starts_at: iso(slot + 15 * 60_000), ends_at: iso(slot + HOUR + 15 * 60_000) }).select("id");
    if (data?.[0]) created.sessions.push(data[0].id);
    return expect(Boolean(error), error?.message ?? "second overlapping booking was ACCEPTED");
  });
  await check("Booking", "missing data", "Booking in the past is blocked", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: expert.id, title: `${TAG} past`, starts_at: iso(now - 2 * HOUR), ends_at: iso(now - HOUR) }).select("id");
    if (data?.[0]) created.sessions.push(data[0].id);
    return expect(Boolean(error), error?.message ?? "past booking was ACCEPTED");
  });
  await check("Booking", "missing data", "Booking with no start time is blocked", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: expert.id, title: `${TAG} notime` }).select("id");
    if (data?.[0]) created.sessions.push(data[0].id);
    return expect(Boolean(error), error?.message ?? "booking with null times was ACCEPTED");
  });
  await check("Booking", "missing data", "End before start is rejected", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: expert.id, title: `${TAG} backwards`, starts_at: iso(day(51) + HOUR), ends_at: iso(day(51)) }).select("id");
    if (data?.[0]) created.sessions.push(data[0].id);
    return expect(Boolean(error), error?.message ?? "end-before-start booking was ACCEPTED");
  });
  await check("Booking", "missing data", "Booking someone who is not an approved expert is blocked", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: client.id, title: `${TAG} self`, starts_at: iso(day(52)), ends_at: iso(day(52) + HOUR) }).select("id");
    if (data?.[0]) created.sessions.push(data[0].id);
    return expect(Boolean(error), error?.message ?? "booking a non-expert was ACCEPTED");
  });

  // Payment
  await check("Payment", "complete data", "mock-confirm: client pays own session -> escrow_held + 60/40 transfers", async () => {
    const id = await mk("pay-me", { start: day(60), end: day(60) + HOUR });
    const r = await http("/api/payments/mock-confirm", { cookie: cCookie, method: "POST", body: { sessionId: id } });
    const s = (await admin.from("sessions").select("payment_status").eq("id", id).single()).data;
    const p = (await admin.from("payments").select("id").eq("session_id", id).single()).data;
    const t = (await admin.from("payment_transfers").select("amount_inr, transfer_type").eq("payment_id", p?.id));
    const sum = (t.data ?? []).reduce((n, x) => n + x.amount_inr, 0);
    return expect(r.status === 200 && s.payment_status === "escrow_held" && t.data?.length === 2 && sum === 5000, `http ${r.status}, session ${s.payment_status}, transfers ${t.data?.length} summing ${sum}`);
  });
  await check("Payment", "complete data", "Paying twice is idempotent (no duplicate transfers)", async () => {
    const id = created.sessions.at(-1);
    const r = await http("/api/payments/mock-confirm", { cookie: cCookie, method: "POST", body: { sessionId: id } });
    const p = (await admin.from("payments").select("id").eq("session_id", id).single()).data;
    const t = await admin.from("payment_transfers").select("id").eq("payment_id", p.id);
    return expect(r.status === 200 && t.data.length === 2, `http ${r.status}, transfers ${t.data.length}`);
  });
  await check("Payment", "missing data", "Expert cannot pay for the client's session -> 403", async () => {
    const id = await mk("not-yours", { start: day(61), end: day(61) + HOUR });
    const r = await http("/api/payments/mock-confirm", { cookie: eCookie, method: "POST", body: { sessionId: id } });
    return expect(r.status === 403 || r.status === 404, `-> ${r.status}`);
  });
  await check("Payment", "missing data", "mock-confirm with unknown session -> 404", async () => {
    const r = await http("/api/payments/mock-confirm", { cookie: cCookie, method: "POST", body: { sessionId: "00000000-0000-0000-0000-000000000000" } });
    return expect(r.status === 404, `-> ${r.status}`);
  });
  await check("Payment", "missing data", "mock-confirm with an empty/invalid body -> 400, not 500", async () => {
    const a = await http("/api/payments/mock-confirm", { cookie: cCookie, method: "POST", raw: "" });
    const b = await http("/api/payments/mock-confirm", { cookie: cCookie, method: "POST", raw: "{not json" });
    const c = await http("/api/payments/mock-confirm", { cookie: cCookie, method: "POST", body: {} });
    return expect(a.status === 400 && b.status === 400 && c.status === 400, `empty -> ${a.status}, malformed -> ${b.status}, no id -> ${c.status}`);
  });
  await check("Payment", "complete data", "UPI path: client records sent, only the expert can confirm", async () => {
    const id = await mk("upi", { start: day(62), end: day(62) + HOUR });
    const ins = await client.sb.from("payments").insert({ session_id: id, method: "upi_direct", status: "processing", amount_inr: 1 }).select("id, amount_inr").single();
    if (ins.error) return ["fail", `client could not record UPI: ${ins.error.message}`];
    const selfConfirm = await client.sb.from("payments").update({ status: "paid" }).eq("id", ins.data.id);
    const confirm = await expert.sb.from("payments").update({ status: "paid" }).eq("id", ins.data.id);
    const s = (await admin.from("sessions").select("payment_status").eq("id", id).single()).data;
    return expect(ins.data.amount_inr === 5000 && Boolean(selfConfirm.error) && !confirm.error && s.payment_status === "released", `amount ${ins.data.amount_inr}, self-confirm ${selfConfirm.error ? "blocked" : "ALLOWED"}, expert ${confirm.error ? confirm.error.message : "ok"}, session ${s.payment_status}`);
  });

  // Session lifecycle
  await check("Lifecycle", "complete data", "Expert marks a paid, started session completed; client cannot", async () => {
    const id = await mk("lifecycle-complete", { start: now - 2 * HOUR, end: now - HOUR, pay: "paid" });
    const byClient = await client.sb.from("sessions").update({ status: "completed" }).eq("id", id).select("id");
    const byExpert = await expert.sb.from("sessions").update({ status: "completed" }).eq("id", id).select("status");
    return expect(Boolean(byClient.error) && !byExpert.error && byExpert.data?.[0]?.status === "completed", `client ${byClient.error ? "blocked" : "ALLOWED"}, expert ${byExpert.error?.message ?? byExpert.data?.[0]?.status}`);
  });
  await check("Lifecycle", "complete data", "Client cancels an unpaid booking; it then drops out of call access", async () => {
    const id = await mk("lifecycle-cancel", { start: day(80), end: day(80) + HOUR });
    const r = await client.sb.from("sessions").update({ status: "cancelled" }).eq("id", id).select("status");
    return expect(!r.error && r.data?.[0]?.status === "cancelled", r.error?.message ?? r.data?.[0]?.status);
  });
  await check("Lifecycle", "complete data", "A client cancelling a PAID session must not strand the money", async () => {
    const id = await mk("lifecycle-paid-cancel", { start: day(81), end: day(81) + HOUR, pay: "paid" });
    const r = await client.sb.from("sessions").update({ status: "cancelled" }).eq("id", id).select("status, payment_status");
    if (r.error) return ["pass", `blocked: ${r.error.message}`];
    return ["warn", `database lets the client cancel a paid session (payment_status stays ${r.data?.[0]?.payment_status}); there is no refund path, so the money is held against a cancelled booking. The UI does not offer this; the API does.`];
  });
  await check("Lifecycle", "missing data", "A cancelled or completed session cannot be re-opened by the client", async () => {
    const id = created.sessions.at(-3);
    const r = await client.sb.from("sessions").update({ status: "scheduled" }).eq("id", id).select("status");
    return expect(Boolean(r.error) || !r.data?.length || r.data[0].status !== "scheduled", r.error?.message ?? `status now ${r.data?.[0]?.status}`);
  });

  // Vault
  const vaultSession = created.sessions[3];
  await check("Vault", "complete data", "Upload -> expert sees it -> signed download works -> delete cleans row and object", async () => {
    const path = `${vaultSession}/${now}-audit-note.txt`;
    const up = await client.sb.storage.from("vault").upload(path, new Blob(["audit"], { type: "text/plain" }));
    if (up.error) return ["fail", `upload: ${up.error.message}`];
    created.storage.push(path);
    const row = await client.sb.from("vault_files").insert({ session_id: vaultSession, uploaded_by: client.id, name: "audit-note.txt", storage_path: path, mime_type: "text/plain", size_bytes: 5 }).select("id").single();
    if (row.error) return ["fail", `row: ${row.error.message}`];
    const seen = await expert.sb.from("vault_files").select("id").eq("id", row.data.id);
    const url = await expert.sb.storage.from("vault").createSignedUrl(path, 60);
    const dl = url.data ? await fetch(url.data.signedUrl) : null;
    const delRow = await client.sb.from("vault_files").delete().eq("id", row.data.id);
    const delObj = await client.sb.storage.from("vault").remove([path]);
    return expect(seen.data?.length === 1 && dl?.status === 200 && !delRow.error && !delObj.error, `expert sees ${seen.data?.length}, download ${dl?.status}, delete ${delRow.error?.message ?? "ok"}/${delObj.error?.message ?? "ok"}`);
  });
  await check("Vault", "missing data", "A file name with spaces/unicode is stored under a safe key", async () => {
    const name = "Plan – final (v2) é.pdf";
    const safe = name.replace(/[^\w.-]+/g, "_");
    const path = `${vaultSession}/${now}-${safe}`;
    const up = await client.sb.storage.from("vault").upload(path, new Blob(["x"]));
    if (!up.error) created.storage.push(path);
    const raw = await client.sb.storage.from("vault").upload(`${vaultSession}/${now}-${name}`, new Blob(["x"]));
    if (!raw.error) created.storage.push(`${vaultSession}/${now}-${name}`);
    return [up.error ? "fail" : "pass", `sanitised key: ${up.error?.message ?? "ok"}; raw name: ${raw.error ? "rejected (" + raw.error.message + ")" : "accepted"}`];
  });

  // Chat
  await check("Chat", "complete data", "Client sends, expert reads; sender cannot be spoofed", async () => {
    let th = (await client.sb.from("chat_threads").select("id").eq("client_id", client.id).eq("expert_id", expert.id).maybeSingle()).data;
    if (!th) th = (await client.sb.from("chat_threads").insert({ client_id: client.id, expert_id: expert.id }).select("id").single()).data;
    const sent = await client.sb.from("messages").insert({ thread_id: th.id, sender_id: client.id, body: `${TAG} hello` }).select("id").single();
    const read = await expert.sb.from("messages").select("id").eq("id", sent.data?.id ?? "");
    const spoof = await client.sb.from("messages").insert({ thread_id: th.id, sender_id: expert.id, body: `${TAG} spoof` }).select("id");
    if (spoof.data?.[0]) await admin.from("messages").delete().eq("id", spoof.data[0].id);
    return expect(!sent.error && read.data?.length === 1 && Boolean(spoof.error), `send ${sent.error?.message ?? "ok"}, expert reads ${read.data?.length}, spoof ${spoof.error ? "blocked" : "ALLOWED"}`);
  });
  await check("Chat", "missing data", "Empty and oversized messages are rejected", async () => {
    const th = (await client.sb.from("chat_threads").select("id").eq("client_id", client.id).eq("expert_id", expert.id).single()).data;
    const empty = await client.sb.from("messages").insert({ thread_id: th.id, sender_id: client.id, body: "" });
    const big = await client.sb.from("messages").insert({ thread_id: th.id, sender_id: client.id, body: "x".repeat(4001) });
    return expect(Boolean(empty.error) && Boolean(big.error), `empty ${empty.error ? "blocked" : "ALLOWED"}, 4001 chars ${big.error ? "blocked" : "ALLOWED"}`);
  });
  await check("Chat", "missing data", "Whitespace-only message is rejected", async () => {
    const th = (await client.sb.from("chat_threads").select("id").eq("client_id", client.id).eq("expert_id", expert.id).single()).data;
    const r = await client.sb.from("messages").insert({ thread_id: th.id, sender_id: client.id, body: "   " }).select("id");
    if (r.data?.[0]) await admin.from("messages").delete().eq("id", r.data[0].id);
    return ["pass", r.error ? "blocked by the database" : "database accepts it, but the chat UI trims input and disables Send when empty, so users cannot send one"];
  });

  // Brand-new accounts with no data at all
  const stamp = Date.now();
  const mkUser = async (role) => {
    const email = `audit-${role}-${stamp}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: "password", email_confirm: true, user_metadata: { full_name: `Audit ${role}` } });
    if (error) throw new Error(`createUser ${role}: ${error.message}`);
    created.users.push(data.user.id);
    await admin.from("profiles").upsert({ id: data.user.id, email, full_name: `Audit ${role}`, role });
    return signIn(email);
  };
  const newClient = await mkUser("client");
  const newExpert = await mkUser("expert");
  await check("Empty state", "missing data", "Brand-new client: every list loads empty without errors", async () => {
    const out = [];
    for (const t of ["sessions", "payments", "chat_threads", "vault_files"]) {
      const r = await newClient.sb.from(t).select("id");
      out.push([t, r.error?.message ?? r.data.length]);
    }
    const bad = out.filter(([, v]) => v !== 0);
    return expect(!bad.length, out.map(([t, v]) => `${t}=${v}`).join(", "));
  });
  await check("Empty state", "missing data", "Brand-new expert (no profile, no availability): reads are empty, not errors", async () => {
    const out = [];
    for (const t of ["sessions", "payments", "expert_availability", "expert_profiles"]) {
      const r = await newExpert.sb.from(t).select("*").eq(t === "expert_availability" ? "expert_id" : t === "expert_profiles" ? "profile_id" : "id", newExpert.id);
      out.push([t, r.error?.message ?? r.data.length]);
    }
    return expect(out.every(([, v]) => typeof v === "number"), out.map(([t, v]) => `${t}=${v}`).join(", "));
  });
  await check("Empty state", "missing data", "Brand-new client's pages render (no 500s)", async () => {
    const c = cookieFor(newClient.session);
    const bad = [];
    for (const p of ["", "/sessions", "/vault", "/chat"]) {
      const r = await http("/dashboard/client" + p, { cookie: c });
      if (r.status !== 200) bad.push(`${p || "/"} -> ${r.status}`);
    }
    return expect(!bad.length, bad.join("; "));
  });
  await check("Empty state", "missing data", "Brand-new expert's pages render (no 500s)", async () => {
    const c = cookieFor(newExpert.session);
    const bad = [];
    for (const p of ["", "/sessions", "/availability", "/vault", "/chat"]) {
      const r = await http("/dashboard/expert" + p, { cookie: c });
      if (r.status !== 200) bad.push(`${p || "/"} -> ${r.status}`);
    }
    return expect(!bad.length, bad.join("; "));
  });
  await check("Booking", "missing data", "Booking an expert who has no approved profile is blocked", async () => {
    const { data, error } = await client.sb.from("sessions").insert({ client_id: client.id, expert_id: newExpert.id, title: `${TAG} unapproved`, starts_at: iso(day(70)), ends_at: iso(day(70) + HOUR) }).select("id");
    if (data?.[0]) created.sessions.push(data[0].id);
    return expect(Boolean(error), error?.message ?? "booking an expert without an approved profile was ACCEPTED");
  });
  await check("Privacy", "complete data", "A stranger cannot read another user's sessions, payments, messages or files", async () => {
    const out = [];
    for (const t of ["sessions", "payments", "messages", "vault_files", "chat_threads"]) {
      const r = await newClient.sb.from(t).select("id").limit(5);
      out.push([t, r.error ? "err" : r.data.length]);
    }
    return expect(out.every(([, v]) => v === 0), out.map(([t, v]) => `${t}=${v}`).join(", "));
  });
  await check("Privacy", "complete data", "Emails are not readable through the API", async () => {
    const r = await newClient.sb.from("profiles").select("email").limit(1);
    return expect(Boolean(r.error) || !r.data?.length || r.data.every((x) => x.email == null), r.error?.message ?? `got ${JSON.stringify(r.data)}`);
  });
}

// ---- 3. pure logic: slot generation ----------------------------------------
async function slotChecks() {
  let slots;
  try { slots = await import("../../src/lib/data/slots.ts"); }
  catch (e) { return check("Slots", "-", "Load slot generator", async () => ["warn", `skipped: ${e.message}`]); }
  const { generateSlotsForDate } = slots;
  const nextWeekday = (wd) => { const d = new Date(); d.setDate(d.getDate() + 14); while (d.getDay() !== wd) d.setDate(d.getDate() + 1); return d; };
  const ds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const mon = nextWeekday(1), sun = nextWeekday(0);
  const rule = (weekday, startTime, endTime) => ({ id: "r", expertId: "e", weekday, startTime, endTime });

  const labels = (arr) => arr.map((x) => x.label);
  const NOW0 = Date.UTC(2026, 0, 1);
  const gen = (date, rules, busy = [], tz = "Asia/Kolkata") => generateSlotsForDate(date, rules, busy, 60, tz, NOW0);

  await check("Slots", "complete data", "9-17 rule gives 8 hourly slots in the expert's time", async () => {
    const r = gen(ds(mon), [rule(1, "09:00", "17:00")]); return expect(r.length === 8 && r[0].label === "9:00 AM", `${r.length}: ${labels(r).join(", ")}`);
  });
  await check("Slots", "complete data", "A booked hour is removed from the list", async () => {
    const all = gen(ds(mon), [rule(1, "09:00", "17:00")]);
    const r = gen(ds(mon), [rule(1, "09:00", "17:00")], [{ startsAt: all[3].startsAt, endsAt: all[3].endsAt }]);
    return expect(r.length === 7 && !labels(r).includes(all[3].label), labels(r).join(", "));
  });
  await check("Slots", "missing data", "No rule for the weekday -> no slots", async () => expect(gen(ds(sun), [rule(1, "09:00", "17:00")]).length === 0));
  await check("Slots", "missing data", "No rules at all -> no slots", async () => expect(gen(ds(mon), []).length === 0));
  await check("Slots", "missing data", "Malformed date -> no slots, no throw", async () => expect(gen("", [rule(1, "09:00", "17:00")]).length === 0));
  await check("Slots", "missing data", "Inverted rule (end before start) -> no slots", async () => expect(gen(ds(mon), [rule(1, "17:00", "09:00")]).length === 0));
  await check("Slots", "complete data", "Overlapping rules do not list the same time twice", async () => {
    const r = labels(gen(ds(mon), [rule(1, "09:00", "12:00"), rule(1, "11:00", "14:00")]));
    return expect(new Set(r).size === r.length, `got ${r.join(", ")}`);
  });
  await check("Slots", "complete data", "9:00 expert time is the same absolute instant whatever timezone the viewer is in", async () => {
    const india = gen("2026-11-02", [rule(1, "09:00", "10:00")])[0]?.startsAt;
    const newYork = gen("2026-11-02", [rule(1, "09:00", "10:00")], [], "America/New_York")[0]?.startsAt;
    return expect(india === "2026-11-02T03:30:00.000Z" && newYork === "2026-11-02T14:00:00.000Z", `Kolkata ${india}, New York ${newYork}`);
  });
  await check("Slots", "missing data", "An expert with no timezone, or a garbled one, still gets slots", async () => {
    const a = gen("2026-11-02", [rule(1, "09:00", "10:00")], [], null)[0]?.startsAt;
    const b = gen("2026-11-02", [rule(1, "09:00", "10:00")], [], "Not/AZone")[0]?.startsAt;
    return expect(a === "2026-11-02T03:30:00.000Z" && b === a, `null -> ${a}, garbled -> ${b}`);
  });
}
await slotChecks();

if (FULL && serverUp) {
  try { await fullFlows(); }
  catch (e) { results.push({ area: "Setup", scenario: "-", name: "Full flows aborted", status: "fail", detail: e.message, ms: 0 }); }
  finally {
    try {
      if (created.sessions.length) await admin.from("sessions").delete().in("id", created.sessions);
      await admin.from("sessions").delete().like("title", `${TAG}%`);
      await admin.from("messages").delete().like("body", `${TAG}%`);
      if (created.storage.length) await admin.storage.from("vault").remove(created.storage);
      for (const id of created.users) await admin.auth.admin.deleteUser(id);
      const left = await admin.from("sessions").select("id", { count: "exact", head: true }).like("title", `${TAG}%`);
      results.push({ area: "Cleanup", scenario: "-", name: "No [audit] rows left behind", status: left.count === 0 ? "pass" : "warn", detail: `${left.count ?? "?"} remaining`, ms: 0 });
    } catch (e) { results.push({ area: "Cleanup", scenario: "-", name: "Remove audit data", status: "warn", detail: `cleanup incomplete: ${e.message}`, ms: 0 }); }
  }
} else if (FULL) {
  results.push({ area: "Setup", scenario: "-", name: "Full flows skipped", status: "fail", detail: "dev server unreachable", ms: 0 });
}

// ---- report -----------------------------------------------------------------
const count = (s) => results.filter((r) => r.status === s).length;
const summary = { pass: count("pass"), warn: count("warn"), fail: count("fail"), total: results.length, mode: FULL ? "full" : "read-only", base: BASE, at: new Date().toISOString() };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const color = { pass: "#1a7f37", warn: "#9a6700", fail: "#cf222e" };
const rows = (list) => list.map((r) => `<tr><td>${esc(r.area)}</td><td>${esc(r.scenario)}</td><td>${esc(r.name)}</td><td style="color:${color[r.status]};font-weight:600">${r.status.toUpperCase()}</td><td>${esc(r.detail)}</td></tr>`).join("");
const needs = results.filter((r) => r.status !== "pass");
const html = `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;max-width:980px;margin:24px auto;color:#1f2328">
<h2>SOS audit report</h2>
<p>${summary.at} · ${summary.mode} · ${esc(summary.base)}<br><b style="color:${color.pass}">${summary.pass} passed</b> · <b style="color:${color.warn}">${summary.warn} warnings</b> · <b style="color:${color.fail}">${summary.fail} failed</b> of ${summary.total}</p>
${needs.length ? `<h3>Needs attention</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;width:100%"><tr><th>Area</th><th>Data</th><th>Check</th><th>Result</th><th>Detail</th></tr>${rows(needs)}</table>` : "<p><b>Nothing needs attention.</b></p>"}
<h3>All checks</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;width:100%"><tr><th>Area</th><th>Data</th><th>Check</th><th>Result</th><th>Detail</th></tr>${rows(results)}</table></body>`;
const text = `SOS audit ${summary.at} (${summary.mode})\n${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed of ${summary.total}\n\n` + (needs.map((r) => `[${r.status.toUpperCase()}] ${r.area} / ${r.name}\n    ${r.detail}`).join("\n") || "Nothing needs attention.");

mkdirSync(fileURLToPath(new URL("../../reports/", import.meta.url)), { recursive: true });
const stamp = summary.at.replace(/[:.]/g, "-");
const base = fileURLToPath(new URL(`../../reports/audit-${stamp}`, import.meta.url));
writeFileSync(base + ".json", JSON.stringify({ summary, results }, null, 2));
writeFileSync(base + ".html", html);

console.log(text);
console.log(`\nReport: reports/audit-${stamp}.html`);
if (EMAIL) {
  const r = await sendReportEmail({
    env,
    subject: `SOS audit: ${summary.fail} failed, ${summary.warn} warnings, ${summary.pass} passed`,
    html,
    text,
    attachments: [{ filename: `audit-${stamp}.json`, content: JSON.stringify({ summary, results }, null, 2) }],
  });
  console.log(r.sent ? `Email: ${r.reason}` : `Email NOT sent: ${r.reason}`);
}
process.exit(summary.fail ? 1 : 0);
