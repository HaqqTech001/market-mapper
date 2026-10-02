-- Mission market context required by native mission hydration.
-- The current cloud schema stores operational spatial records against mission + market UUIDs,
-- but the original Phase 2 missions table did not include its market reference.
alter table public.missions
  add column if not exists market_id uuid,
  add column if not exists market_name text;

create index if not exists missions_market_id_idx on public.missions(market_id);

comment on column public.missions.market_id is
  'Stable market UUID shared with offline/native spatial records. No FK is applied until the cloud markets registry is introduced.';
comment on column public.missions.market_name is
  'Human-readable mission market snapshot for field/offline display.';
