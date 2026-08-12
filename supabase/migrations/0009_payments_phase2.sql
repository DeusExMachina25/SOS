-- ============================================================================
-- Phase 2 — Payments (mocked escrow) + direct UPI interim path.
--
-- Context: the product plan calls for escrow via Razorpay Route (full charge
-- at booking, 60% released shortly after, 40% after session completion,
-- never custodying funds ourselves). Razorpay Route now requires RBI
-- compliance approval (deadline was 2025-12-31) which this account does not
-- yet have, so real Route transfers cannot be wired.
--
-- This migration builds the complete bookkeeping shape for that future
-- state — `payments` + `payment_transfers` — with the Razorpay side
-- deliberately MOCKED (no real Razorpay API calls; see queries.ts). Swapping
-- in real Orders/Route calls later is a backend-only change; this schema
-- does not need to change.
--
-- It also adds a direct-UPI interim path: the expert exposes a UPI ID, the
-- client pays them directly (outside the platform) and self-reports having
-- sent it, and only the EXPERT (or admin) can confirm receipt — that
-- confirmation is the one trust boundary that matters here, since we cannot
-- verify a transfer that happens outside Razorpay ourselves.
-- ============================================================================

begin;

do $$ begin
  create type public.payment_method as enum ('razorpay_mock', 'upi_direct');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_txn_status as enum ('created', 'processing', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_type as enum ('booking_release', 'completion_release');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_status as enum ('pending', 'transferred', 'skipped_route_not_active', 'failed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 1. Expert payout info
-- ----------------------------------------------------------------------------
alter table public.expert_profiles add column if not exists upi_id text;

-- ----------------------------------------------------------------------------
-- 2. payments — one row per session's payment attempt/record
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null unique references public.sessions(id) on delete cascade,
  method              public.payment_method not null,
  status              public.payment_txn_status not null default 'created',
  amount_inr          int not null check (amount_inr > 0),
  -- Populated only on the (mocked) razorpay_mock path.
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

create index if not exists payments_session_idx on public.payments (session_id);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Guard: only the receiving expert (or admin) may confirm a direct UPI
-- payment as received — the one attestation that actually matters here.
-- The razorpay_mock path has no real money movement, so it is left open
-- for the client to self-progress (created -> paid) as a bookkeeping mock.
create or replace function private.guard_payment_confirmation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_expert_id uuid;
begin
  if new.status = 'paid'
     and old.status is distinct from 'paid'
     and new.method = 'upi_direct' then
    select expert_id into v_expert_id from public.sessions where id = new.session_id;
    if not (
      v_expert_id = (select auth.uid())
      or private.is_admin()
      or (select auth.uid()) is null  -- service-role/server callers
    ) then
      raise exception 'Only the expert can confirm a direct UPI payment as received';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_payments_guard_confirmation on public.payments;
create trigger trg_payments_guard_confirmation
  before update on public.payments
  for each row execute function private.guard_payment_confirmation();

alter table public.payments enable row level security;

drop policy if exists "Participants can view their payment" on public.payments;
create policy "Participants can view their payment"
  on public.payments for select to authenticated
  using (private.is_session_participant(session_id));

drop policy if exists "Clients can create a payment for their own session" on public.payments;
create policy "Clients can create a payment for their own session"
  on public.payments for insert to authenticated
  with check (
    status in ('created', 'processing')
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.client_id = (select auth.uid())
    )
  );

drop policy if exists "Participants can update their payment" on public.payments;
create policy "Participants can update their payment"
  on public.payments for update to authenticated
  using (private.is_session_participant(session_id))
  with check (private.is_session_participant(session_id));

grant select, insert, update on public.payments to authenticated;

-- ----------------------------------------------------------------------------
-- 3. payment_transfers — the 60/40 release schedule (razorpay_mock path only)
-- Writable only by admin/service-role: this models the future reality where
-- only our backend (never the client) triggers a real Route transfer.
-- ----------------------------------------------------------------------------
create table if not exists public.payment_transfers (
  id                  uuid primary key default gen_random_uuid(),
  payment_id          uuid not null references public.payments(id) on delete cascade,
  transfer_type       public.transfer_type not null,
  amount_inr          int not null check (amount_inr > 0),
  status              public.transfer_status not null default 'pending',
  razorpay_transfer_id text,
  created_at          timestamptz not null default timezone('utc', now()),
  unique (payment_id, transfer_type)
);

create index if not exists payment_transfers_payment_idx on public.payment_transfers (payment_id);

alter table public.payment_transfers enable row level security;

drop policy if exists "Participants can view transfer schedule" on public.payment_transfers;
create policy "Participants can view transfer schedule"
  on public.payment_transfers for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_id and private.is_session_participant(p.session_id)
    )
  );

drop policy if exists "Admins manage transfers" on public.payment_transfers;
create policy "Admins manage transfers"
  on public.payment_transfers for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

grant select on public.payment_transfers to authenticated;
grant insert, update, delete on public.payment_transfers to authenticated;

commit;
