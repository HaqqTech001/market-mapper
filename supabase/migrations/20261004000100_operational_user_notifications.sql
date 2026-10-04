-- Central operational notifications for user-affecting admin actions.
-- Notifications are generated in the database so every client receives the same authoritative event.

create or replace function public.notify_profile_operational_change()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  if old.role is distinct from new.role then
    insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
    values(
      'role_'||new.id::text||'_'||extract(epoch from now())::bigint::text,
      new.id,
      'role_changed',
      'Your role has changed',
      case new.role
        when 'admin' then 'You are now an Admin. Your new permissions are available immediately.'
        when 'team_lead' then 'You are now a Team Lead. Your new mission permissions are available immediately.'
        else 'Your Market Mapper role is now Mapper.'
      end,
      'profile',new.id::text,false,now()
    );
  end if;

  if old.is_active is distinct from new.is_active then
    insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
    values(
      'account_'||new.id::text||'_'||extract(epoch from now())::bigint::text,
      new.id,
      'account_status_changed',
      case when new.is_active then 'Account reactivated' else 'Account deactivated' end,
      case when new.is_active then 'Your Market Mapper account has been reactivated.' else 'Your Market Mapper account has been deactivated by an administrator.' end,
      'account',new.id::text,false,now()
    );
  end if;
  return new;
end $$;

drop trigger if exists profile_operational_notification on public.profiles;
create trigger profile_operational_notification
after update of role,is_active on public.profiles
for each row execute function public.notify_profile_operational_change();

create or replace function public.notify_mission_member_removed()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare mission_title text;
begin
  select title into mission_title from public.missions where id=old.mission_id;
  insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
  values(
    'mission_removed_'||old.mission_id::text||'_'||old.user_id::text||'_'||extract(epoch from now())::bigint::text,
    old.user_id,'assignment_updated','Mission assignment removed',
    'You were removed from '||coalesce(mission_title,'a mapping mission')||'.',
    'mission',old.mission_id::text,false,now()
  );
  return old;
end $$;

drop trigger if exists mission_member_removed_notification on public.mission_members;
create trigger mission_member_removed_notification
after delete on public.mission_members
for each row execute function public.notify_mission_member_removed();

create or replace function public.notify_mission_status_change()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare member record;
begin
  if old.status is not distinct from new.status then return new; end if;
  for member in select user_id from public.mission_members where mission_id=new.id loop
    insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
    values(
      'mission_status_'||new.id::text||'_'||member.user_id::text||'_'||new.status::text||'_'||extract(epoch from now())::bigint::text,
      member.user_id,'mission_status_changed','Mission status updated',
      new.title||' is now '||replace(new.status::text,'_',' ')||'.',
      'mission',new.id::text,false,now()
    ) on conflict(id) do nothing;
  end loop;
  return new;
end $$;

drop trigger if exists mission_status_notification on public.missions;
create trigger mission_status_notification
after update of status on public.missions
for each row execute function public.notify_mission_status_change();

-- Notify a member when their role inside an existing mission changes. INSERT is
-- already covered by 20261002000500_mission_assignment_notifications.sql.
create or replace function public.notify_mission_member_role_change()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare mission_title text;
begin
  if old.role is not distinct from new.role then return new; end if;
  select title into mission_title from public.missions where id=new.mission_id;
  insert into public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
  values(
    'mission_role_'||new.mission_id::text||'_'||new.user_id::text||'_'||extract(epoch from now())::bigint::text,
    new.user_id,'team_update','Mission role updated',
    'Your role in '||coalesce(mission_title,'this mission')||' is now '||replace(new.role::text,'_',' ')||'.',
    'mission',new.mission_id::text,false,now()
  );
  return new;
end $$;

drop trigger if exists mission_member_role_notification on public.mission_members;
create trigger mission_member_role_notification
after update of role on public.mission_members
for each row execute function public.notify_mission_member_role_change();
