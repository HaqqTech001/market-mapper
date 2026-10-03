-- Secure messenger membership, receipts, group metadata and channel-scoped media.
alter table public.chat_channels add column if not exists description text;
alter table public.chat_channels add column if not exists avatar_path text;
alter table public.chat_channels add column if not exists updated_at timestamptz not null default now();

create table if not exists public.chat_channel_members (
 channel_id text not null references public.chat_channels(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 member_role text not null default 'member' check(member_role in ('member','admin')),
 joined_at timestamptz not null default now(),
 primary key(channel_id,user_id)
);
alter table public.chat_channel_members enable row level security;

create or replace function public.can_access_chat_channel(p_channel_id text)
returns boolean language sql stable security definer set search_path=public as $$
 select public.current_user_is_active() and exists(
   select 1 from public.chat_channels c where c.id=p_channel_id and (
     public.is_admin() or c.channel_type in ('general','announcements')
     or (c.mission_id is not null and public.is_mission_member(c.mission_id))
     or (c.team_id is not null and public.is_team_member(c.team_id))
     or exists(select 1 from public.chat_channel_members m where m.channel_id=c.id and m.user_id=auth.uid())
   )
 );
$$;

create policy "channel members read memberships" on public.chat_channel_members for select to authenticated
using(public.can_access_chat_channel(channel_id));
create policy "admins manage channel memberships" on public.chat_channel_members for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create table if not exists public.chat_message_receipts (
 message_id text not null references public.chat_messages(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 delivered_at timestamptz,
 read_at timestamptz,
 primary key(message_id,user_id)
);
alter table public.chat_message_receipts enable row level security;
create policy "participants read message receipts" on public.chat_message_receipts for select to authenticated
using(exists(select 1 from public.chat_messages m where m.id=message_id and public.can_access_chat_channel(m.channel_id)));
create policy "users write own receipts" on public.chat_message_receipts for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.chat_messages m where m.id=message_id and public.can_access_chat_channel(m.channel_id)));
create policy "users update own receipts" on public.chat_message_receipts for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists "authenticated chat media read" on storage.objects;
drop policy if exists "authenticated own chat media insert" on storage.objects;
drop policy if exists "authenticated own chat media update" on storage.objects;
drop policy if exists "authenticated own chat media delete" on storage.objects;

-- New object convention: chat/<channel_id>/<owner_user_id>/<message_id>/<file>.
create policy "channel participant chat media read" on storage.objects for select to authenticated
using(bucket_id='field-media' and (storage.foldername(name))[1]='chat' and public.can_access_chat_channel((storage.foldername(name))[2]));
create policy "channel participant own chat media insert" on storage.objects for insert to authenticated
with check(bucket_id='field-media' and (storage.foldername(name))[1]='chat' and public.can_access_chat_channel((storage.foldername(name))[2]) and (storage.foldername(name))[3]=auth.uid()::text);
create policy "chat media owner or admin update" on storage.objects for update to authenticated
using(bucket_id='field-media' and (storage.foldername(name))[1]='chat' and ((storage.foldername(name))[3]=auth.uid()::text or public.is_admin()))
with check(bucket_id='field-media' and (storage.foldername(name))[1]='chat' and ((storage.foldername(name))[3]=auth.uid()::text or public.is_admin()));
create policy "chat media owner or admin delete" on storage.objects for delete to authenticated
using(bucket_id='field-media' and (storage.foldername(name))[1]='chat' and ((storage.foldername(name))[3]=auth.uid()::text or public.is_admin()));

create index if not exists idx_chat_receipts_message on public.chat_message_receipts(message_id);
create index if not exists idx_chat_members_user on public.chat_channel_members(user_id,channel_id);
