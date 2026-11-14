-- FitCoach Complete Supabase Schema (Workspaces, Clients, Exercises, Workout Plans, RLS & Seed Data)
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

DROP POLICY IF EXISTS "Trainers can view clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can insert clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can update clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can delete clients in their workspace" ON public.clients;

CREATE POLICY "Trainers can view clients in their workspace"
ON public.clients FOR SELECT
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can insert clients in their workspace"
ON public.clients FOR INSERT
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can update clients in their workspace"
ON public.clients FOR UPDATE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can delete clients in their workspace"
ON public.clients FOR DELETE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- =========================================================================
-- 3. EXERCISES TABLE & 12 SEEDED EXERCISES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    muscle_group TEXT NOT NULL,
    equipment TEXT NOT NULL,
    instructions TEXT
);

-- Enable RLS on exercises
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone authenticated can insert exercises" ON public.exercises;

CREATE POLICY "Anyone authenticated can view exercises"
ON public.exercises FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can insert exercises"
ON public.exercises FOR INSERT
TO authenticated
WITH CHECK (true);

-- Seed 12 Core Exercises
INSERT INTO public.exercises (name, muscle_group, equipment, instructions)
VALUES
  ('Squat', 'Quadriceps & Glutes', 'Barbell', 'Lower hips until thighs are parallel to the floor, keep chest up and core braced, drive through midfoot.'),
  ('Bench Press', 'Chest & Triceps', 'Barbell', 'Lie flat on bench, lower barbell to mid-chest with elbows at ~45 degrees, press upwards with control.'),
  ('Deadlift', 'Hamstrings & Back', 'Barbell', 'Stand with feet hip-width, hinge at hips, keep spine neutral and pull bar upward along shins to lockout.'),
  ('Overhead Press', 'Shoulders & Core', 'Barbell', 'Press bar vertically overhead until arms lock out, avoiding excessive backward arching.'),
  ('Barbell Row', 'Upper Back & Lats', 'Barbell', 'Hinge torso forward at 45 degrees, pull barbell toward lower ribcage squeezing shoulder blades, lower with control.'),
  ('Pull-up', 'Lats & Biceps', 'Pull-up Bar', 'Grip bar with overhand grip wider than shoulders, pull chest toward bar until chin clears bar, lower under control.'),
  ('Push-up', 'Chest & Core', 'Bodyweight', 'Assume rigid plank posture, lower chest to hover above floor, push back up while keeping core rigid.'),
  ('Plank', 'Core & Stability', 'Bodyweight', 'Hold rigid body alignment supported on forearms and toes, squeezing glutes and abdomen.'),
  ('Lunge', 'Quadriceps & Glutes', 'Dumbbells', 'Step forward, drop rear knee just above floor forming 90-degree angles with both legs, push back to start.'),
  ('Bicep Curl', 'Biceps', 'Dumbbells', 'With elbows pinned at sides, curl dumbbells toward shoulders, squeeze at contraction, lower under control.'),
  ('Tricep Dip', 'Triceps & Chest', 'Dip Station', 'Lower body bending elbows until upper arms are parallel to floor, drive down to full arm extension.'),
  ('Leg Press', 'Quadriceps & Glutes', 'Leg Press Machine', 'Place feet shoulder-width on sled, lower sled to 90 degrees knee flexion, press up smoothly without locking knees.')
ON CONFLICT (name) DO NOTHING;

-- =========================================================================
-- 4. WORKOUT PLANS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on workout_plans
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers can view workout plans in their workspace" ON public.workout_plans;
DROP POLICY IF EXISTS "Trainers can insert workout plans in their workspace" ON public.workout_plans;
DROP POLICY IF EXISTS "Trainers can update workout plans in their workspace" ON public.workout_plans;
DROP POLICY IF EXISTS "Trainers can delete workout plans in their workspace" ON public.workout_plans;

CREATE POLICY "Trainers can view workout plans in their workspace"
ON public.workout_plans FOR SELECT
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can insert workout plans in their workspace"
ON public.workout_plans FOR INSERT
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can update workout plans in their workspace"
ON public.workout_plans FOR UPDATE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can delete workout plans in their workspace"
ON public.workout_plans FOR DELETE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- =========================================================================
-- 5. WORKOUT PLAN ITEMS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workout_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    sets INTEGER NOT NULL DEFAULT 3,
    reps TEXT NOT NULL DEFAULT '10'
);

-- Enable RLS on workout_plan_items
ALTER TABLE public.workout_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers can view workout plan items in their workspace" ON public.workout_plan_items;
DROP POLICY IF EXISTS "Trainers can insert workout plan items in their workspace" ON public.workout_plan_items;
DROP POLICY IF EXISTS "Trainers can update workout plan items in their workspace" ON public.workout_plan_items;
DROP POLICY IF EXISTS "Trainers can delete workout plan items in their workspace" ON public.workout_plan_items;

CREATE POLICY "Trainers can view workout plan items in their workspace"
ON public.workout_plan_items FOR SELECT
USING (
  plan_id IN (
    SELECT id FROM public.workout_plans
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Trainers can insert workout plan items in their workspace"
ON public.workout_plan_items FOR INSERT
WITH CHECK (
  plan_id IN (
    SELECT id FROM public.workout_plans
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Trainers can update workout plan items in their workspace"
ON public.workout_plan_items FOR UPDATE
USING (
  plan_id IN (
    SELECT id FROM public.workout_plans
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Trainers can delete workout plan items in their workspace"
ON public.workout_plan_items FOR DELETE
USING (
  plan_id IN (
    SELECT id FROM public.workout_plans
    WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
  )
);
