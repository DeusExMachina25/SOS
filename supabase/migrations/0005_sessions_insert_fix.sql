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
