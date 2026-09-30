-- Expand Phase 2 mission assignments for field-operational continuity.
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS area_id text;
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS area_name text;
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','in_progress','completed'));
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.mission_area_assignments ADD COLUMN IF NOT EXISTS notes text;
UPDATE public.mission_area_assignments SET assigned_to_user_id=user_id WHERE assigned_to_user_id IS NULL;
UPDATE public.mission_area_assignments SET area_id=id::text WHERE area_id IS NULL;
UPDATE public.mission_area_assignments SET area_name='Assigned Area' WHERE area_name IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mission_area_operational_identity ON public.mission_area_assignments(mission_id,area_id);
CREATE INDEX IF NOT EXISTS idx_mission_area_assignee ON public.mission_area_assignments(assigned_to_user_id);
