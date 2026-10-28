-- Support for the admin console (expert approval, payouts, refunds).
--
-- Admins could already approve experts (expert_profiles) and manage payout
-- rows (payment_transfers), but two things were missing:
--   * they could not READ payments, only participants could, so a payout row
--     could not be traced back to what was paid;
--   * a refund touches the payment, its payout rows and the session. Done as
--     separate client calls, a failure partway leaves inconsistent money
--     state, so each money action is one atomic database function.
--
-- The functions check private.is_admin() themselves and are executable only
-- by signed-in users; anyone else is refused inside the function.

-- A refunded payment's pending payouts must not stay "pending" forever.
alter type public.transfer_status add value if not exists 'cancelled';

-- Audit trail for manual payouts.
alter table public.payment_transfers add column if not exists payout_reference text;
alter table public.payment_transfers add column if not exists transferred_at timestamptz;

-- Read-only: updates go through the functions below.
drop policy if exists "Admins can view all payments" on public.payments;
create policy "Admins can view all payments"
  on public.payments for select to authenticated
  using (private.is_admin());

-- Record that a payout was sent to the expert (outside the app, e.g. UPI).
create or replace function public.admin_mark_transfer_paid(p_transfer_id uuid, p_reference text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Only an admin can do this';
  end if;

  update public.payment_transfers
     set status = 'transferred',
         payout_reference = nullif(btrim(p_reference), ''),
         transferred_at = now()
   where id = p_transfer_id
     and status::text in ('pending', 'skipped_route_not_active');

  if not found then
    raise exception 'That payout is not waiting to be sent';
  end if;
end $$;

-- Record a refund: payment -> refunded (a trigger flips the session's payment
-- status), unsent payouts -> cancelled, and a still-scheduled session ->
-- cancelled. This does NOT move money: the customer is refunded in Razorpay
-- or by UPI separately.
create or replace function public.admin_refund_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_payment_id uuid;
  v_status text;
begin
  if not private.is_admin() then
    raise exception 'Only an admin can do this';
  end if;

  perform 1 from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;

  select id, status::text into v_payment_id, v_status
    from public.payments where session_id = p_session_id for update;
  if v_payment_id is null or v_status <> 'paid' then
    raise exception 'Only a paid session can be refunded';
  end if;

  if exists (
    select 1 from public.payment_transfers
     where payment_id = v_payment_id and status::text = 'transferred'
  ) then
    raise exception 'Part of this payment was already paid out to the expert. Recover that first, then refund.';
  end if;

  update public.payment_transfers
     set status = 'cancelled'
   where payment_id = v_payment_id and status::text in ('pending', 'skipped_route_not_active');

  update public.payments set status = 'refunded' where id = v_payment_id;

  update public.sessions set status = 'cancelled'
   where id = p_session_id and status::text = 'scheduled';
end $$;

revoke execute on function public.admin_mark_transfer_paid(uuid, text) from public, anon;
revoke execute on function public.admin_refund_session(uuid) from public, anon;
grant execute on function public.admin_mark_transfer_paid(uuid, text) to authenticated;
grant execute on function public.admin_refund_session(uuid) to authenticated;
