# SOS

A two-sided marketplace for architecture & design experts and their clients: booked consulting sessions with LiveKit video, a secure file vault, chat, and Razorpay payments. Next.js 16 (App Router) + Supabase (Postgres/RLS, Auth, Storage, Realtime).

> This is a modified Next.js 16. Read `node_modules/next/dist/docs/` before touching routing, the proxy (`src/proxy.ts`, formerly middleware) or route handlers.

## Local development

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Runs all migrations on an in-process Postgres and attacks RLS/triggers as a normal user |
| `npm run lint` / `npx tsc --noEmit` | Lint / typecheck |
| `npm run build` | Production build |

Dev-only login shortcuts (`test@sos.com`, phone `0000000000` / OTP `123456`) are compiled out of production (`NODE_ENV !== "development"`). Seed the dev accounts with `node scripts/seed-dev-users.mjs`.

`seed-dev-users.mjs`, `seed-demo-data.mjs` and `node scripts/audit/run.mjs --full` create accounts with the password `password` (one is an admin), so they refuse to run unless `.env.local` has `DEV_SEED_PROJECT_REF=<project ref>` matching `NEXT_PUBLIC_SUPABASE_URL`. Only set it for a throwaway project no real user can reach; never for production. `node scripts/audit/run.mjs` (read-only) needs no opt-in.

## Deploying (Vercel + Supabase)

### 1. Supabase
1. Create a project. In **Authentication → Providers** enable Email and Phone (OTP) as needed; set **Site URL** and **Redirect URLs** to your production domain.
2. Run every file in `supabase/migrations/` **in order** (`0000` → `0015`) in the SQL editor, or run `supabase/deploy/all_migrations.sql` once. They are idempotent and run from an empty database.
3. Create the private storage bucket: `node scripts/setup-storage.mjs` (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`).
4. Make yourself an admin (the only way to get the `admin` role; the API cannot do it):
   `update public.profiles set role = 'admin' where id = '<your auth user id>';`
   Then sign in on the **Expert** tab of `/login` with that email and password; admins land on `/dashboard/admin`.
5. Experts are **invite-only**, and you invite them from the admin console (see below). Add these to **Authentication → URL Configuration → Redirect URLs**, or invitation links will be refused:
   `https://<domain>/auth/accept` (and `http://localhost:3000/auth/accept` for development).
   Supabase's built-in email is rate-limited (a handful of messages an hour) and meant for testing; for real use, set up **custom SMTP** under Authentication → Emails. Until then, "Create link instead" in the invite panel gives you a link to send yourself.

### 2. Environment variables (Vercel → Project → Settings → Environment Variables)
See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are server-only; never prefix them with `NEXT_PUBLIC_`.

### 3. Razorpay
- Use **live** keys in production (test keys while verifying).
- Dashboard → Webhooks → add `https://<domain>/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed`, secret = `RAZORPAY_WEBHOOK_SECRET`.
- Money flow today: the client pays into **your** Razorpay account; the server verifies the signature, marks the session `escrow_held`, and writes two `payment_transfers` rows (60% booking / 40% completion, status `pending`). **Payouts to experts are manual** until Razorpay Route is approved: pay the expert, then mark the transfer `transferred`. Confirm with your accountant/Razorpay that collecting on behalf of experts fits your account type.
- Direct-UPI path: the client sends money straight to the expert's UPI ID; only the expert can confirm receipt.

### 4. LiveKit
Create a project, set `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Rooms are derived from the session id server-side; a user can only join their own paid, non-cancelled session, from 15 min before start to 60 min after end.

### 5. Smoke test after deploy
Sign up as a client → book an approved expert → pay (small real amount) → session shows *Escrow Held* → expert sees it → join the call from both accounts → upload a vault file → send a chat message.

## Admin console
`/dashboard/admin` (admins only; the route guard and the database both enforce it):
- **Experts**: invite experts, review what they submit, and approve, reject, suspend or reinstate. Only approved experts are listed and bookable.
  1. **Invite an expert** (name and email). They get an email with a link; or choose "Create link instead" and send it yourself. The account is created as an expert with an `invited` placeholder row.
  2. They open the link (it lands on `/auth/accept`), choose a password, and complete their profile at `/dashboard/expert/onboarding`. Submitting moves them to **Needs review**.
  3. You review and approve. The database refuses to approve an invitation that has no submitted profile.
  An open invitation can be given a **new sign-in link** or **cancelled** (only while nobody has signed in to it). An existing account is never converted into an expert through an invitation. Sign-in links work once; send them privately.
- **Payouts**: money collected through Razorpay is held by you until you pay the expert. Each booking has a 60% and a 40% payout; send the money yourself (UPI shown), then "Mark as sent" with a reference. The 40% share stays locked until the session is completed.
- **Sessions**: every booking on the platform, with "Record refund" for paid sessions. A refund is recorded atomically (payment refunded, unsent payouts cancelled, session cancelled) but **does not move money**: refund the client in Razorpay yourself. It is refused if part of the payment was already paid out.
Migration `0019` adds what this needs (admins can read payments; the two money actions are single database functions).

## Security model (what the database enforces)
Enforced by Postgres triggers/RLS (see `0014`, `0015`), independent of the UI:
- price comes from the expert's rate; clients cannot set `amount_inr` or `payment_status`
- a payment becomes `paid` only via a verified Razorpay signature/webhook (service role) or the expert confirming a UPI transfer
- `profiles.role` cannot be changed by the user; emails are not readable through the API
- double-booking is blocked; only the expert can complete a session

## Expert photos
Until a real portrait exists, each expert shows a monogram. To add one:
1. Put the image in `public/experts/` (portrait crop, about 1200 x 1500, JPG or WebP, under 300 KB).
2. Add it to `EXPERT_PHOTOS` at the top of `src/app/platter/page.tsx`, e.g. `"shravani reddy": "/experts/shravani-reddy.jpg"`.

A photo stored on the expert in the database (`expert_profiles.avatar_url`) takes priority over that list. It appears on the Platter profile card and on the pie's expert cards.

## Known limitations
- Expert payouts are manual (see Razorpay above).
- No rate limiting on the public contact form beyond length checks; add Vercel/WAF rules if spam appears.
- The marketing pages load many Google Fonts families; trimming them would improve first paint.
