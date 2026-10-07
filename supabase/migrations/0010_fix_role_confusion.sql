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
