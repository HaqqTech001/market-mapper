-- Idempotent repair for operational notification production + realtime delivery.
create or replace function public.notify_mission_member_added()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare mission_title text;
begin
 select title into mission_title from public.missions where id=new.mission_id;
 insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
 values('mission_added_'||new.mission_id::text||'_'||new.user_id::text||'_'||extract(epoch from clock_timestamp())::bigint::text,
 new.user_id,'mission_assignment','New mission assignment',
 'You were added to '||coalesce(mission_title,'a mapping mission')||'.','mission',new.mission_id::text,false,now());
 return new;
end $$;
drop trigger if exists mission_member_notification on public.mission_members;
create trigger mission_member_notification after insert on public.mission_members
for each row execute function public.notify_mission_member_added();

create or replace function public.notify_mission_member_removed()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare mission_title text;
begin
 select title into mission_title from public.missions where id=old.mission_id;
 insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
 values('mission_removed_'||old.mission_id::text||'_'||old.user_id::text||'_'||extract(epoch from clock_timestamp())::bigint::text,
 old.user_id,'mission_assignment_removed','Mission assignment removed',
 'You were removed from '||coalesce(mission_title,'a mapping mission')||'.','mission',old.mission_id::text,false,now());
 return old;
end $$;
drop trigger if exists mission_member_removed_notification on public.mission_members;
create trigger mission_member_removed_notification after delete on public.mission_members
for each row execute function public.notify_mission_member_removed();

create or replace function public.notify_mission_status_change()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare member record;
begin
 if old.status is not distinct from new.status then return new; end if;
 for member in select user_id from public.mission_members where mission_id=new.id loop
  insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
  values('mission_status_'||new.id::text||'_'||member.user_id::text||'_'||extract(epoch from clock_timestamp())::bigint::text,
  member.user_id,'mission_status_changed','Mission status updated',
  new.title||' is now '||replace(new.status::text,'_',' ')||'.','mission',new.id::text,false,now());
 end loop;
 return new;
end $$;
drop trigger if exists mission_status_notification on public.missions;
create trigger mission_status_notification after update of status on public.missions
for each row execute function public.notify_mission_status_change();

-- Realtime publication is required for INSERT events to reach native clients.
do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
  alter publication supabase_realtime add table public.notifications;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages;
 end if;
end $$;
