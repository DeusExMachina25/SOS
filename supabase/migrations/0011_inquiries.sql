-- Contact inquiries submitted from the public marketing pages.
--
-- Numbered into the migration sequence after the marketplace-backend merge.
-- (It was previously standalone to avoid colliding with 0001–0010.)

-- Idempotent; safe to re-run.

create table if not exists public.inquiries (
    id         uuid primary key default gen_random_uuid(),
    full_name  text not null check (char_length(full_name) between 1 and 200),
    email      text not null check (char_length(email) between 3 and 320),
    subject    text check (subject is null or char_length(subject) <= 300),
    message    text not null check (char_length(message) between 1 and 5000),
    source     text not null default 'platter',
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.inquiries enable row level security;

-- A public contact form must accept submissions from anonymous visitors.
-- The length checks above bound abuse; add rate limiting at the edge if spam
-- becomes a problem.
drop policy if exists "Anyone can submit an inquiry." on public.inquiries;
create policy "Anyone can submit an inquiry."
on public.inquiries for insert
with check (true);

-- Nobody can read inquiries back except admins. Without this, the open insert
-- policy above would otherwise pair with no select policy at all (fine), but
-- being explicit keeps intent obvious.
drop policy if exists "Admins can read inquiries." on public.inquiries;
create policy "Admins can read inquiries."
on public.inquiries for select
using (
    exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    )
);

create index if not exists inquiries_created_at_idx
    on public.inquiries (created_at desc);
