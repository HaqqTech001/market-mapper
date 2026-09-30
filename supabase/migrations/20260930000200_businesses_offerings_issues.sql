-- Core field entities required by native outbox sync.
create table if not exists public.businesses (
  id text primary key,
  mission_id uuid not null references public.missions(id) on delete cascade,
  market_id uuid,
  area_id uuid,
  operational_label text not null,
  business_type text not null,
  physical_structure text,
  activity text not null,
  location_relationship text,
  name text,
  has_no_visible_name boolean not null default false,
  stall_number text,
  line_name text,
  row_block_floor text,
  row_line text,
  block text,
  floor text,
  primary_category_id text,
  location geometry(Point,4326) not null,
  location_accuracy double precision,
  location_source text,
  original_location geometry(Point,4326),
  relative_position text,
  captured_heading double precision,
  parent_path_session_id text,
  proposed_location geometry(Point,4326),
  stability text,
  remote_photo_path text,
  photo_declined boolean not null default false,
  photo_state text,
  phone text,
  owner_name text,
  notes text,
  completeness_score integer,
  status text not null default 'pending',
  revisit_needed boolean not null default false,
  revisit_reason text,
  revisit_notes text,
  trader_interaction_status text,
  version integer not null default 1,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_location_gix on public.businesses using gist(location);
create index if not exists businesses_mission_idx on public.businesses(mission_id);

create table if not exists public.business_offerings (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  catalogue_item_id text,
  pending_suggestion_id text,
  item_type text not null,
  item_name text,
  how_established text not null default 'observed',
  created_at timestamptz not null default now()
);
create index if not exists business_offerings_business_idx on public.business_offerings(business_id);

create table if not exists public.field_issues (
  id text primary key,
  mission_id uuid not null references public.missions(id) on delete cascade,
  area_id uuid,
  reported_by uuid not null references public.profiles(id),
  reported_by_role text,
  issue_type text not null,
  severity text not null default 'medium',
  title text not null,
  description text not null,
  location geometry(Point,4326),
  location_label text,
  photo_path text,
  status text not null default 'open',
  resolved_by uuid references public.profiles(id),
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists field_issues_mission_idx on public.field_issues(mission_id);
create index if not exists field_issues_location_gix on public.field_issues using gist(location);

alter table public.businesses enable row level security;
alter table public.business_offerings enable row level security;
alter table public.field_issues enable row level security;

create policy "mission members read businesses" on public.businesses for select using (
 public.is_admin() or exists(select 1 from public.mission_members mm where mm.mission_id=businesses.mission_id and mm.user_id=auth.uid())
);
create policy "mission members insert businesses" on public.businesses for insert with check (
 created_by=auth.uid() and (public.is_admin() or exists(select 1 from public.mission_members mm where mm.mission_id=businesses.mission_id and mm.user_id=auth.uid()))
);
create policy "mission members update businesses" on public.businesses for update using (
 public.is_admin() or exists(select 1 from public.mission_members mm where mm.mission_id=businesses.mission_id and mm.user_id=auth.uid())
);

create policy "mission members read offerings" on public.business_offerings for select using (
 public.is_admin() or exists(select 1 from public.businesses b join public.mission_members mm on mm.mission_id=b.mission_id where b.id=business_offerings.business_id and mm.user_id=auth.uid())
);
create policy "mission members write offerings" on public.business_offerings for all using (
 public.is_admin() or exists(select 1 from public.businesses b join public.mission_members mm on mm.mission_id=b.mission_id where b.id=business_offerings.business_id and mm.user_id=auth.uid())
) with check (
 public.is_admin() or exists(select 1 from public.businesses b join public.mission_members mm on mm.mission_id=b.mission_id where b.id=business_offerings.business_id and mm.user_id=auth.uid())
);

create policy "mission members read issues" on public.field_issues for select using (
 public.is_admin() or exists(select 1 from public.mission_members mm where mm.mission_id=field_issues.mission_id and mm.user_id=auth.uid())
);
create policy "mission members insert issues" on public.field_issues for insert with check (
 reported_by=auth.uid() and (public.is_admin() or exists(select 1 from public.mission_members mm where mm.mission_id=field_issues.mission_id and mm.user_id=auth.uid()))
);
create policy "mission members update issues" on public.field_issues for update using (
 public.is_admin() or exists(select 1 from public.mission_members mm where mm.mission_id=field_issues.mission_id and mm.user_id=auth.uid())
);
