-- Native productionization: core operational spatial schema
create extension if not exists postgis;

create table if not exists public.market_paths (
  id text primary key,
  mission_id uuid not null references public.missions(id) on delete cascade,
  session_id text,
  name text not null,
  distance_meters double precision not null default 0,
  duration_seconds integer not null default 0,
  geometry geometry(LineString,4326),
  raw_points jsonb not null default '[]'::jsonb,
  is_verified boolean not null default false,
  version integer not null default 1,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists market_paths_geom_gix on public.market_paths using gist(geometry);
create index if not exists market_paths_mission_idx on public.market_paths(mission_id);

create table if not exists public.path_junctions (
  id text primary key,
  mission_id uuid references public.missions(id) on delete cascade,
  path_id text references public.market_paths(id) on delete set null,
  session_id text,
  operational_label text not null,
  display_name text,
  junction_type text not null,
  location geometry(Point,4326) not null,
  verification_state text not null default 'unverified',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists path_junctions_geom_gix on public.path_junctions using gist(location);

create table if not exists public.junction_branches (
  id text primary key,
  junction_id text not null references public.path_junctions(id) on delete cascade,
  label text not null,
  relative_side text,
  status text not null default 'unmapped' check (status in ('unmapped','in_progress','mapped','blocked')),
  connected_path_id text references public.market_paths(id) on delete set null,
  connected_target_junction_id text references public.path_junctions(id) on delete set null,
  notes text,
  mapped_at timestamptz,
  mapped_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists junction_branches_junction_idx on public.junction_branches(junction_id);
create index if not exists junction_branches_status_idx on public.junction_branches(status);

create table if not exists public.market_places (
  id text primary key,
  market_id uuid not null,
  mission_id uuid references public.missions(id) on delete set null,
  area_id uuid,
  operational_label text not null,
  display_name text,
  place_type text not null,
  location geometry(Point,4326) not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists market_places_geom_gix on public.market_places using gist(location);

alter table public.market_paths enable row level security;
alter table public.path_junctions enable row level security;
alter table public.junction_branches enable row level security;
alter table public.market_places enable row level security;

-- Mission members can work with records for their assigned mission. Admins retain operational access.
create policy "mission members read paths" on public.market_paths for select using (
  public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = market_paths.mission_id and mm.user_id = auth.uid())
);
create policy "mission members insert paths" on public.market_paths for insert with check (
  created_by = auth.uid() and (public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = market_paths.mission_id and mm.user_id = auth.uid()))
);
create policy "mission members update paths" on public.market_paths for update using (
  public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = market_paths.mission_id and mm.user_id = auth.uid())
);

create policy "mission members read junctions" on public.path_junctions for select using (
  public.is_admin() or mission_id is null or exists (select 1 from public.mission_members mm where mm.mission_id = path_junctions.mission_id and mm.user_id = auth.uid())
);
create policy "mission members insert junctions" on public.path_junctions for insert with check (
  created_by = auth.uid() and (public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = path_junctions.mission_id and mm.user_id = auth.uid()))
);
create policy "mission members update junctions" on public.path_junctions for update using (
  public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = path_junctions.mission_id and mm.user_id = auth.uid())
);

create policy "mission members read branches" on public.junction_branches for select using (
  public.is_admin() or exists (
    select 1 from public.path_junctions j join public.mission_members mm on mm.mission_id = j.mission_id
    where j.id = junction_branches.junction_id and mm.user_id = auth.uid()
  )
);
create policy "mission members insert branches" on public.junction_branches for insert with check (
  public.is_admin() or exists (
    select 1 from public.path_junctions j join public.mission_members mm on mm.mission_id = j.mission_id
    where j.id = junction_branches.junction_id and mm.user_id = auth.uid()
  )
);
create policy "mission members update branches" on public.junction_branches for update using (
  public.is_admin() or exists (
    select 1 from public.path_junctions j join public.mission_members mm on mm.mission_id = j.mission_id
    where j.id = junction_branches.junction_id and mm.user_id = auth.uid()
  )
);

-- Places are scoped by their mission where supplied. This migration intentionally avoids permissive anonymous policies.
create policy "authenticated read mission places" on public.market_places for select using (
  auth.uid() is not null and (public.is_admin() or mission_id is null or exists (select 1 from public.mission_members mm where mm.mission_id = market_places.mission_id and mm.user_id = auth.uid()))
);
create policy "authenticated insert mission places" on public.market_places for insert with check (
  auth.uid() is not null and (public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = market_places.mission_id and mm.user_id = auth.uid()))
);
create policy "authenticated update mission places" on public.market_places for update using (
  public.is_admin() or exists (select 1 from public.mission_members mm where mm.mission_id = market_places.mission_id and mm.user_id = auth.uid())
);
