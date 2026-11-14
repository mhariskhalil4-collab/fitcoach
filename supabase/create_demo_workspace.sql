-- =========================================================================
-- DEMO WORKSPACE & CLIENTS SETUP FOR "ALEX FITNESS"
-- =========================================================================

-- 1. Allow user_id to be NULL on public.workspaces for the demo workspace
ALTER TABLE public.workspaces ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add is_demo column to public.workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_demo ON public.workspaces (is_demo) WHERE is_demo = true;

-- 3. Upsert the Demo Workspace "Alex Fitness"
INSERT INTO public.workspaces (id, user_id, trainer_name, is_demo)
VALUES ('d0000000-0000-0000-0000-000000000001', NULL, 'Alex Fitness', true)
ON CONFLICT (id) DO UPDATE 
SET trainer_name = 'Alex Fitness', is_demo = true;

-- 4. Enable Public Read-Only RLS Policies for Demo Data
DROP POLICY IF EXISTS "Anyone can view demo workspace" ON public.workspaces;
CREATE POLICY "Anyone can view demo workspace"
ON public.workspaces FOR SELECT
TO anon, authenticated
USING (is_demo = true);

DROP POLICY IF EXISTS "Anyone can view demo clients" ON public.clients;
CREATE POLICY "Anyone can view demo clients"
ON public.clients FOR SELECT
TO anon, authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE is_demo = true));

DROP POLICY IF EXISTS "Anyone can view demo workout plans" ON public.workout_plans;
CREATE POLICY "Anyone can view demo workout plans"
ON public.workout_plans FOR SELECT
TO anon, authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE is_demo = true));

DROP POLICY IF EXISTS "Anyone can view demo workout plan items" ON public.workout_plan_items;
CREATE POLICY "Anyone can view demo workout plan items"
ON public.workout_plan_items FOR SELECT
TO anon, authenticated
USING (plan_id IN (SELECT id FROM public.workout_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE is_demo = true)));

DROP POLICY IF EXISTS "Anyone can view demo nutrition plans" ON public.nutrition_plans;
CREATE POLICY "Anyone can view demo nutrition plans"
ON public.nutrition_plans FOR SELECT
TO anon, authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE is_demo = true));

DROP POLICY IF EXISTS "Anyone can view demo nutrition plan items" ON public.nutrition_plan_items;
CREATE POLICY "Anyone can view demo nutrition plan items"
ON public.nutrition_plan_items FOR SELECT
TO anon, authenticated
USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE is_demo = true)));

DROP POLICY IF EXISTS "Anyone can view demo progress logs" ON public.progress_logs;
CREATE POLICY "Anyone can view demo progress logs"
ON public.progress_logs FOR SELECT
TO anon, authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE is_demo = true));

DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;
CREATE POLICY "Anyone can view exercises"
ON public.exercises FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view meals" ON public.meals;
CREATE POLICY "Anyone can view meals"
ON public.meals FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Seed 3 Demo Clients: Sara, Ahmed, Bilal
INSERT INTO public.clients (id, workspace_id, name, age, gender, goal, fitness_level, weight_kg, height_cm, notes)
VALUES
  ('d0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'Sara', 28, 'Female', 'lose weight', 'beginner', 68.0, 165, 'Sedentary office routine, aiming to shed 5kg with calorie control and resistance training.'),
  ('d0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000001', 'Ahmed', 25, 'Male', 'build muscle', 'intermediate', 74.5, 178, 'Focusing on upper/lower hypertrophy progression, progressive overload, and surplus calories.'),
  ('d0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000001', 'Bilal', 32, 'Male', 'get fit', 'intermediate', 80.0, 182, 'Targeting athletic cardiovascular endurance, core strength, and overall functional fitness.')
ON CONFLICT (id) DO UPDATE SET
  workspace_id = EXCLUDED.workspace_id,
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  gender = EXCLUDED.gender,
  goal = EXCLUDED.goal,
  fitness_level = EXCLUDED.fitness_level,
  weight_kg = EXCLUDED.weight_kg,
  height_cm = EXCLUDED.height_cm,
  notes = EXCLUDED.notes;

-- 6. Seed Workout Plans for Each Client
-- Sara's Workout Plan
INSERT INTO public.workout_plans (id, workspace_id, client_id, name, day, share_token)
VALUES (
  'd0000000-0000-0000-0000-000000000021',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000011',
  'Sara''s Fat-Loss Full Body Circuit',
  'Monday, Wednesday, Friday',
  'demo-sara-workout'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  day = EXCLUDED.day,
  share_token = EXCLUDED.share_token;

-- Ahmed's Workout Plan
INSERT INTO public.workout_plans (id, workspace_id, client_id, name, day, share_token)
VALUES (
  'd0000000-0000-0000-0000-000000000022',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000012',
  'Ahmed''s Hypertrophy Strength Routine',
  'Tuesday, Thursday, Saturday',
  'demo-ahmed-workout'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  day = EXCLUDED.day,
  share_token = EXCLUDED.share_token;

-- Bilal's Workout Plan
INSERT INTO public.workout_plans (id, workspace_id, client_id, name, day, share_token)
VALUES (
  'd0000000-0000-0000-0000-000000000023',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000013',
  'Bilal''s Functional Conditioning Plan',
  'Monday, Thursday, Saturday',
  'demo-bilal-workout'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  day = EXCLUDED.day,
  share_token = EXCLUDED.share_token;

-- Clean existing items for these demo plans before re-inserting
DELETE FROM public.workout_plan_items 
WHERE plan_id IN (
  'd0000000-0000-0000-0000-000000000021',
  'd0000000-0000-0000-0000-000000000022',
  'd0000000-0000-0000-0000-000000000023'
);

-- Sara's Exercises
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000021', id, 3, '12' FROM public.exercises WHERE name = 'Squat' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000021', id, 3, '10' FROM public.exercises WHERE name = 'Push-up' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000021', id, 3, '10' FROM public.exercises WHERE name = 'Lunge' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000021', id, 3, '45s' FROM public.exercises WHERE name = 'Plank' LIMIT 1;

-- Ahmed's Exercises
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000022', id, 4, '8' FROM public.exercises WHERE name = 'Bench Press' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000022', id, 4, '10' FROM public.exercises WHERE name = 'Barbell Row' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000022', id, 3, '10' FROM public.exercises WHERE name = 'Overhead Press' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000022', id, 3, '12' FROM public.exercises WHERE name = 'Bicep Curl' LIMIT 1;

-- Bilal's Exercises
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000023', id, 3, '8' FROM public.exercises WHERE name = 'Deadlift' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000023', id, 3, '8' FROM public.exercises WHERE name = 'Pull-up' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000023', id, 3, '12' FROM public.exercises WHERE name = 'Leg Press' LIMIT 1;
INSERT INTO public.workout_plan_items (plan_id, exercise_id, sets, reps)
SELECT 'd0000000-0000-0000-0000-000000000023', id, 3, '60s' FROM public.exercises WHERE name = 'Plank' LIMIT 1;

-- 7. Seed Nutrition Plans for Each Client
-- Sara's Nutrition Plan
INSERT INTO public.nutrition_plans (id, workspace_id, client_id, name, daily_calories, share_token)
VALUES (
  'd0000000-0000-0000-0000-000000000031',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000011',
  'Sara''s 1,800 kcal Balanced Deficit',
  1800,
  'demo-sara-nutrition'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  daily_calories = EXCLUDED.daily_calories,
  share_token = EXCLUDED.share_token;

-- Ahmed's Nutrition Plan
INSERT INTO public.nutrition_plans (id, workspace_id, client_id, name, daily_calories, share_token)
VALUES (
  'd0000000-0000-0000-0000-000000000032',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000012',
  'Ahmed''s 2,800 kcal Hypertrophy Fuel',
  2800,
  'demo-ahmed-nutrition'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  daily_calories = EXCLUDED.daily_calories,
  share_token = EXCLUDED.share_token;

-- Bilal's Nutrition Plan
INSERT INTO public.nutrition_plans (id, workspace_id, client_id, name, daily_calories, share_token)
VALUES (
  'd0000000-0000-0000-0000-000000000033',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000013',
  'Bilal''s 2,200 kcal Energy & Maintenance',
  2200,
  'demo-bilal-nutrition'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  daily_calories = EXCLUDED.daily_calories,
  share_token = EXCLUDED.share_token;

-- Clean existing items for these demo nutrition plans
DELETE FROM public.nutrition_plan_items
WHERE plan_id IN (
  'd0000000-0000-0000-0000-000000000031',
  'd0000000-0000-0000-0000-000000000032',
  'd0000000-0000-0000-0000-000000000033'
);

-- Sara's Meals
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000031', id, 'breakfast', '1 bowl' FROM public.meals WHERE name = 'Oats with Milk' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000031', id, 'lunch', '1 large bowl' FROM public.meals WHERE name = 'Chicken Salad' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000031', id, 'snack', '1 glass' FROM public.meals WHERE name = 'Fruit Smoothie' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000031', id, 'dinner', '1 plate' FROM public.meals WHERE name = 'Grilled Fish with Vegetables' LIMIT 1;

-- Ahmed's Meals
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000032', id, 'breakfast', '3 eggs + 2 slices toast' FROM public.meals WHERE name = 'Eggs and Toast' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000032', id, 'lunch', '200g chicken + 1.5 cups rice' FROM public.meals WHERE name = 'Grilled Chicken with Rice' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000032', id, 'snack', '50g mixed nuts' FROM public.meals WHERE name = 'Nuts Mix' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000032', id, 'dinner', '1 large bowl' FROM public.meals WHERE name = 'Beef Stir Fry' LIMIT 1;

-- Bilal's Meals
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000033', id, 'breakfast', '1 bowl' FROM public.meals WHERE name = 'Oats with Milk' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000033', id, 'lunch', '1 sandwich' FROM public.meals WHERE name = 'Tuna Sandwich' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000033', id, 'snack', '1 cup' FROM public.meals WHERE name = 'Yogurt with Fruit' LIMIT 1;
INSERT INTO public.nutrition_plan_items (plan_id, meal_id, meal_type, portion)
SELECT 'd0000000-0000-0000-0000-000000000033', id, 'dinner', '1 bowl daal + 2 rotis' FROM public.meals WHERE name = 'Daal with Roti' LIMIT 1;

-- 8. Seed 3 Progress Logs for Sara
DELETE FROM public.progress_logs 
WHERE workspace_id = 'd0000000-0000-0000-0000-000000000001' 
  AND client_id = 'd0000000-0000-0000-0000-000000000011';

INSERT INTO public.progress_logs (workspace_id, client_id, log_date, weight_kg, notes)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000011',
    CURRENT_DATE - INTERVAL '14 days',
    70.0,
    'Initial assessment with Alex. Excited to start the fat-loss journey!'
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000011',
    CURRENT_DATE - INTERVAL '7 days',
    69.1,
    'Week 1 completed! Energy is great during workout sessions and sticking to 1,800 kcal.'
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000011',
    CURRENT_DATE,
    68.0,
    'Week 2 progress: down 2.0 kg! Squat and push-up form feels noticeably stronger.'
  );
