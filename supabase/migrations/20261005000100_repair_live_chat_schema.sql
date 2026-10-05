-- Idempotent repair for installations that are behind the native chat client.
alter table public.chat_channels add column if not exists description text;
alter table public.chat_channels add column if not exists avatar_path text;
alter table public.chat_channels add column if not exists updated_at timestamptz not null default now();

alter table public.chat_messages add column if not exists message_type text not null default 'text';
alter table public.chat_messages add column if not exists attachment jsonb;
alter table public.chat_messages add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists deleted_at timestamptz;

create table if not exists public.chat_message_receipts (
 message_id text not null references public.chat_messages(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 delivered_at timestamptz,
 read_at timestamptz,
 primary key(message_id,user_id)
);
alter table public.chat_message_receipts enable row level security;
drop policy if exists "participants read message receipts" on public.chat_message_receipts;
create policy "participants read message receipts" on public.chat_message_receipts for select to authenticated
using(exists(select 1 from public.chat_messages m join public.chat_channels c on c.id=m.channel_id where m.id=message_id and (
 public.is_admin() or c.channel_type in ('general','announcements')
 or (c.mission_id is not null and public.is_mission_member(c.mission_id))
 or (c.team_id is not null and public.is_team_member(c.team_id))
)));
drop policy if exists "users write own receipts" on public.chat_message_receipts;
create policy "users write own receipts" on public.chat_message_receipts for insert to authenticated
with check(user_id=auth.uid());
drop policy if exists "users update own receipts" on public.chat_message_receipts;
create policy "users update own receipts" on public.chat_message_receipts for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
create index if not exists idx_chat_receipts_message on public.chat_message_receipts(message_id);

-- Prevent new duplicate mission channels. Existing duplicates should be removed
-- by deleting/recreating the affected test mission, preserving safety for any
-- older duplicate channels that may already contain messages.
create unique index if not exists uq_chat_channels_one_mission
on public.chat_channels(mission_id) where mission_id is not null;
