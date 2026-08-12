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
