-- FitCoach Supabase Schema Setup
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run

-- 1. Create the workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trainer_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Turn ON Row Level Security (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies
-- Drop existing policies if any to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspace" ON public.workspaces;

-- Allow users to only SELECT their own workspace
CREATE POLICY "Users can view their own workspace"
ON public.workspaces
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own workspace
CREATE POLICY "Users can insert their own workspace"
ON public.workspaces
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own workspace
CREATE POLICY "Users can update their own workspace"
ON public.workspaces
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to DELETE their own workspace
CREATE POLICY "Users can delete their own workspace"
ON public.workspaces
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Automatic workspace creation trigger on user signup
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
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();
