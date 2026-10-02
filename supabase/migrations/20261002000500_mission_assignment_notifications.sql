-- Keep mission coordination writes admin-owned and create notifications automatically.
create or replace function public.notify_mission_member_added()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare mission_title text;
begin
 select title into mission_title from public.missions where id=new.mission_id;
 insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
 values('mission_'||new.id::text,new.user_id,'new_mission','New mapping mission',coalesce(mission_title,'A mapping mission')||' has been assigned to you.','mission',new.mission_id::text,false,now())
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists mission_member_notification on public.mission_members;
create trigger mission_member_notification after insert on public.mission_members for each row execute function public.notify_mission_member_added();

create or replace function public.notify_area_assignment()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
 values('area_'||new.id::text,new.user_id,'assignment_updated','Area assigned',coalesce(new.area_name,'A market area')||' was assigned to you.','assignment',new.id::text,false,now())
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists mission_area_notification on public.mission_area_assignments;
create trigger mission_area_notification after insert on public.mission_area_assignments for each row execute function public.notify_area_assignment();
