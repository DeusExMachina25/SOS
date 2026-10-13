# Deep-check checklist

Run the automated audit first, then walk the manual list for what code can't judge.

```bash
npm test && npm run test:db && npx tsc --noEmit && npm run lint
node scripts/audit/run.mjs --full            # needs the dev server + seeded dev accounts
node scripts/audit/run.mjs --full --email    # same, and emails the report (see below)
```

`--full` writes rows tagged `[audit]` and removes them afterwards. It, `seed-dev-users.mjs` and `seed-demo-data.mjs`
refuse to run unless `.env.local` contains `DEV_SEED_PROJECT_REF=<project ref>` matching the project in
`NEXT_PUBLIC_SUPABASE_URL` (see `scripts/lib/dev-guard.mjs`). Only opt in for a throwaway project.
Reports land in `reports/audit-<time>.html|json` (git-ignored).

## Emailing the report
Add to `.env.local`: `RESEND_API_KEY`, `REPORT_EMAIL_FROM` (a sender on a domain verified in Resend),
`REPORT_EMAIL_TO` (comma-separated). Nothing is sent unless all three are set and `--email` is passed.

## What the automation covers
Route access per role, API contracts and bad input, call-room gating for every session state, booking rules,
payment (mock + UPI), vault round trip, chat, brand-new accounts with no data, privacy between users, slot logic.

## What only a human can judge
**Money (highest risk)**
- With real Razorpay *test* keys: pay, close the tab before the redirect, confirm the webhook still marks it paid and writes two payout rows.
- Pay twice quickly; pay a cancelled session; refund and then try to join the call.
- Check the 60/40 split on odd amounts; reconcile Razorpay dashboard totals against `payments` and `payment_transfers`.
- Payouts are manual: confirm someone owns marking transfers `transferred`.

**Time and place**
- Book from a browser set to a non-India timezone (known issue: slots use the viewer's timezone).
- Book across midnight, across a DST change, and for "today" late in the evening.
- Two people booking the same slot at the same moment.

**Live call**
- Two real browsers/devices join with real LiveKit keys; camera/mic permission denied; rejoin after refresh;
  join 16 min early (blocked) and 59 min after end (allowed).

**Accounts and access**
- Real sign-up for client (email link and phone OTP) and the expert invite flow; expired/reused links.
- Sign out in one tab while another is open; a session expiring mid-booking.
- Admin: approve/reject expert; a pending expert must not appear in the carousel or be bookable.

**Data edge cases in the UI**
- Very long names/titles/messages; emoji and non-Latin text; 50 MB vault file and a 51 MB one; unsupported types.
- Empty states on every page (the audit proves they load; check the wording and that the next action is obvious).
- Hundreds of sessions/messages: dashboards stay fast, lists paginate or scroll.

**Cross-cutting**
- Phone and tablet widths, dark/light theme, keyboard-only navigation, screen-reader labels on icon buttons.
- `prefers-reduced-motion` stops the gauge, hero and wave animations.
- Production build (`npm run build && npm start`), not just `npm run dev`: dev-only paths (mock payment, login shortcuts) must be absent.
- Env on the host: every variable in `.env.example` set; no server secret prefixed `NEXT_PUBLIC_`.
- Supabase: advisors clean (security + performance), backups on, RLS on every table, storage bucket private.
- Observability: errors reach a log you actually read; webhook failures alert someone.
