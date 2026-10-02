-- Mission creation fields used by the native admin workflow.
alter table public.missions add column if not exists market_id text;
alter table public.missions add column if not exists market_name text;
alter table public.missions add column if not exists mission_type text not null default 'initial_mapping';
alter table public.missions add column if not exists priority text not null default 'normal';
alter table public.missions add column if not exists instructions text;
alter table public.missions add column if not exists assigned_starting_lat double precision;
alter table public.missions add column if not exists assigned_starting_lng double precision;
alter table public.missions add column if not exists starts_at timestamptz;
alter table public.missions add column if not exists due_at timestamptz;
create index if not exists idx_missions_market_id on public.missions(market_id);
