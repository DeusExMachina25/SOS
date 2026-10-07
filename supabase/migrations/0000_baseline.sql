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
