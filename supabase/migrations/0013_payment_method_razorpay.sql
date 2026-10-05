-- Real Razorpay Orders checkout (no Route). Kept in its own file because a new
-- enum value cannot be used in the same transaction that adds it.
alter type public.payment_method add value if not exists 'razorpay';
