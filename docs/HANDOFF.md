# Handoff

Read this first if you are picking up SOS work (human or agent). Update it after every big change.

_Last updated: 2026-11-23_

## What SOS is
An expert second-opinion marketplace for home design: clients book paid video sessions with independent
architects and designers, share files in a vault, chat, and sketch floor plans at `/sketch`.
Stack: Next.js 16 (App Router, `src/proxy.ts` instead of middleware), Supabase (Postgres + RLS, Auth, Storage,
Realtime), LiveKit video, Razorpay and direct UPI payments, Resend email, Sentry. Hosted on Vercel.

## Where things are
| Path | What |
|---|---|
| `src/app/` | Pages and API routes (`api/payments`, `api/livekit-token`, `api/admin`) |
| `src/proxy.ts` | Session refresh and role routing (the real gate is RLS in Postgres) |
| `src/lib/` | Payments, email, data queries, the floor-plan engine (`lib/plan`) |
| `src/config/` | Page layouts and home story order (block codes) |
| `supabase/migrations/` | Ordered, idempotent SQL; `supabase/deploy/all_migrations.sql` is the combined file CI checks |
| `docs/LAUNCH-SETUP.md` | Dashboard steps only the owner can do (domain, email, keys) |
| `docs/QA-CHECKLIST.md` | Manual and automated checks before launch |

## Current state (2026-11-23)
- `main` passes CI: lint, typecheck, 332 unit tests, database rule tests, production build.
- Runs on Vercel previews only. No production domain yet.
- The SOS Supabase project the owner's `.env.local` pointed to no longer resolves (seen 2026-11-15); a working
  database must be set up before any end-to-end test.
- Goal: invite-only paid pilot by 2026-11-28. Plan: https://claude.ai/artifact/LP7cUaGv5og1684TQLUVgS

## Open PRs (as of 2026-11-23)
| PR | Status |
|---|---|
| #10 Booking emails (UPI confirmations, reminders, migration 0023) | Merge first. Needs `CRON_SECRET` |
| #11 Dashboard Overview redesign | Merge second |
| #12 Sketch tab redesign | Merge third |
| #6 How SOS works (draft) | Superseded; conflicts with `main`. Close |

#10, #11 and #12 were test-merged together on 2026-11-23 with no conflicts and all checks green.

## Next steps
See the plan linked above. In short: working Supabase project, domain, Resend, Vercel Pro, env vars, start
Razorpay KYC, merge #10 to #12, rehearse the full booking flow on the live domain, invite pilot users.

## Habits
- Work on a branch, open a PR, let CI go green, then merge. Never push straight to `main`.
- After adding a migration, run `node scripts/build-all-migrations.mjs` and commit the combined file.
- Log every merged change in `docs/CHANGELOG.md`.
