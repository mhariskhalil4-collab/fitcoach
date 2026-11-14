-- FitCoach Complete Supabase Schema (Workspaces + Clients + RLS + Triggers)
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run

-- =========================================================================
-- 1. WORKSPACES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trainer_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clean up any existing duplicate workspace rows, keeping earliest
DELETE FROM public.workspaces
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.workspaces
    ORDER BY user_id, created_at ASC
);

-- Ensure user_id unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_user_id_unique'
    ) THEN
        ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspace" ON public.workspaces;

CREATE POLICY "Users can view their own workspace"
ON public.workspaces FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspace"
ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace"
ON public.workspaces FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspace"
ON public.workspaces FOR DELETE USING (auth.uid() = user_id);

-- Workspace Trigger on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspaces (user_id, trainer_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'trainer_name', ''), split_part(NEW.email, '@', 1), 'Coach')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();

-- =========================================================================
-- 2. CLIENTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    goal TEXT NOT NULL CHECK (goal IN ('lose weight', 'build muscle', 'get fit')),
    fitness_level TEXT NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    weight_kg NUMERIC(6,2),
    height_cm NUMERIC(6,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Clients RLS Policies: only trainers who own the parent workspace can access clients
DROP POLICY IF EXISTS "Trainers can view clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can insert clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can update clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can delete clients in their workspace" ON public.clients;

CREATE POLICY "Trainers can view clients in their workspace"
ON public.clients FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can insert clients in their workspace"
ON public.clients FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can update clients in their workspace"
ON public.clients FOR UPDATE
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can delete clients in their workspace"
ON public.clients FOR DELETE
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE user_id = auth.uid()
  )
);

-- =========================================================================
-- 3. SEED 3 SAMPLE CLIENTS (Sara, Ahmed, Bilal)
-- If a workspace already exists and has 0 clients, this will seed them.
-- =========================================================================
DO $$
DECLARE
    ws RECORD;
BEGIN
    FOR ws IN SELECT id FROM public.workspaces LOOP
        IF NOT EXISTS (SELECT 1 FROM public.clients WHERE workspace_id = ws.id) THEN
            INSERT INTO public.clients (workspace_id, name, age, gender, goal, fitness_level, weight_kg, height_cm, notes)
            VALUES
            (ws.id, 'Sara', 28, 'Female', 'lose weight', 'beginner', 68.0, 165.0, 'Focus on caloric deficit, high protein, and low-impact steady state cardio.'),
            (ws.id, 'Ahmed', 25, 'Male', 'build muscle', 'intermediate', 78.5, 180.0, 'Hypertrophy program: 4-day push/pull split with progressive overload.'),
            (ws.id, 'Bilal', 34, 'Male', 'get fit', 'beginner', 82.0, 176.0, 'General fitness, functional core strength, and stamina improvements.');
        END IF;
    END LOOP;
END $$;
