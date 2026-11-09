-- Saved floorplans from the sketcher (/sketch).
--
-- Each plan belongs to the person who drew it and only they can see or change
-- it. The drawing itself is a JSON document (walls, rooms, doors, windows,
-- items, all in metres); the app checks its shape when reading it back.
-- Sharing a plan with an expert will come later, through a session's vault.

create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  kind       text not null check (kind in ('interior', 'garden', 'plot')),
  data       jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_owner_idx on public.plans (owner_id, updated_at desc);

alter table public.plans enable row level security;

drop policy if exists "Owners read their plans" on public.plans;
create policy "Owners read their plans"
  on public.plans for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners add plans" on public.plans;
create policy "Owners add plans"
  on public.plans for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners change their plans" on public.plans;
create policy "Owners change their plans"
  on public.plans for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners delete their plans" on public.plans;
create policy "Owners delete their plans"
  on public.plans for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.plans from anon;
grant select, insert, update, delete on public.plans to authenticated;

-- A cap so one account can't fill the database.
create or replace function private.guard_plan_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.plans where owner_id = new.owner_id) >= 200 then
    raise exception 'You can keep up to 200 saved plans';
  end if;
  return new;
end $$;

drop trigger if exists plans_limit on public.plans;
create trigger plans_limit before insert on public.plans
  for each row execute function private.guard_plan_count();

create or replace function private.touch_plan()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists plans_touch on public.plans;
create trigger plans_touch before update on public.plans
  for each row execute function private.touch_plan();
