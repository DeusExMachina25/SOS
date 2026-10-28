-- Session status was only constrained for "completed" (expert-only). A
-- participant could still:
--   * flip a completed or cancelled session back to "scheduled";
--   * cancel a session that was already paid, leaving the money held against
--     a cancelled booking with no refund path;
--   * mark an unpaid session completed.
-- Finished bookings are now final, cancelling after payment is an admin
-- (refund) action, and only a paid session can be completed. Admin and
-- service-role writes, and writes made by other triggers, are unchanged.
create or replace function private.sessions_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or private.is_admin() then
    return new;
  end if;

  -- Writes made by another trigger (e.g. payments -> sessions.payment_status
  -- sync) arrive at depth > 1. A direct API update is always depth 1.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.client_id is distinct from old.client_id
     or new.expert_id is distinct from old.expert_id
     or new.amount_inr is distinct from old.amount_inr
     or new.payment_status is distinct from old.payment_status then
    raise exception 'Booking parties, price and payment state cannot be modified directly';
  end if;

  if new.status::text is distinct from old.status::text then
    if old.status::text in ('completed', 'cancelled') then
      raise exception 'A % session cannot be changed', old.status;
    end if;
    if new.status::text not in ('completed', 'cancelled') then
      raise exception 'Invalid session status change';
    end if;
    if new.status::text = 'cancelled' and old.payment_status::text <> 'unpaid' then
      raise exception 'A paid session can only be cancelled by an admin, because it needs a refund';
    end if;
    if new.status::text = 'completed' then
      if v_uid <> old.expert_id then
        raise exception 'Only the expert can mark a session completed';
      end if;
      if old.payment_status::text not in ('escrow_held', 'released') then
        raise exception 'Only a paid session can be marked completed';
      end if;
    end if;
  end if;

  return new;
end $$;
