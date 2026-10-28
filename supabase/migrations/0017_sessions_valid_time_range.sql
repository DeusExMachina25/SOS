-- A booking whose end is before (or equal to) its start was accepted. It
-- slipped past the double-booking overlap check (an inverted range overlaps
-- nothing the way a real one does) and made the call window close before it
-- opened. expert_time_off already had this check; sessions did not.
--
-- NOT VALID enforces the rule for every new or changed row without failing on
-- any historic row; run `alter table public.sessions validate constraint
-- sessions_valid_time_range;` once you've confirmed there are none.
alter table public.sessions
  drop constraint if exists sessions_valid_time_range;
alter table public.sessions
  add constraint sessions_valid_time_range
  check (starts_at is null or ends_at is null or ends_at > starts_at) not valid;
