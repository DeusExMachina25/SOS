-- Unread message counts.
--
-- Nothing recorded what a user had read, so there was no way to count unread
-- messages. This adds a per-user "last read" marker per conversation.
--
-- The marker lives in its own table, NOT as columns on chat_threads: a
-- participant can read every column of their threads, so columns would have
-- let each person see when the other last opened the chat (an accidental read
-- receipt). Here row-level security shows a user only their own markers.
--
-- Writes go through mark_thread_read(), which only ever moves the caller's own
-- marker forward, for a conversation they are in.
--
-- The marker is the created_at of the last message the user has seen, not
-- "now". Both sides of the unread comparison then come from the messages'
-- own clock, so it does not depend on the database timezone (created_at's
-- default is timezone('utc', now()), which is only right when the session
-- timezone is UTC) and a message that arrived a moment before the call but
-- was never displayed cannot be marked read by accident.

create table if not exists public.thread_reads (
  thread_id    uuid not null references public.chat_threads(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (thread_id, user_id)
);
create index if not exists thread_reads_user_idx on public.thread_reads (user_id);

alter table public.thread_reads enable row level security;

drop policy if exists "Users see only their own read markers" on public.thread_reads;
create policy "Users see only their own read markers"
  on public.thread_reads for select to authenticated
  using (user_id = (select auth.uid()));

-- Read-only through the API; the function below is the only writer.
revoke all on public.thread_reads from anon, authenticated;
grant select on public.thread_reads to authenticated;

-- Everything said before this migration counts as already read, so nobody
-- opens the app to a pile of old "unread" messages. A thread with no messages
-- yet gets the earliest possible marker, so its first message is unread.
insert into public.thread_reads (thread_id, user_id, last_read_at)
  select t.id, u.user_id,
         coalesce((select max(m.created_at) from public.messages m where m.thread_id = t.id), '-infinity'::timestamptz)
    from public.chat_threads t
    cross join lateral (values (t.client_id), (t.expert_id)) as u(user_id)
on conflict (thread_id, user_id) do nothing;

-- Marks a conversation read for the caller, up to the given message (or up to
-- the latest one when none is given). A conversation the caller is not part
-- of, or a message from a different conversation, is silently ignored, so
-- this cannot be used to probe which ids exist or to touch anyone else's
-- marker. The marker only ever moves forward.
create or replace function public.mark_thread_read(p_thread_id uuid, p_up_to_message_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_at timestamptz;
begin
  if v_me is null then
    return;
  end if;

  if not exists (
    select 1 from public.chat_threads t
     where t.id = p_thread_id and v_me in (t.client_id, t.expert_id)
  ) then
    return;
  end if;

  if p_up_to_message_id is null then
    select max(m.created_at) into v_at from public.messages m where m.thread_id = p_thread_id;
  else
    select m.created_at into v_at from public.messages m
     where m.id = p_up_to_message_id and m.thread_id = p_thread_id;
  end if;

  if v_at is null then
    return;
  end if;

  insert into public.thread_reads (thread_id, user_id, last_read_at)
    values (p_thread_id, v_me, v_at)
  on conflict (thread_id, user_id)
    do update set last_read_at = greatest(public.thread_reads.last_read_at, excluded.last_read_at);
end $$;

-- The caller's conversations that have unread messages (only those), with the
-- other person's name. SECURITY INVOKER: row-level security on chat_threads,
-- messages and profiles still decides what the caller can see.
create or replace function public.my_unread_threads()
returns table (thread_id uuid, counterpart_id uuid, counterpart_name text, unread int, latest_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select t.id,
         case when t.client_id = me.id then t.expert_id else t.client_id end,
         coalesce(p.full_name, 'Someone'),
         count(m.id)::int,
         max(m.created_at)
    from (select (select auth.uid()) as id) me
    join public.chat_threads t on me.id in (t.client_id, t.expert_id)
    join public.messages m
      on m.thread_id = t.id
     and m.sender_id <> me.id
    left join public.thread_reads r
      on r.thread_id = t.id and r.user_id = me.id
    left join public.profiles p
      on p.id = case when t.client_id = me.id then t.expert_id else t.client_id end
   where m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
   group by t.id, t.client_id, t.expert_id, p.full_name, me.id
$$;

revoke execute on function public.mark_thread_read(uuid, uuid) from public, anon;
revoke execute on function public.my_unread_threads() from public, anon;
grant execute on function public.mark_thread_read(uuid, uuid) to authenticated;
grant execute on function public.my_unread_threads() to authenticated;
