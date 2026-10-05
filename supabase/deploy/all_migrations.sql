-- GENERATED: all migrations concatenated in order. Safe to paste into the Supabase SQL editor and run once.
-- Regenerate with: node scripts/build-all-migrations.mjs

-- ===== 0000_baseline.sql =====
-- ============================================================================
-- Baseline: the tables every later migration builds on (profiles, sessions).
--
-- These used to live in supabase/schema.sql, which was removed when the
-- migration chain was introduced; 0001+ assumed they already existed. This
-- file makes the chain runnable on a brand-new Supabase project and is a
-- no-op on one that already has them (everything is IF NOT EXISTS).
-- ============================================================================

begin;

do $$ begin
  create type public.user_role as enum ('client', 'expert', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       public.user_role not null default 'client',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.profiles(id),
  expert_id  uuid references public.profiles(id),
  status     text not null default 'scheduled',
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- Older databases created sessions with scheduled_at + duration_minutes.
alter table public.sessions add column if not exists starts_at timestamptz;
alter table public.sessions add column if not exists ends_at   timestamptz;

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sessions'
               and column_name = 'scheduled_at') then
    execute $q$
      update public.sessions
         set starts_at = coalesce(starts_at, scheduled_at),
             ends_at   = coalesce(ends_at,
                           scheduled_at + make_interval(mins => coalesce(duration_minutes, 60)))
       where starts_at is null and scheduled_at is not null
    $q$;
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

commit;

-- ===== 0001_marketplace_core.sql =====
-- ============================================================================
-- SOS Marketplace Core — Phase 1 schema
-- Adds: expert_profiles, availability, vault_files, chat, reviews; extends
-- sessions (bookings) with title/amount/payment (escrow-ready).
--
-- Conventions (per Supabase Postgres best practices):
--   * RLS enabled on every table in `public`.
--   * Policies use `TO authenticated` + an ownership predicate.
--   * auth.uid() wrapped in (select ...) so it is evaluated once per query.
--   * UPDATE policies define both USING and WITH CHECK.
--   * FK and RLS-predicate columns are indexed.
--   * Helper authz functions live in a private (non-API-exposed) schema,
--     are SECURITY DEFINER with an empty search_path, and check auth.uid().
--
-- Re-runnable: drops policies before recreating and uses IF NOT EXISTS.
-- ============================================================================

begin;

-- Helper functions below reference tables created later in this file; skip body
-- validation so the migration also runs on a brand-new database.
set local check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- 0. Extensions & private schema
-- ----------------------------------------------------------------------------
create schema if not exists private;

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.expert_status as enum
    ('invited', 'profile_submitted', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_payment_status as enum
    ('unpaid', 'escrow_held', 'released', 'refunded');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. Shared helpers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end $$;

-- Admin check (used across policies). SECURITY DEFINER so RLS on profiles
-- does not recurse; empty search_path per best practice.
create or replace function private.is_admin()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Is the current user a participant (client or expert) of a session?
create or replace function private.is_session_participant(p_session_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and (select auth.uid()) in (s.client_id, s.expert_id)
  );
$$;

-- Is the current user a participant of a chat thread?
create or replace function private.is_thread_participant(p_thread_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.chat_threads t
    where t.id = p_thread_id
      and (select auth.uid()) in (t.client_id, t.expert_id)
  );
$$;

revoke execute on function private.is_admin() from public, anon;
revoke execute on function private.is_session_participant(uuid) from public, anon;
revoke execute on function private.is_thread_participant(uuid) from public, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_session_participant(uuid) to authenticated;
grant execute on function private.is_thread_participant(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. expert_profiles  (1:1 with profiles where role = 'expert')
-- ----------------------------------------------------------------------------
create table if not exists public.expert_profiles (
  profile_id         uuid primary key references public.profiles(id) on delete cascade,
  professional_title text not null,
  bio                text check (char_length(bio) <= 240),
  location           text,
  timezone           text,
  years_experience   int  check (years_experience >= 0 and years_experience <= 80),
  -- Flat per-session price in whole INR rupees (Razorpay wants paise = *100 later).
  session_rate_inr   int  not null check (session_rate_inr > 0),
  avatar_url         text,
  specialties        text[] not null default '{}',
  -- Optional trust-builders
  firm               text,
  coa_registration   text,
  credentials        text,
  languages          text[] not null default '{}',
  portfolio_paths    text[] not null default '{}',   -- Supabase Storage paths
  -- Onboarding lifecycle (invite-only)
  status             public.expert_status not null default 'invited',
  invited_by         uuid references public.profiles(id),
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now())
);

create index if not exists expert_profiles_status_idx      on public.expert_profiles (status);
create index if not exists expert_profiles_specialties_idx on public.expert_profiles using gin (specialties);
create index if not exists expert_profiles_invited_by_idx  on public.expert_profiles (invited_by);

drop trigger if exists trg_expert_profiles_updated_at on public.expert_profiles;
create trigger trg_expert_profiles_updated_at
  before update on public.expert_profiles
  for each row execute function public.set_updated_at();

-- Prevent experts from self-approving: block status changes unless admin or
-- a server-side (service_role, no auth.uid()) caller.
create or replace function private.guard_expert_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'Only an admin can change expert approval status';
  end if;
  return new;
end $$;

drop trigger if exists trg_expert_profiles_status_guard on public.expert_profiles;
create trigger trg_expert_profiles_status_guard
  before update on public.expert_profiles
  for each row execute function private.guard_expert_status();

alter table public.expert_profiles enable row level security;

drop policy if exists "Approved experts are viewable by authenticated users" on public.expert_profiles;
create policy "Approved experts are viewable by authenticated users"
  on public.expert_profiles for select to authenticated
  using (
    status = 'approved'
    or profile_id = (select auth.uid())
    or private.is_admin()
  );

drop policy if exists "Experts can create their own expert profile" on public.expert_profiles;
create policy "Experts can create their own expert profile"
  on public.expert_profiles for insert to authenticated
  with check (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "Experts can update their own expert profile" on public.expert_profiles;
create policy "Experts can update their own expert profile"
  on public.expert_profiles for update to authenticated
  using (profile_id = (select auth.uid()) or private.is_admin())
  with check (profile_id = (select auth.uid()) or private.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Availability (weekly recurring rules + one-off time off)
-- ----------------------------------------------------------------------------
create table if not exists public.expert_availability (
  id         uuid primary key default gen_random_uuid(),
  expert_id  uuid not null references public.profiles(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (end_time > start_time)
);
create index if not exists expert_availability_expert_idx on public.expert_availability (expert_id);

create table if not exists public.expert_time_off (
  id         uuid primary key default gen_random_uuid(),
  expert_id  uuid not null references public.profiles(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);
create index if not exists expert_time_off_expert_idx on public.expert_time_off (expert_id);

alter table public.expert_availability enable row level security;
alter table public.expert_time_off    enable row level security;

-- Availability is readable by any authenticated user (needed to book).
drop policy if exists "Availability is readable by authenticated users" on public.expert_availability;
create policy "Availability is readable by authenticated users"
  on public.expert_availability for select to authenticated using (true);

drop policy if exists "Experts manage their own availability" on public.expert_availability;
create policy "Experts manage their own availability"
  on public.expert_availability for all to authenticated
  using (expert_id = (select auth.uid()) or private.is_admin())
  with check (expert_id = (select auth.uid()) or private.is_admin());

drop policy if exists "Time off is readable by authenticated users" on public.expert_time_off;
create policy "Time off is readable by authenticated users"
  on public.expert_time_off for select to authenticated using (true);

drop policy if exists "Experts manage their own time off" on public.expert_time_off;
create policy "Experts manage their own time off"
  on public.expert_time_off for all to authenticated
  using (expert_id = (select auth.uid()) or private.is_admin())
  with check (expert_id = (select auth.uid()) or private.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Extend sessions (bookings) — title, amount, escrow payment status
-- ----------------------------------------------------------------------------
alter table public.sessions add column if not exists title          text;
alter table public.sessions add column if not exists amount_inr     int check (amount_inr >= 0);
alter table public.sessions add column if not exists payment_status public.session_payment_status not null default 'unpaid';
alter table public.sessions add column if not exists updated_at     timestamptz not null default timezone('utc', now());

create index if not exists sessions_client_idx on public.sessions (client_id);
create index if not exists sessions_expert_idx on public.sessions (expert_id);

drop trigger if exists trg_sessions_updated_at on public.sessions;
create trigger trg_sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- Existing SELECT policies (clients/experts/admins) remain. Add booking + update.
drop policy if exists "Clients can book sessions with approved experts" on public.sessions;
create policy "Clients can book sessions with approved experts"
  on public.sessions for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and expert_id in (select profile_id from public.expert_profiles where status = 'approved')
  );

drop policy if exists "Participants can update their sessions" on public.sessions;
create policy "Participants can update their sessions"
  on public.sessions for update to authenticated
  using (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
    or private.is_admin()
  )
  with check (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
    or private.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 6. Vault files (scoped to a session; visible to both participants)
-- ----------------------------------------------------------------------------
create table if not exists public.vault_files (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  uploaded_by  uuid not null references public.profiles(id),
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes >= 0),
  created_at   timestamptz not null default timezone('utc', now())
);
create index if not exists vault_files_session_idx  on public.vault_files (session_id);
create index if not exists vault_files_uploader_idx on public.vault_files (uploaded_by);

alter table public.vault_files enable row level security;

drop policy if exists "Participants can view vault files" on public.vault_files;
create policy "Participants can view vault files"
  on public.vault_files for select to authenticated
  using (private.is_session_participant(session_id));

drop policy if exists "Participants can upload vault files" on public.vault_files;
create policy "Participants can upload vault files"
  on public.vault_files for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and private.is_session_participant(session_id)
  );

drop policy if exists "Uploaders can delete their vault files" on public.vault_files;
create policy "Uploaders can delete their vault files"
  on public.vault_files for delete to authenticated
  using (uploaded_by = (select auth.uid()) or private.is_admin());

-- ----------------------------------------------------------------------------
-- 7. Chat (one thread per client<->expert pair; messages within)
-- ----------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  expert_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (client_id, expert_id)
);
create index if not exists chat_threads_client_idx on public.chat_threads (client_id);
create index if not exists chat_threads_expert_idx on public.chat_threads (expert_id);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.chat_threads(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);
create index if not exists messages_sender_idx on public.messages (sender_id);

alter table public.chat_threads enable row level security;
alter table public.messages     enable row level security;

drop policy if exists "Participants can view their threads" on public.chat_threads;
create policy "Participants can view their threads"
  on public.chat_threads for select to authenticated
  using (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
    or private.is_admin()
  );

drop policy if exists "Participants can create their threads" on public.chat_threads;
create policy "Participants can create their threads"
  on public.chat_threads for insert to authenticated
  with check (client_id = (select auth.uid()) or expert_id = (select auth.uid()));

drop policy if exists "Participants can view thread messages" on public.messages;
create policy "Participants can view thread messages"
  on public.messages for select to authenticated
  using (private.is_thread_participant(thread_id));

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_thread_participant(thread_id)
  );

-- Realtime for live chat.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 8. Reviews (schema now; surfaced to clients in a later phase)
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  expert_id  uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  comment    text check (char_length(comment) <= 1000),
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists reviews_expert_idx on public.reviews (expert_id);
create index if not exists reviews_client_idx on public.reviews (client_id);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are readable by authenticated users" on public.reviews;
create policy "Reviews are readable by authenticated users"
  on public.reviews for select to authenticated using (true);

drop policy if exists "Clients can review their own completed sessions" on public.reviews;
create policy "Clients can review their own completed sessions"
  on public.reviews for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.sessions s
      where s.id = session_id
        and s.client_id = (select auth.uid())
        and s.expert_id = reviews.expert_id
        and s.status = 'completed'
    )
  );

-- ----------------------------------------------------------------------------
-- 9. Data API grants (RLS still governs row visibility)
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on public.expert_profiles     to authenticated;
grant select, insert, update, delete on public.expert_availability to authenticated;
grant select, insert, update, delete on public.expert_time_off     to authenticated;
grant select, insert, update, delete on public.vault_files         to authenticated;
grant select, insert, update, delete on public.chat_threads        to authenticated;
grant select, insert, update, delete on public.messages            to authenticated;
grant select, insert                 on public.reviews             to authenticated;

commit;

-- ===== 0002_fix_profiles_rls.sql =====
-- ============================================================================
-- Fix: profiles has RLS enabled but no effective permissive SELECT policy,
-- so authenticated users read 0 rows (role/name come back empty and every
-- user misroutes to the expert dashboard). Establish clean policies.
--
-- Access model (MVP, invite-only):
--   * Authenticated users may read profiles (names needed for directory,
--     chat, sessions). NOT exposed to anon, so the public site can't scrape
--     emails/phones. Tighten to a public view later if needed.
--   * Users may insert/update only their own row.
-- ============================================================================

begin;

alter table public.profiles enable row level security;

-- Remove any stale/legacy policies (names from the original schema.sql).
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile."       on public.profiles;
drop policy if exists "Users can update own profile."             on public.profiles;
drop policy if exists "Authenticated users can view profiles"     on public.profiles;
drop policy if exists "Users can insert their own profile"        on public.profiles;
drop policy if exists "Users can update their own profile"        on public.profiles;

create policy "Authenticated users can view profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- Without this, real (non-seeded) signups authenticate but have no profile,
-- so role lookups fail and the app cannot route or name them.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- NB: public.profiles has no `phone` column in this project; do not add one
  -- here without also altering the table.
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    -- Role comes from app_metadata (server-controlled), never user_metadata,
    -- which is user-editable. Defaults to 'client'.
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'client')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

-- ===== 0003_vault_storage_policies.sql =====
-- ============================================================================
-- Storage RLS for the private `vault` bucket.
--
-- Files are stored at `<session_id>/<timestamp>-<filename>`, so the first path
-- segment identifies the session. Access mirrors vault_files: only the client
-- and expert on that session may read or write.
--
-- Note: upsert requires INSERT + SELECT + UPDATE together (Supabase gotcha).
-- ============================================================================

begin;

drop policy if exists "Vault: participants can read"   on storage.objects;
drop policy if exists "Vault: participants can upload" on storage.objects;
drop policy if exists "Vault: participants can update" on storage.objects;
drop policy if exists "Vault: uploaders can delete"    on storage.objects;

create policy "Vault: participants can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vault'
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "Vault: participants can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vault'
    and owner = (select auth.uid())
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "Vault: participants can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vault'
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'vault'
    and private.is_session_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "Vault: uploaders can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and owner = (select auth.uid()));

commit;

-- ===== 0004_fix_booking_and_signup.sql =====
-- ============================================================================
-- Fixes two failures found by end-to-end testing:
--
--   1. Booking rejected: "new row violates row-level security policy for
--      table sessions". A service-role insert with identical values succeeds,
--      so the columns/constraints are fine — the INSERT policy is the problem.
--      Recreated below in a simpler, more robust form (an EXISTS check that
--      does not depend on a subquery being visible through another table's RLS).
--
--   2. Signup broken: "Database error creating new user" — the
--      handle_new_user trigger raises, which aborts the whole auth insert.
--      Rewritten to be exception-safe: a profile problem must never block
--      account creation. Role is no longer cast from metadata (that cast was
--      the likely raiser); admins set roles explicitly instead.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Sessions INSERT / UPDATE policies
-- ----------------------------------------------------------------------------
alter table public.sessions enable row level security;

drop policy if exists "Clients can book sessions with approved experts" on public.sessions;
drop policy if exists "Participants can update their sessions"          on public.sessions;

-- Client books: they must be the client on the row, and the counterparty must
-- be an approved expert. EXISTS avoids relying on RLS-filtered subquery rows.
create policy "Clients can book sessions with approved experts"
  on public.sessions for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1
      from public.expert_profiles ep
      where ep.profile_id = sessions.expert_id
        and ep.status = 'approved'
    )
  );

create policy "Participants can update their sessions"
  on public.sessions for update to authenticated
  using (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
  )
  with check (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
  );

grant select, insert, update on public.sessions to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Exception-safe signup trigger
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.profiles (id, email, full_name)
    values (
      new.id,
      new.email,
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        split_part(coalesce(new.email, ''), '@', 1)
      )
    )
    on conflict (id) do nothing;
  exception
    when others then
      -- Never block account creation on a profile write; surface in logs.
      raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

-- ===== 0005_sessions_insert_fix.sql =====
-- ============================================================================
-- Booking is still rejected by RLS on public.sessions even though a
-- service-role insert with identical values succeeds.
--
-- Rather than keep guessing at the policy expression, this migration:
--   1. Adds a service-role-only diagnostic RPC so policies can be inspected
--      from the app side (no dashboard round-trip needed to debug RLS).
--   2. Replaces every INSERT policy on sessions with the simplest correct
--      rule — "you must be the client on the row" — and moves the
--      "expert must be approved" business rule into a BEFORE INSERT trigger.
--
-- Why the split: RLS expressions that reach through a second table's RLS are
-- brittle and fail with an opaque "violates row-level security policy".
-- A trigger enforces the same rule with a clear, debuggable error message.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Diagnostic: inspect policies from the client (service_role only)
-- ----------------------------------------------------------------------------
create or replace function public.debug_policies(p_table text)
returns table (
  policyname text,
  cmd        text,
  permissive text,
  roles      text,
  qual       text,
  with_check text
)
language sql
security definer
set search_path = ''
as $$
  select
    p.policyname::text,
    p.cmd::text,
    p.permissive::text,
    array_to_string(p.roles, ',')::text,
    coalesce(p.qual, '')::text,
    coalesce(p.with_check, '')::text
  from pg_catalog.pg_policies p
  where p.schemaname = 'public' and p.tablename = p_table;
$$;

revoke execute on function public.debug_policies(text) from public, anon, authenticated;
grant execute on function public.debug_policies(text) to service_role;

-- ----------------------------------------------------------------------------
-- 2. Rebuild sessions INSERT: ownership in RLS, business rule in a trigger
-- ----------------------------------------------------------------------------
alter table public.sessions enable row level security;

do $$
declare pol record;
begin
  -- Clear every existing policy on sessions so no stale/restrictive rule
  -- silently blocks inserts.
  for pol in
    select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'sessions'
  loop
    execute format('drop policy if exists %I on public.sessions', pol.policyname);
  end loop;
end $$;

create policy "sessions_select_participants"
  on public.sessions for select to authenticated
  using (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
    or private.is_admin()
  );

create policy "sessions_insert_own"
  on public.sessions for insert to authenticated
  with check (client_id = (select auth.uid()));

create policy "sessions_update_participants"
  on public.sessions for update to authenticated
  using (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
    or private.is_admin()
  )
  with check (
    client_id = (select auth.uid())
    or expert_id = (select auth.uid())
    or private.is_admin()
  );

grant select, insert, update on public.sessions to authenticated;

-- Business rule: the counterparty must be an approved expert.
create or replace function private.enforce_approved_expert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.expert_profiles ep
    where ep.profile_id = new.expert_id and ep.status = 'approved'
  ) then
    raise exception 'Expert % is not approved for bookings', new.expert_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_sessions_approved_expert on public.sessions;
create trigger trg_sessions_approved_expert
  before insert on public.sessions
  for each row execute function private.enforce_approved_expert();

commit;

-- ===== 0006_close_self_approval_hole.sql =====
-- ============================================================================
-- SECURITY FIX: any authenticated user could INSERT an expert_profiles row
-- with status = 'approved', self-approving into the marketplace and becoming
-- bookable. This defeats the invite-only model.
--
-- Cause: private.guard_expert_status() only fired BEFORE UPDATE, so the
-- status column was unguarded on INSERT.
--
-- Fix: on INSERT, force a non-admin's status to 'profile_submitted'
-- (silently downgraded rather than raising, so profile completion still
-- works). Only an admin — or a server-side service_role caller, which has
-- no auth.uid() — may set 'approved'.
-- ============================================================================

begin;

create or replace function private.guard_expert_status_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- auth.uid() is null for service_role/server-side calls (seeding, admin
  -- tooling), which are trusted and left alone.
  if (select auth.uid()) is not null and not private.is_admin() then
    if new.status is distinct from 'profile_submitted'::public.expert_status then
      new.status := 'profile_submitted'::public.expert_status;
    end if;
    -- Never let a self-insert claim an inviter.
    new.invited_by := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_expert_profiles_status_insert_guard on public.expert_profiles;
create trigger trg_expert_profiles_status_insert_guard
  before insert on public.expert_profiles
  for each row execute function private.guard_expert_status_insert();

commit;

-- ===== 0007_expert_busy_ranges.sql =====
-- ============================================================================
-- Booking needs real availability: a client picking a slot for an expert must
-- know which times are already taken. But `sessions` RLS restricts SELECT to
-- participants + admin, so a client browsing another client's expert can't
-- query existing bookings directly (correctly — that would leak who else is
-- meeting the expert, at what price, etc).
--
-- This adds a SECURITY DEFINER function that returns ONLY start/end
-- timestamps for an expert's scheduled sessions in a window — no client
-- identity, title, or amount. That's the minimum information needed to avoid
-- double-booking, and is intentionally public among authenticated users
-- (same trust level as the expert's weekly availability rules, which are
-- already readable by any authenticated user per migration 0001).
-- ============================================================================

begin;

create or replace function public.get_expert_busy_ranges(
  p_expert_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select s.starts_at, s.ends_at
  from public.sessions s
  where s.expert_id = p_expert_id
    and s.status = 'scheduled'
    and s.starts_at < p_to
    and s.ends_at > p_from;
$$;

revoke execute on function public.get_expert_busy_ranges(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_expert_busy_ranges(uuid, timestamptz, timestamptz) to authenticated;

commit;

-- ===== 0008_prevent_double_booking.sql =====
-- ============================================================================
-- SECURITY/CORRECTNESS FIX: nothing in the schema stopped two overlapping
-- bookings for the same expert. RLS only checked "client owns this row" and
-- "expert is approved" — a stale UI (or two concurrent requests) could both
-- insert sessions for the same expert at the same time.
--
-- This is the authoritative guard: a BEFORE INSERT/UPDATE trigger rejects any
-- scheduled session whose [starts_at, ends_at) overlaps another scheduled
-- session for the same expert. The client-side availability picker is a UX
-- convenience; this is what actually prevents double-booking.
-- ============================================================================

begin;

create or replace function private.prevent_overlapping_bookings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'scheduled' and exists (
    select 1 from public.sessions s
    where s.expert_id = new.expert_id
      and s.status = 'scheduled'
      and s.id is distinct from new.id
      and s.starts_at < new.ends_at
      and s.ends_at > new.starts_at
  ) then
    raise exception 'This time slot is no longer available for this expert'
      using errcode = 'exclusion_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_sessions_no_overlap on public.sessions;
create trigger trg_sessions_no_overlap
  before insert or update on public.sessions
  for each row execute function private.prevent_overlapping_bookings();

commit;

-- ===== 0009_payments_phase2.sql =====
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

-- ===== 0010_fix_role_confusion.sql =====
-- ============================================================================
-- SECURITY FIX: an authenticated EXPERT could book a session with
-- themselves as the client. The sessions INSERT policy only checked
-- "client_id = your own uid" — it never verified the caller's actual role
-- is 'client'. Confirmed exploitable: an expert account successfully
-- inserted a session naming itself as client_id.
--
-- Root cause: role in this app is largely a UI/routing concept (which
-- dashboard shell to render), not an enforced identity fact at the data
-- layer. This migration makes "must actually be a client to book" a real
-- database-level rule, independent of what the frontend does.
-- ============================================================================

begin;

drop policy if exists "sessions_insert_own" on public.sessions;
drop policy if exists "Clients can book sessions with approved experts" on public.sessions;

create policy "sessions_insert_own"
  on public.sessions for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'client'
    )
  );

commit;

-- ===== 0011_inquiries.sql =====
-- Contact inquiries submitted from the public marketing pages.
--
-- Numbered into the migration sequence after the marketplace-backend merge.
-- (It was previously standalone to avoid colliding with 0001–0010.)

-- Idempotent; safe to re-run.

create table if not exists public.inquiries (
    id         uuid primary key default gen_random_uuid(),
    full_name  text not null check (char_length(full_name) between 1 and 200),
    email      text not null check (char_length(email) between 3 and 320),
    subject    text check (subject is null or char_length(subject) <= 300),
    message    text not null check (char_length(message) between 1 and 5000),
    source     text not null default 'platter',
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.inquiries enable row level security;

-- A public contact form must accept submissions from anonymous visitors.
-- The length checks above bound abuse; add rate limiting at the edge if spam
-- becomes a problem.
drop policy if exists "Anyone can submit an inquiry." on public.inquiries;
create policy "Anyone can submit an inquiry."
on public.inquiries for insert
with check (true);

-- Nobody can read inquiries back except admins. Without this, the open insert
-- policy above would otherwise pair with no select policy at all (fine), but
-- being explicit keeps intent obvious.
drop policy if exists "Admins can read inquiries." on public.inquiries;
create policy "Admins can read inquiries."
on public.inquiries for select
using (
    exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    )
);

create index if not exists inquiries_created_at_idx
    on public.inquiries (created_at desc);

-- ===== 0012_public_experts_view.sql =====
-- ============================================================================
-- Public expert directory.
--
-- 0002 correctly restricted `profiles` to authenticated users so the public
-- site cannot scrape emails and phone numbers. That also means /platter — a
-- public marketing page — reads zero rows and silently falls back to hardcoded
-- placeholder experts.
--
-- This view is the "tighten to a public view later" path that 0002's own
-- comment anticipated: it exposes only the columns a marketing listing needs,
-- for approved experts only.
--
-- Deliberately NOT security_invoker. The view is owned by postgres and so
-- reads the underlying tables with the owner's rights, bypassing their RLS.
-- That is the point: anon must not reach `profiles` directly, but must be able
-- to read this curated subset. Never add email, phone, or any other contact
-- column here — anon can read every row of this view.
-- ============================================================================

begin;

create or replace view public.public_experts as
  select
    p.id,
    p.full_name,
    e.professional_title,
    e.bio,
    e.location,
    e.avatar_url,
    e.specialties,
    e.years_experience,
    e.session_rate_inr
  from public.profiles p
  join public.expert_profiles e on e.profile_id = p.id
  where p.role = 'expert'
    and e.status = 'approved';

comment on view public.public_experts is
  'Public, anon-readable directory of approved experts. Safe columns only — never add email or phone.';

grant select on public.public_experts to anon, authenticated;

commit;

-- ===== 0013_payment_method_razorpay.sql =====
-- Real Razorpay Orders checkout (no Route). Kept in its own file because a new
-- enum value cannot be used in the same transaction that adds it.
alter type public.payment_method add value if not exists 'razorpay';

-- ===== 0014_harden_payments_and_bookings.sql =====
-- ============================================================================
-- SECURITY: payment + booking integrity.
--
-- Before this migration a signed-in client could, straight through PostgREST:
--   * book a session with any amount_inr (e.g. 1) — price was client-supplied;
--   * set sessions.payment_status = 'escrow_held' / 'released' on their own
--     session without paying;
--   * reassign client_id / expert_id on an existing session;
--   * flip a payments row to 'paid' for any non-UPI method, or change its amount.
-- Price and payment state are now server-authoritative.
--
-- "Privileged" below = service_role (auth.uid() is null) or an admin.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. sessions INSERT: price comes from the expert's rate, never the client.
-- ---------------------------------------------------------------------------
create or replace function private.sessions_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rate int;
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    select session_rate_inr into v_rate
      from public.expert_profiles where profile_id = new.expert_id;
    new.amount_inr := v_rate;
    new.payment_status := 'unpaid';
    new.status := 'scheduled';
    if new.client_id = new.expert_id then
      raise exception 'You cannot book a session with yourself';
    end if;
    if new.starts_at is null or new.starts_at < now() then
      raise exception 'Sessions must start in the future';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_sessions_before_insert on public.sessions;
create trigger trg_sessions_before_insert
  before insert on public.sessions
  for each row execute function private.sessions_before_insert();

-- ---------------------------------------------------------------------------
-- 2. sessions UPDATE: immutable money/identity columns; constrained status.
-- ---------------------------------------------------------------------------
create or replace function private.sessions_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or private.is_admin() then
    return new;
  end if;

  -- Writes made by another trigger (e.g. payments -> sessions.payment_status
  -- sync) arrive at depth > 1. A direct API update is always depth 1.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.client_id is distinct from old.client_id
     or new.expert_id is distinct from old.expert_id
     or new.amount_inr is distinct from old.amount_inr
     or new.payment_status is distinct from old.payment_status then
    raise exception 'Booking parties, price and payment state cannot be modified directly';
  end if;

  -- Only the expert can mark a session completed.
  if new.status::text = 'completed'
     and old.status::text is distinct from 'completed'
     and v_uid <> old.expert_id then
    raise exception 'Only the expert can mark a session completed';
  end if;

  return new;
end $$;

drop trigger if exists trg_sessions_before_update on public.sessions;
create trigger trg_sessions_before_update
  before update on public.sessions
  for each row execute function private.sessions_before_update();

-- ---------------------------------------------------------------------------
-- 3. payments: amount is the session's, 'paid' is set only by trusted paths,
--    and paid rows cannot be rolled back by participants.
-- ---------------------------------------------------------------------------
create or replace function private.payments_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_expert uuid;
  v_amount int;
  v_privileged boolean := (v_uid is null or private.is_admin());
begin
  select expert_id, amount_inr into v_expert, v_amount
    from public.sessions where id = new.session_id;

  if not v_privileged then
    if new.method::text not in ('upi_direct', 'razorpay') then
      raise exception 'Payment method % is not allowed', new.method;
    end if;
    -- Price is the session's price, full stop.
    new.amount_inr := v_amount;
    -- Razorpay identifiers are written only by our server after signature check.
    if tg_op = 'INSERT' then
      new.razorpay_order_id := null;
      new.razorpay_payment_id := null;
    else
      new.razorpay_order_id := old.razorpay_order_id;
      new.razorpay_payment_id := old.razorpay_payment_id;
      new.method := old.method;
      if old.status::text = 'paid' and new.status::text is distinct from 'paid' then
        raise exception 'A confirmed payment cannot be reverted';
      end if;
    end if;

    if new.status::text = 'paid'
       and (tg_op = 'INSERT' or old.status::text is distinct from 'paid') then
      -- The ONLY unprivileged path to 'paid': the expert confirming a UPI transfer.
      if not (new.method::text = 'upi_direct' and v_uid = v_expert) then
        raise exception 'Only a verified payment or the receiving expert can mark this paid';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_payments_guard_confirmation on public.payments;
drop trigger if exists trg_payments_before_write on public.payments;
create trigger trg_payments_before_write
  before insert or update on public.payments
  for each row execute function private.payments_before_write();

-- ---------------------------------------------------------------------------
-- 4. Derive sessions.payment_status from payments (single writer).
-- ---------------------------------------------------------------------------
create or replace function private.sync_session_payment_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text = 'paid' then
    update public.sessions
       set payment_status = (case when new.method::text = 'upi_direct'
                                  then 'released' else 'escrow_held' end)::public.session_payment_status
     where id = new.session_id
       and payment_status::text = 'unpaid';
  elsif new.status::text = 'refunded' then
    update public.sessions set payment_status = 'refunded' where id = new.session_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_payments_sync_session on public.payments;
create trigger trg_payments_sync_session
  after insert or update of status on public.payments
  for each row execute function private.sync_session_payment_status();

-- ---------------------------------------------------------------------------
-- 5. Webhook idempotency + lookup.
-- ---------------------------------------------------------------------------
create unique index if not exists payments_razorpay_order_uniq
  on public.payments (razorpay_order_id) where razorpay_order_id is not null;

commit;

-- ===== 0015_lock_down_profiles.sql =====
-- ============================================================================
-- SECURITY: profiles privilege escalation + PII exposure.
--
-- 1. The UPDATE policy on profiles was "id = auth.uid()" with no column limit,
--    so any signed-in user could `update profiles set role = 'admin'` on their
--    own row and gain admin access to every table guarded by private.is_admin().
--    The INSERT policy had the same gap (a self-inserted row could claim any role).
-- 2. SELECT was open to every authenticated user for every column, exposing
--    every user's email address.
--
-- Fix: role is immutable for non-admin callers (service_role is unaffected),
-- and email is no longer readable through the API. Names and roles remain
-- readable because booking, chat and session lists join on them.
-- ============================================================================

begin;

create or replace function private.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- auth.uid() is null for service_role / server-side callers (trusted).
  if (select auth.uid()) is null or private.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'client';
  elsif new.role is distinct from old.role then
    raise exception 'Role cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard_role on public.profiles;
create trigger trg_profiles_guard_role
  before insert or update on public.profiles
  for each row execute function private.guard_profile_role();

-- Column-level read access: everything except email.
revoke select on public.profiles from authenticated, anon;
grant select (id, full_name, role, created_at) on public.profiles to authenticated;

commit;
