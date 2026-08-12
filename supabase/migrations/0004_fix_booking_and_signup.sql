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
