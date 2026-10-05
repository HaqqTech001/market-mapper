-- Repair RLS for deployed installations that have the original coordination
-- policies but not the later global/rich-chat policy update.
-- RLS remains enabled; this grants only active users and authorized mission/team members.

alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "authorized channel read" on public.chat_channels;
create policy "authorized channel read" on public.chat_channels for select to authenticated
using (
 public.current_user_is_active() and (
  channel_type in ('general','announcements') or public.is_admin()
  or (mission_id is not null and public.is_mission_member(mission_id))
  or (team_id is not null and public.is_team_member(team_id))
 )
);

drop policy if exists "authorized channel create" on public.chat_channels;
create policy "authorized channel create" on public.chat_channels for insert to authenticated
with check (
 public.current_user_is_active() and (
  (channel_type='general' and mission_id is null and team_id is null)
  or public.is_admin()
  or (mission_id is not null and public.is_mission_member(mission_id))
  or (team_id is not null and public.is_team_member(team_id))
 )
);

drop policy if exists "authorized message read" on public.chat_messages;
create policy "authorized message read" on public.chat_messages for select to authenticated
using (
 public.current_user_is_active() and exists(
  select 1 from public.chat_channels c where c.id=chat_messages.channel_id and (
   c.channel_type in ('general','announcements') or public.is_admin()
   or (c.mission_id is not null and public.is_mission_member(c.mission_id))
   or (c.team_id is not null and public.is_team_member(c.team_id))
  )
 )
);

drop policy if exists "authorized message send" on public.chat_messages;
create policy "authorized message send" on public.chat_messages for insert to authenticated
with check (
 public.current_user_is_active() and sender_id=auth.uid() and exists(
  select 1 from public.chat_channels c where c.id=chat_messages.channel_id and (
   c.channel_type='general' or public.is_admin()
   or (c.mission_id is not null and public.is_mission_member(c.mission_id))
   or (c.team_id is not null and public.is_team_member(c.team_id))
  )
 )
);

drop policy if exists "admin moderate messages" on public.chat_messages;
create policy "admin moderate messages" on public.chat_messages for update to authenticated
using (public.current_user_is_active() and (sender_id=auth.uid() or public.is_admin()))
with check (public.current_user_is_active() and (sender_id=auth.uid() or public.is_admin()));

-- General is a singleton cloud channel. Mission channels remain membership-scoped.
insert into public.chat_channels(id,name,channel_type,created_at)
values('general','General Chat','general',now())
on conflict(id) do update set name=excluded.name,channel_type='general';

-- A recipient may read/update their notifications. Admins can do so for operations.
drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications for select to authenticated
using (recipient_id=auth.uid() or public.is_admin());
drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications for update to authenticated
using (recipient_id=auth.uid() or public.is_admin())
with check (recipient_id=auth.uid() or public.is_admin());
