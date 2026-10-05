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
