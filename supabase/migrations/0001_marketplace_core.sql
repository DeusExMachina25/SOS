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
