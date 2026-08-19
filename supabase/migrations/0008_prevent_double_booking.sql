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
