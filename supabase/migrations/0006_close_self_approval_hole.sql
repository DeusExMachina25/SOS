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
