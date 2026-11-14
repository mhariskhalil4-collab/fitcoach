-- Add share_token column to workout_plans and nutrition_plans
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS share_token TEXT DEFAULT encode(gen_random_bytes(12), 'hex');
UPDATE public.workout_plans SET share_token = encode(gen_random_bytes(12), 'hex') WHERE share_token IS NULL;
ALTER TABLE public.workout_plans ALTER COLUMN share_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_plans_share_token ON public.workout_plans(share_token);

ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS share_token TEXT DEFAULT encode(gen_random_bytes(12), 'hex');
UPDATE public.nutrition_plans SET share_token = encode(gen_random_bytes(12), 'hex') WHERE share_token IS NULL;
ALTER TABLE public.nutrition_plans ALTER COLUMN share_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_plans_share_token ON public.nutrition_plans(share_token);
