-- Secondary operational collaboration: offline-first coordination data.
create table if not exists public.revisits (
 id text primary key, mission_id uuid not null references public.missions(id) on delete cascade,
 entity_type text not null, entity_id text not null, entity_title text, reason text not null, notes text,
 status text not null default 'open', assigned_to uuid references public.profiles(id), flagged_by uuid not null references public.profiles(id),
 resolved_by uuid references public.profiles(id), resolution_notes text, resolved_at timestamptz, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.handovers (
 id text primary key, mission_id uuid not null references public.missions(id) on delete cascade, mission_title text,
 area_id text not null, area_name text, from_user_id uuid not null references public.profiles(id), from_user_name text,
 to_user_id uuid not null references public.profiles(id), to_user_name text, status text not null default 'pending',
 notes text, checklist jsonb not null default '{}'::jsonb, stalls_count_at_handover integer not null default 0,
 paths_count_at_handover integer not null default 0, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.area_reconciliations (
 id text primary key, mission_id uuid not null references public.missions(id) on delete cascade, mission_title text,
 area_id text not null, area_name text not null, reconciled_by uuid not null references public.profiles(id), reconciled_by_name text,
 stalls_counted integer not null default 0, paths_recorded integer not null default 0, unresolved_issues_count integer not null default 0,
 status text not null default 'pending_lead_review', review_notes text, reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists public.chat_channels (
 id text primary key, name text not null, channel_type text not null, team_id uuid references public.teams(id) on delete cascade,
 mission_id uuid references public.missions(id) on delete cascade, created_at timestamptz not null
);
create table if not exists public.chat_messages (
 id text primary key, channel_id text not null references public.chat_channels(id) on delete cascade,
 sender_id uuid not null references public.profiles(id), sender_name text not null, sender_avatar text, sender_role text not null,
 reply_to_id text references public.chat_messages(id), text text not null, is_pinned boolean not null default false,
 linked_business_id text, linked_business_name text, linked_path_id text, linked_path_name text, linked_issue_id text, linked_issue_title text,
 shared_location jsonb, created_at timestamptz not null
);
create table if not exists public.notifications (
 id text primary key, recipient_id uuid not null references public.profiles(id) on delete cascade, type text not null,
 title text not null, body text not null, entity_reference_type text, entity_reference_id text,
 is_read boolean not null default false, created_at timestamptz not null
);
create index if not exists idx_revisits_mission on public.revisits(mission_id,status);
create index if not exists idx_handovers_user on public.handovers(to_user_id,status);
create index if not exists idx_reconciliation_mission on public.area_reconciliations(mission_id,status);
create index if not exists idx_chat_channels_mission on public.chat_channels(mission_id);
create index if not exists idx_chat_messages_channel on public.chat_messages(channel_id,created_at);
create index if not exists idx_notifications_recipient on public.notifications(recipient_id,is_read,created_at desc);

alter table public.revisits enable row level security;
alter table public.handovers enable row level security;
alter table public.area_reconciliations enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

create policy "mission members revisits" on public.revisits for all to authenticated
 using (public.current_user_is_active() and (public.is_admin() or public.is_mission_member(mission_id)))
 with check (public.current_user_is_active() and (public.is_admin() or public.is_mission_member(mission_id)));
create policy "mission members handovers" on public.handovers for all to authenticated
 using (public.current_user_is_active() and (public.is_admin() or public.is_mission_member(mission_id)))
 with check (public.current_user_is_active() and (public.is_admin() or public.is_mission_member(mission_id)));
create policy "mission members reconciliation" on public.area_reconciliations for all to authenticated
 using (public.current_user_is_active() and (public.is_admin() or public.is_mission_member(mission_id)))
 with check (public.current_user_is_active() and (public.is_admin() or public.is_mission_member(mission_id)));
create policy "authorized channel read" on public.chat_channels for select to authenticated using (
 public.current_user_is_active() and (public.is_admin() or (mission_id is not null and public.is_mission_member(mission_id)) or (team_id is not null and public.is_team_member(team_id)))
);
create policy "authorized channel create" on public.chat_channels for insert to authenticated with check (
 public.current_user_is_active() and (public.is_admin() or (mission_id is not null and public.is_mission_member(mission_id)) or (team_id is not null and public.is_team_member(team_id)))
);
create policy "authorized message read" on public.chat_messages for select to authenticated using (
 exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and (public.is_admin() or (c.mission_id is not null and public.is_mission_member(c.mission_id)) or (c.team_id is not null and public.is_team_member(c.team_id))))
);
create policy "authorized message send" on public.chat_messages for insert to authenticated with check (
 sender_id=auth.uid() and exists(select 1 from public.chat_channels c where c.id=chat_messages.channel_id and (public.is_admin() or (c.mission_id is not null and public.is_mission_member(c.mission_id)) or (c.team_id is not null and public.is_team_member(c.team_id))))
);
create policy "own notifications read" on public.notifications for select to authenticated using (recipient_id=auth.uid() or public.is_admin());
create policy "own notifications update" on public.notifications for update to authenticated using (recipient_id=auth.uid() or public.is_admin()) with check (recipient_id=auth.uid() or public.is_admin());
create policy "authorized notifications create" on public.notifications for insert to authenticated with check (public.current_user_is_active());
