-- Expert invitations.
--
-- An admin invites an expert: a placeholder expert_profiles row is created with
-- status 'invited' (created server-side with the service role). The expert
-- accepts, completes their profile, and submits it for review.
--
-- Two gaps in the approval guard made that impossible or unsafe:
--
--  1. Only an admin could change expert_profiles.status, so an invited expert
--     could not move themselves to 'profile_submitted'. They can now make that
--     one transition, on their own row, and no other.
--
--  2. An invited row holds placeholder values (empty title, rate 1) until the
--     expert fills it in. If it were approved before then, clients could book a
--     ₹1 "expert" with no profile. Nobody signed in, admin included, can now
--     approve a row straight from 'invited'. (The service role is still
--     trusted, e.g. for seeding.)

create or replace function private.guard_expert_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and (select auth.uid()) is not null
     and not private.is_admin() then
    if not (
      old.status = 'invited'
      and new.status = 'profile_submitted'
      and old.profile_id = (select auth.uid())
    ) then
      raise exception 'Only an admin can change expert approval status';
    end if;
  end if;

  if new.status = 'approved'
     and old.status = 'invited'
     and (select auth.uid()) is not null then
    raise exception 'This expert has not submitted a profile yet';
  end if;

  return new;
end $$;
