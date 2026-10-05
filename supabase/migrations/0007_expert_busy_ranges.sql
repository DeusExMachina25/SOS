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
