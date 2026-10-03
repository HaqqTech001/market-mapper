-- Chat-call records let authorized participants join only calls linked to channels they can access.
create table if not exists public.chat_calls(
 id uuid primary key default gen_random_uuid(),
 channel_id text not null references public.chat_channels(id) on delete cascade,
 room_name text not null unique,
 call_type text not null check(call_type in ('audio','video')),
 started_by uuid not null references public.profiles(id),
 started_at timestamptz not null default now(),
 ended_at timestamptz,
 status text not null default 'active' check(status in ('active','ended'))
);
alter table public.chat_calls enable row level security;
create policy "channel participants read calls" on public.chat_calls for select to authenticated using(public.can_access_chat_channel(channel_id));
create policy "channel participants start calls" on public.chat_calls for insert to authenticated with check(started_by=auth.uid() and public.can_access_chat_channel(channel_id));
create policy "starter or admin ends calls" on public.chat_calls for update to authenticated using(started_by=auth.uid() or public.is_admin()) with check(started_by=auth.uid() or public.is_admin());
create index if not exists idx_chat_calls_channel_active on public.chat_calls(channel_id,status,started_at desc);
