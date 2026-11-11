-- Records which automatic emails have gone out, so each one is sent once.
--
-- A booking confirmation can be triggered more than once: the checkout
-- callback and the Razorpay webhook race each other, and an expert can tap
-- "confirm UPI" twice. The daily reminder job's runs can also overlap. Before
-- sending, the server claims a row here; a second claim for the same session
-- and kind finds the row taken and sends nothing.
--
-- Only the server (service role) reads or writes this table.

create table if not exists public.email_log (
  session_id uuid not null references public.sessions(id) on delete cascade,
  kind       text not null check (kind in ('booking_paid', 'session_reminder')),
  sent_at    timestamptz not null default now(),
  primary key (session_id, kind)
);

alter table public.email_log enable row level security;
-- No policies on purpose: signed-in users and visitors can't see or change it.
revoke all on public.email_log from anon, authenticated;

-- The reminder job looks for paid, scheduled sessions starting soon.
create index if not exists sessions_upcoming_idx
  on public.sessions (starts_at)
  where status = 'scheduled';
