-- ============================================================================
-- SECURITY: payment + booking integrity.
--
-- Before this migration a signed-in client could, straight through PostgREST:
--   * book a session with any amount_inr (e.g. 1) — price was client-supplied;
--   * set sessions.payment_status = 'escrow_held' / 'released' on their own
--     session without paying;
--   * reassign client_id / expert_id on an existing session;
--   * flip a payments row to 'paid' for any non-UPI method, or change its amount.
-- Price and payment state are now server-authoritative.
--
-- "Privileged" below = service_role (auth.uid() is null) or an admin.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. sessions INSERT: price comes from the expert's rate, never the client.
-- ---------------------------------------------------------------------------
create or replace function private.sessions_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rate int;
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    select session_rate_inr into v_rate
      from public.expert_profiles where profile_id = new.expert_id;
    new.amount_inr := v_rate;
    new.payment_status := 'unpaid';
    new.status := 'scheduled';
    if new.client_id = new.expert_id then
      raise exception 'You cannot book a session with yourself';
    end if;
    if new.starts_at is null or new.starts_at < now() then
      raise exception 'Sessions must start in the future';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_sessions_before_insert on public.sessions;
create trigger trg_sessions_before_insert
  before insert on public.sessions
  for each row execute function private.sessions_before_insert();

-- ---------------------------------------------------------------------------
-- 2. sessions UPDATE: immutable money/identity columns; constrained status.
-- ---------------------------------------------------------------------------
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

  -- Only the expert can mark a session completed.
  if new.status::text = 'completed'
     and old.status::text is distinct from 'completed'
     and v_uid <> old.expert_id then
    raise exception 'Only the expert can mark a session completed';
  end if;

  return new;
end $$;

drop trigger if exists trg_sessions_before_update on public.sessions;
create trigger trg_sessions_before_update
  before update on public.sessions
  for each row execute function private.sessions_before_update();

-- ---------------------------------------------------------------------------
-- 3. payments: amount is the session's, 'paid' is set only by trusted paths,
--    and paid rows cannot be rolled back by participants.
-- ---------------------------------------------------------------------------
create or replace function private.payments_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_expert uuid;
  v_amount int;
  v_privileged boolean := (v_uid is null or private.is_admin());
begin
  select expert_id, amount_inr into v_expert, v_amount
    from public.sessions where id = new.session_id;

  if not v_privileged then
    if new.method::text not in ('upi_direct', 'razorpay') then
      raise exception 'Payment method % is not allowed', new.method;
    end if;
    -- Price is the session's price, full stop.
    new.amount_inr := v_amount;
    -- Razorpay identifiers are written only by our server after signature check.
    if tg_op = 'INSERT' then
      new.razorpay_order_id := null;
      new.razorpay_payment_id := null;
    else
      new.razorpay_order_id := old.razorpay_order_id;
      new.razorpay_payment_id := old.razorpay_payment_id;
      new.method := old.method;
      if old.status::text = 'paid' and new.status::text is distinct from 'paid' then
        raise exception 'A confirmed payment cannot be reverted';
      end if;
    end if;

    if new.status::text = 'paid'
       and (tg_op = 'INSERT' or old.status::text is distinct from 'paid') then
      -- The ONLY unprivileged path to 'paid': the expert confirming a UPI transfer.
      if not (new.method::text = 'upi_direct' and v_uid = v_expert) then
        raise exception 'Only a verified payment or the receiving expert can mark this paid';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_payments_guard_confirmation on public.payments;
drop trigger if exists trg_payments_before_write on public.payments;
create trigger trg_payments_before_write
  before insert or update on public.payments
  for each row execute function private.payments_before_write();

-- ---------------------------------------------------------------------------
-- 4. Derive sessions.payment_status from payments (single writer).
-- ---------------------------------------------------------------------------
create or replace function private.sync_session_payment_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text = 'paid' then
    update public.sessions
       set payment_status = (case when new.method::text = 'upi_direct'
                                  then 'released' else 'escrow_held' end)::public.session_payment_status
     where id = new.session_id
       and payment_status::text = 'unpaid';
  elsif new.status::text = 'refunded' then
    update public.sessions set payment_status = 'refunded' where id = new.session_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_payments_sync_session on public.payments;
create trigger trg_payments_sync_session
  after insert or update of status on public.payments
  for each row execute function private.sync_session_payment_status();

-- ---------------------------------------------------------------------------
-- 5. Webhook idempotency + lookup.
-- ---------------------------------------------------------------------------
create unique index if not exists payments_razorpay_order_uniq
  on public.payments (razorpay_order_id) where razorpay_order_id is not null;

commit;
