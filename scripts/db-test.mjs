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
await expectFail("client books with end before start", C,
  `insert into public.sessions (client_id, expert_id, title, starts_at, ends_at)
   values ('${C}','${E}','x', now() + interval '90 days' + interval '1 hour', now() + interval '90 days')`);
await expectFail("expert completes an unpaid session", E, `update public.sessions set status='completed' where id='${sid}'`);
await expectFail("client invents a status", C, `update public.sessions set status='refunded' where id='${sid}'`);
await expectFail("client marks own session paid", C, `update public.sessions set payment_status='escrow_held' where id='${sid}'`);
await expectFail("client lowers price", C, `update public.sessions set amount_inr=1 where id='${sid}'`);
await expectFail("client reassigns expert", C, `update public.sessions set expert_id='${C}' where id='${sid}'`);
await expectFail("client completes session", C, `update public.sessions set status='completed' where id='${sid}'`);
await expectOk("client cancels session", C, `update public.sessions set status='cancelled' where id='${sid}'`);
await expectFail("client re-opens a cancelled session", C, `update public.sessions set status='scheduled' where id='${sid}'`);
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
await expectFail("client re-opens a completed session", C, `update public.sessions set status='scheduled' where id='${sid}'`);
await expectFail("client cancels a completed session", C, `update public.sessions set status='cancelled' where id='${sid}'`);

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

// --- Admin console: money actions ------------------------------------------
const payS3 = (await db.query(`select id from public.payments where session_id='${s3}'`)).rows[0].id;
await db.exec(`
  insert into public.payment_transfers (payment_id, transfer_type, amount_inr, status) values
    ('${payS3}','booking_release',2400,'pending'),('${payS3}','completion_release',1600,'pending');
`);
const tBooking = (await db.query(`select id from public.payment_transfers where payment_id='${payS3}' and transfer_type='booking_release'`)).rows[0].id;

await expectFail("client marks a payout sent", C, `select public.admin_mark_transfer_paid('${tBooking}', 'x')`);
await expectFail("expert marks their own payout sent", E, `select public.admin_mark_transfer_paid('${tBooking}', 'x')`);
await expectFail("client refunds a session", C, `select public.admin_refund_session('${s3}')`);
await expectFail("expert refunds a session", E, `select public.admin_refund_session('${s3}')`);
// An RLS-blocked UPDATE raises nothing, it just changes zero rows, so check the row itself.
await as(E, `update public.payment_transfers set status='transferred' where id='${tBooking}'`).catch(() => {});
await as(C, `update public.payment_transfers set status='transferred', amount_inr=1 where id='${tBooking}'`).catch(() => {});
const untouched = (await db.query(`select status::text, amount_inr from public.payment_transfers where id='${tBooking}'`)).rows[0];
if (untouched.status !== "pending" || untouched.amount_inr !== 2400) { console.log("VULNERABLE: a participant changed a payout row", JSON.stringify(untouched)); failures++; }
else console.log("blocked   : expert and client cannot edit a payout row (row unchanged)");
const strangerSeesPay = await as(C2, `select count(*)::int n from public.payments`);
if (strangerSeesPay.rows[0].n !== 0) { console.log("VULNERABLE: stranger reads payments"); failures++; } else console.log("blocked   : stranger reads payments");
const adminSeesPay = await as(A, `select count(*)::int n from public.payments`);
if (adminSeesPay.rows[0].n < 2) { console.log("FAIL: admin cannot read all payments"); failures++; } else console.log("allowed   : admin reads all payments (" + adminSeesPay.rows[0].n + ")");

await expectOk("admin marks a payout sent", A, `select public.admin_mark_transfer_paid('${tBooking}', '  UTR-123  ')`);
const tDone = (await db.query(`select status, payout_reference, transferred_at is not null as stamped from public.payment_transfers where id='${tBooking}'`)).rows[0];
if (tDone.status !== "transferred" || tDone.payout_reference !== "UTR-123" || !tDone.stamped) { console.log("FAIL: payout not recorded", JSON.stringify(tDone)); failures++; }
await expectFail("admin marks the same payout sent twice", A, `select public.admin_mark_transfer_paid('${tBooking}', 'again')`);
await expectFail("admin refunds after part was paid out", A, `select public.admin_refund_session('${s3}')`);

// A fresh paid session with nothing paid out yet: the refund must be all-or-nothing.
await db.exec(`
  insert into public.sessions (client_id, expert_id, title, starts_at, ends_at, amount_inr)
    values ('${C}','${E}','Refundable','${new Date(Date.now()+86400e3*12).toISOString()}','${new Date(Date.now()+86400e3*12+3600e3).toISOString()}',3000);
`);
const s5 = (await db.query(`select id from public.sessions where title='Refundable'`)).rows[0].id;
await db.exec(`set role service_role`);
await db.exec(`insert into public.payments (session_id, method, status, amount_inr, razorpay_order_id) values ('${s5}','razorpay','created',3000,'order_R')`);
await db.exec(`update public.payments set status='paid', razorpay_payment_id='pay_R' where razorpay_order_id='order_R'`);
await db.exec(`reset role`);
const payS5 = (await db.query(`select id from public.payments where session_id='${s5}'`)).rows[0].id;
await db.exec(`insert into public.payment_transfers (payment_id, transfer_type, amount_inr, status) values ('${payS5}','booking_release',1800,'pending'),('${payS5}','completion_release',1200,'pending')`);

await db.exec(`
  insert into public.sessions (client_id, expert_id, title, starts_at, ends_at, amount_inr)
    values ('${C}','${E}','Never paid','${new Date(Date.now()+86400e3*15).toISOString()}','${new Date(Date.now()+86400e3*15+3600e3).toISOString()}',3000);
`);
const sUnpaid = (await db.query(`select id from public.sessions where title='Never paid'`)).rows[0].id;
await expectFail("admin refunds an unpaid session", A, `select public.admin_refund_session('${sUnpaid}')`);
await expectFail("admin refunds a session that does not exist", A, `select public.admin_refund_session('00000000-0000-0000-0000-000000000000')`);
await expectOk("admin refunds a paid session", A, `select public.admin_refund_session('${s5}')`);
const refunded = (await db.query(`
  select (select status::text from public.payments where id='${payS5}') pay,
         (select payment_status::text from public.sessions where id='${s5}') sess_pay,
         (select status::text from public.sessions where id='${s5}') sess,
         (select array_agg(status::text) from public.payment_transfers where payment_id='${payS5}') transfers`)).rows[0];
console.log("   after refund:", JSON.stringify(refunded));
if (refunded.pay !== "refunded" || refunded.sess_pay !== "refunded" || refunded.sess !== "cancelled" || !refunded.transfers.every((t) => t === "cancelled")) {
  console.log("FAIL: refund did not update everything"); failures++;
}
await expectFail("admin refunds the same session twice", A, `select public.admin_refund_session('${s5}')`);

// Expert approval stays admin-only.
await db.exec(`
  insert into auth.users (id,email) values ('44444444-4444-4444-4444-444444444444','e2@x.com');
  update public.profiles set role='expert' where id='44444444-4444-4444-4444-444444444444';
  insert into public.expert_profiles (profile_id, professional_title, bio, location, session_rate_inr, status)
    values ('44444444-4444-4444-4444-444444444444','Planner','bio','Pune',4000,'profile_submitted');
`);
await expectFail("expert approves themselves", "44444444-4444-4444-4444-444444444444", `update public.expert_profiles set status='approved' where profile_id='44444444-4444-4444-4444-444444444444'`);
await expectOk("admin approves an expert", A, `update public.expert_profiles set status='approved' where profile_id='44444444-4444-4444-4444-444444444444'`);
await expectOk("admin suspends an expert", A, `update public.expert_profiles set status='suspended' where profile_id='44444444-4444-4444-4444-444444444444'`);
const susp = await as(C, `select count(*)::int n from public.public_experts where id='44444444-4444-4444-4444-444444444444'`);
if (susp.rows[0].n !== 0) { console.log("VULNERABLE: suspended expert still listed"); failures++; } else console.log("blocked   : suspended expert is not listed");

const anon = await db.query(`select count(*)::int n from public.public_experts`);
console.log("public_experts rows:", anon.rows[0].n);

console.log(failures ? `\n${failures} PROBLEM(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
