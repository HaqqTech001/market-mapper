-- Global team chat and rich-message foundation.
alter table public.chat_messages add column if not exists message_type text not null default 'text';
alter table public.chat_messages add column if not exists attachment jsonb;
alter table public.chat_messages add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists deleted_at timestamptz;

drop policy if exists "authorized channel read" on public.chat_channels;
create policy "authorized channel read" on public.chat_channels for select to authenticated using (
 public.current_user_is_active() and (
   channel_type in ('general','announcements') or public.is_admin()
   or (mission_id is not null and public.is_mission_member(mission_id))
   or (team_id is not null and public.is_team_member(team_id))
 )
);
drop policy if exists "authorized channel create" on public.chat_channels;
create policy "authorized channel create" on public.chat_channels for insert to authenticated with check (
 public.current_user_is_active() and (
   (channel_type='general' and mission_id is null and team_id is null)
   or public.is_admin()
   or (mission_id is not null and public.is_mission_member(mission_id))
   or (team_id is not null and public.is_team_member(team_id))
 )
);
drop policy if exists "authorized message read" on public.chat_messages;
create policy "authorized message read" on public.chat_messages for select to authenticated using (
 exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and (
   c.channel_type in ('general','announcements') or public.is_admin()
   or (c.mission_id is not null and public.is_mission_member(c.mission_id))
   or (c.team_id is not null and public.is_team_member(c.team_id))
 ))
);
drop policy if exists "authorized message send" on public.chat_messages;
create policy "authorized message send" on public.chat_messages for insert to authenticated with check (
 sender_id=auth.uid() and exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and (
   c.channel_type='general' or public.is_admin()
   or (c.mission_id is not null and public.is_mission_member(c.mission_id))
   or (c.team_id is not null and public.is_team_member(c.team_id))
 ))
);
create policy "admin moderate messages" on public.chat_messages for update to authenticated
 using (public.current_user_is_active() and (sender_id=auth.uid() or public.is_admin()))
 with check (public.current_user_is_active() and (sender_id=auth.uid() or public.is_admin()));

insert into public.chat_channels(id,name,channel_type,created_at)
values('general','General Chat','general',now())
on conflict(id) do update set name=excluded.name,channel_type='general';
