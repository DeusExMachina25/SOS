// Runs every migration on an in-process Postgres (PGlite) with Supabase stubs, then
// attacks the RLS/trigger layer as an ordinary signed-in user. Run: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../supabase/migrations/", import.meta.url);
const db = new PGlite();

// --- Minimal Supabase environment stubs -----------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage; create schema extensions;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text,
    raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as
    $$ select string_to_array(name, '/') $$;
  create publication supabase_realtime;
  alter default privileges in schema public grant all on tables to authenticated, service_role;
`);

// --- Run every migration in order ------------------------------------------
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  try {
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
    console.log("OK  ", f);
  } catch (e) {
    console.log("FAIL", f, "->", e.message);
    process.exit(1);
  }
}

// --- Security assertions ----------------------------------------------------
let failures = 0;
const as = async (uid, sql, params) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid ?? ""}',false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`);
  }
};
const expectFail = async (name, uid, sql, params) => {
  try {
    await as(uid, sql, params);
    console.log("VULNERABLE:", name);
    failures++;
  } catch (e) {
    console.log("blocked   :", name, "->", e.message.slice(0, 70));
  }
};
const expectOk = async (name, uid, sql, params) => {
  try {
    const r = await as(uid, sql, params);
    console.log("allowed   :", name);
    return r;
  } catch (e) {
    console.log("UNEXPECTED FAILURE:", name, "->", e.message);
    failures++;
  }
};

const C = "11111111-1111-1111-1111-111111111111";
const C2 = "11111111-1111-1111-1111-222222222222";
const E = "22222222-2222-2222-2222-222222222222";
const A = "33333333-3333-3333-3333-333333333333";

await db.exec(`
  insert into auth.users (id,email) values ('${C}','c@x.com'),('${C2}','c2@x.com'),('${E}','e@x.com'),('${A}','a@x.com');
  update public.profiles set role='expert' where id='${E}';
  update public.profiles set role='admin'  where id='${A}';
  insert into public.expert_profiles (profile_id, professional_title, bio, location, session_rate_inr, status)
    values ('${E}','Architect','bio','Hyd',5000,'approved');
`);

await expectFail("client self-promotes to admin", C, `update public.profiles set role='admin' where id='${C}'`);
await expectFail("client self-promotes to expert", C, `update public.profiles set role='expert' where id='${C}'`);
await expectOk("client renames self", C, `update public.profiles set full_name='Bob' where id='${C}'`);
await expectFail("client reads emails", C, `select email from public.profiles`);
await expectOk("client reads names", C, `select id, full_name, role from public.profiles`);

const future = new Date(Date.now() + 86400e3 * 3).toISOString();
const future2 = new Date(Date.now() + 86400e3 * 3 + 3600e3).toISOString();
const r = await expectOk("client books at spoofed price 1", C,
  `insert into public.sessions (client_id, expert_id, title, starts_at, ends_at, amount_inr, payment_status, status)
   values ('${C}','${E}','Review','${future}','${future2}', 1, 'released', 'completed') returning id, amount_inr, payment_status, status`);
const sid = r?.rows?.[0]?.id;
console.log("   stored:", JSON.stringify(r?.rows?.[0]));
if (r?.rows?.[0]?.amount_inr !== 5000 || r.rows[0].payment_status !== "unpaid" || r.rows[0].status !== "scheduled") {
  console.log("VULNERABLE: booking price/status not forced");
  failures++;
}

await expectFail("client books in the past", C,
  `insert into public.sessions (client_id, expert_id, title, starts_at, ends_at)
   values ('${C}','${E}','x','2020-01-01','2020-01-02')`);
await expectFail("client marks own session paid", C, `update public.sessions set payment_status='escrow_held' where id='${sid}'`);
await expectFail("client lowers price", C, `update public.sessions set amount_inr=1 where id='${sid}'`);
await expectFail("client reassigns expert", C, `update public.sessions set expert_id='${C}' where id='${sid}'`);
await expectFail("client completes session", C, `update public.sessions set status='completed' where id='${sid}'`);
await expectOk("client cancels session", C, `update public.sessions set status='cancelled' where id='${sid}'`);
await db.exec(`update public.sessions set status='scheduled' where id='${sid}'`);

await expectFail("client inserts payment as paid (razorpay)", C,
  `insert into public.payments (session_id, method, status, amount_inr) values ('${sid}','razorpay','paid',1)`);
await expectFail("client inserts mock payment", C,
  `insert into public.payments (session_id, method, status, amount_inr) values ('${sid}','razorpay_mock','created',1)`);
await expectOk("client records UPI sent (amount spoofed)", C,
  `insert into public.payments (session_id, method, status, amount_inr) values ('${sid}','upi_direct','processing',1)`);
const pay = await db.query(`select amount_inr from public.payments where session_id='${sid}'`);
if (pay.rows[0].amount_inr !== 5000) { console.log("VULNERABLE: payment amount spoofable"); failures++; }
await expectFail("client confirms own UPI payment", C, `update public.payments set status='paid' where session_id='${sid}'`);
const other = await as(C2, `select count(*)::int n from public.payments`);
if (other.rows[0].n !== 0) { console.log("VULNERABLE: stranger sees payments"); failures++; } else console.log("blocked   : stranger sees 0 payments");
await expectOk("expert confirms UPI payment", E, `update public.payments set status='paid' where session_id='${sid}'`);
const s2 = await db.query(`select payment_status from public.sessions where id='${sid}'`);
console.log("   session payment_status after expert confirm:", s2.rows[0].payment_status);
if (s2.rows[0].payment_status !== "released") { console.log("FAIL: status not derived"); failures++; }
await expectFail("client reverts paid payment", C, `update public.payments set status='processing' where session_id='${sid}'`);
await expectOk("expert completes session", E, `update public.sessions set status='completed' where id='${sid}'`);

// service role path (what the Razorpay verify route does)
await db.exec(`
  insert into public.sessions (client_id, expert_id, title, starts_at, ends_at, amount_inr)
    values ('${C}','${E}','Second','${new Date(Date.now()+86400e3*9).toISOString()}','${new Date(Date.now()+86400e3*9+3600e3).toISOString()}',4000);
`);
const s3 = (await db.query(`select id from public.sessions where title='Second'`)).rows[0].id;
await db.exec(`set role service_role`);
await db.exec(`insert into public.payments (session_id, method, status, amount_inr, razorpay_order_id) values ('${s3}','razorpay','created',4000,'order_X')`);
await db.exec(`update public.payments set status='paid', razorpay_payment_id='pay_X' where razorpay_order_id='order_X'`);
await db.exec(`reset role`);
const s4 = await db.query(`select payment_status from public.sessions where id='${s3}'`);
console.log("service-role razorpay paid -> session payment_status:", s4.rows[0].payment_status);
if (s4.rows[0].payment_status !== "escrow_held") { console.log("FAIL: razorpay status"); failures++; }

const anon = await db.query(`select count(*)::int n from public.public_experts`);
console.log("public_experts rows:", anon.rows[0].n);

console.log(failures ? `\n${failures} PROBLEM(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
