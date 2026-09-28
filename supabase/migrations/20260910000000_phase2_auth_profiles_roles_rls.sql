-- ====================================================================
-- Market Mapper Phase 2: Production Supabase Database Migration
-- Auth, Profiles, Role Architecture, Audit Logging & Row Level Security
-- ====================================================================

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Approved Roles Enum
-- Strictly: mapper, team_lead, admin (no auditor or invented roles)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('mapper', 'team_lead', 'admin');
    END IF;
END$$;

-- 3. Public Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role app_role NOT NULL DEFAULT 'mapper',
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Teams & Membership Tables
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);

-- 5. Missions & Assignments Tables
CREATE TABLE IF NOT EXISTS public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mission_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'mapper',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.mission_area_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    boundary_geojson JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_members_user ON public.mission_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_members_mission ON public.mission_members(mission_id);

-- 6. Audit Logs Table (Privileged Role Changes, Deactivations)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_user_id);

-- 7. Authorization Helper Functions (SECURITY DEFINER with safe search_path)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
        'mapper'::app_role
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(
        (SELECT is_active FROM public.profiles WHERE id = auth.uid() LIMIT 1),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT (public.current_user_role() = 'admin'::app_role) AND public.current_user_is_active();
$$;

CREATE OR REPLACE FUNCTION public.is_team_lead()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT (public.current_user_role() = 'team_lead'::app_role) AND public.current_user_is_active();
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(target_team_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = target_team_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_mission_member(target_mission_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.mission_members
        WHERE mission_id = target_mission_id AND user_id = auth.uid()
    );
$$;

-- 8. Profile Auto-Creation Trigger on Auth User Creation
-- STRICT: New self-registered users are ALWAYS assigned role = 'mapper'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    input_name TEXT;
    input_phone TEXT;
BEGIN
    input_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    input_phone := NEW.raw_user_meta_data->>'phone';

    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        input_name,
        NEW.email,
        input_phone,
        'mapper'::app_role, -- STRICT: Server defaults to mapper, ignoring any client role claims
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists to ensure idempotent execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Secure Server-Side Function for Role Mutation (Admin only, audited)
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    target_user_id UUID,
    new_role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_actor_id UUID;
    v_old_role app_role;
    v_target_name TEXT;
BEGIN
    v_actor_id := auth.uid();

    -- 1. Check Caller is Active Admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only active administrators may update user roles.';
    END IF;

    -- 2. Prevent Accidental Self-Lockout (Admin demoting own role)
    IF v_actor_id = target_user_id AND new_role <> 'admin'::app_role THEN
        RAISE EXCEPTION 'Operation blocked: Administrators cannot demote their own account to prevent accidental lockout.';
    END IF;

    -- 3. Fetch Target User
    SELECT role, full_name INTO v_old_role, v_target_name
    FROM public.profiles
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for id %', target_user_id;
    END IF;

    -- 4. Apply Role Update
    UPDATE public.profiles
    SET role = new_role,
        updated_at = now()
    WHERE id = target_user_id;

    -- 5. Record Audit Log Entry
    INSERT INTO public.audit_logs (
        actor_user_id,
        target_user_id,
        action,
        old_value,
        new_value,
        metadata
    ) VALUES (
        v_actor_id,
        target_user_id,
        'role_changed',
        v_old_role::TEXT,
        new_role::TEXT,
        jsonb_build_object(
            'target_name', v_target_name,
            'timestamp', now()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', target_user_id,
        'old_role', v_old_role,
        'new_role', new_role
    );
END;
$$;

-- 10. Secure Server-Side Function for User Deactivation/Reactivation
CREATE OR REPLACE FUNCTION public.admin_set_user_active_status(
    target_user_id UUID,
    new_active_status boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_actor_id UUID;
    v_old_status boolean;
    v_target_name TEXT;
BEGIN
    v_actor_id := auth.uid();

    -- 1. Check Caller is Active Admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only active administrators may modify user account active status.';
    END IF;

    -- 2. Prevent Accidental Self-Lockout
    IF v_actor_id = target_user_id AND NOT new_active_status THEN
        RAISE EXCEPTION 'Operation blocked: Administrators cannot deactivate their own account.';
    END IF;

    -- 3. Fetch Target User
    SELECT is_active, full_name INTO v_old_status, v_target_name
    FROM public.profiles
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for id %', target_user_id;
    END IF;

    -- 4. Update Status
    UPDATE public.profiles
    SET is_active = new_active_status,
        updated_at = now()
    WHERE id = target_user_id;

    -- 5. Record Audit Log Entry
    INSERT INTO public.audit_logs (
        actor_user_id,
        target_user_id,
        action,
        old_value,
        new_value,
        metadata
    ) VALUES (
        v_actor_id,
        target_user_id,
        CASE WHEN new_active_status THEN 'user_reactivated' ELSE 'user_deactivated' END,
        v_old_status::TEXT,
        new_active_status::TEXT,
        jsonb_build_object(
            'target_name', v_target_name,
            'timestamp', now()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'target_user_id', target_user_id,
        'is_active', new_active_status
    );
END;
$$;

-- ====================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES — DENY BY DEFAULT
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_area_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------

-- Active Users can read own full profile
DROP POLICY IF EXISTS "Active users can view own profile" ON public.profiles;
CREATE POLICY "Active users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_admin());

-- Team members can view public operational profile projection of teammates
DROP POLICY IF EXISTS "Team members can view teammate profiles" ON public.profiles;
CREATE POLICY "Team members can view teammate profiles"
    ON public.profiles
    FOR SELECT
    USING (
        public.current_user_is_active() AND EXISTS (
            SELECT 1 FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
            WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
        )
    );

-- Users can update own profile name, avatar, and phone (CANNOT change role or is_active)
DROP POLICY IF EXISTS "Users can update own editable fields" ON public.profiles;
CREATE POLICY "Users can update own editable fields"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id AND public.current_user_is_active())
    WITH CHECK (
        auth.uid() = id
        -- Enforce that role and is_active cannot be modified directly by client
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
        AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Direct client inserts & deletes on profiles are blocked (handled by auth trigger / soft deactivation)
DROP POLICY IF EXISTS "Direct profile insert blocked" ON public.profiles;
CREATE POLICY "Direct profile insert blocked"
    ON public.profiles
    FOR INSERT
    WITH CHECK (false);

DROP POLICY IF EXISTS "Direct profile delete blocked" ON public.profiles;
CREATE POLICY "Direct profile delete blocked"
    ON public.profiles
    FOR DELETE
    USING (false);

-- --------------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- --------------------------------------------------------------------

-- Only Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());

-- Ordinary clients CANNOT insert, update, or delete audit logs directly
DROP POLICY IF EXISTS "Clients cannot write to audit logs" ON public.audit_logs;
CREATE POLICY "Clients cannot write to audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (false);

DROP POLICY IF EXISTS "Clients cannot modify audit logs" ON public.audit_logs;
CREATE POLICY "Clients cannot modify audit logs"
    ON public.audit_logs
    FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Clients cannot delete audit logs" ON public.audit_logs;
CREATE POLICY "Clients cannot delete audit logs"
    ON public.audit_logs
    FOR DELETE
    USING (false);

-- --------------------------------------------------------------------
-- TEAMS & MEMBERS POLICIES
-- --------------------------------------------------------------------

-- Admins have full access to teams
DROP POLICY IF EXISTS "Admins have full access to teams" ON public.teams;
CREATE POLICY "Admins have full access to teams"
    ON public.teams
    FOR ALL
    USING (public.is_admin());

-- Team Leads can view teams they lead
DROP POLICY IF EXISTS "Team leads can view assigned teams" ON public.teams;
CREATE POLICY "Team leads can view assigned teams"
    ON public.teams
    FOR SELECT
    USING (lead_id = auth.uid() AND public.current_user_is_active());

-- Mappers can view teams they are members of
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams;
CREATE POLICY "Members can view their teams"
    ON public.teams
    FOR SELECT
    USING (public.is_team_member(id) AND public.current_user_is_active());

-- Team Members table policies
DROP POLICY IF EXISTS "Admins have full access to team members" ON public.team_members;
CREATE POLICY "Admins have full access to team members"
    ON public.team_members
    FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Members can view team membership roster" ON public.team_members;
CREATE POLICY "Members can view team membership roster"
    ON public.team_members
    FOR SELECT
    USING (
        public.current_user_is_active() AND (
            public.is_team_member(team_id) OR
            EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_members.team_id AND t.lead_id = auth.uid())
        )
    );

-- --------------------------------------------------------------------
-- MISSIONS POLICIES
-- --------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins have full access to missions" ON public.missions;
CREATE POLICY "Admins have full access to missions"
    ON public.missions
    FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Team leads can view and coordinate missions" ON public.missions;
CREATE POLICY "Team leads can view and coordinate missions"
    ON public.missions
    FOR SELECT
    USING (public.is_team_lead());

DROP POLICY IF EXISTS "Mappers can view assigned missions" ON public.missions;
CREATE POLICY "Mappers can view assigned missions"
    ON public.missions
    FOR SELECT
    USING (public.is_mission_member(id) AND public.current_user_is_active());

-- Mission Members & Assignments policies
DROP POLICY IF EXISTS "Admins have full access to mission members" ON public.mission_members;
CREATE POLICY "Admins have full access to mission members"
    ON public.mission_members
    FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Members can view their mission membership" ON public.mission_members;
CREATE POLICY "Members can view their mission membership"
    ON public.mission_members
    FOR SELECT
    USING (public.is_mission_member(mission_id) AND public.current_user_is_active());

DROP POLICY IF EXISTS "Admins have full access to area assignments" ON public.mission_area_assignments;
CREATE POLICY "Admins have full access to area assignments"
    ON public.mission_area_assignments
    FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Mappers can view their area assignments" ON public.mission_area_assignments;
CREATE POLICY "Mappers can view their area assignments"
    ON public.mission_area_assignments
    FOR SELECT
    USING (user_id = auth.uid() AND public.current_user_is_active());
