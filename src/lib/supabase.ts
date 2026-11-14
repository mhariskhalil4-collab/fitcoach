import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export interface Workspace {
  id: string
  user_id: string
  trainer_name: string
  created_at: string
}

export type ClientGoal = 'lose weight' | 'build muscle' | 'get fit'
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Client {
  id: string
  workspace_id: string
  name: string
  age: number | null
  gender: string | null
  goal: ClientGoal
  fitness_level: FitnessLevel
  weight_kg: number | null
  height_cm: number | null
  notes: string | null
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment: string
  instructions: string | null
}

export interface WorkoutPlanItem {
  id?: string
  plan_id?: string
  exercise_id: string
  sets: number
  reps: string
  exercise?: Exercise
}

export interface WorkoutPlan {
  id: string
  workspace_id: string
  client_id: string
  name: string
  day: string
  created_at: string
  client?: Client
  items?: (WorkoutPlanItem & { exercise?: Exercise })[]
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Meal {
  id: string
  name: string
  meal_type: MealType
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface NutritionPlanItem {
  id?: string
  plan_id?: string
  meal_id: string
  meal_type: MealType
  portion: string
  meal?: Meal
}

export interface NutritionPlan {
  id: string
  workspace_id: string
  client_id: string
  name: string
  daily_calories: number
  created_at: string
  client?: Client
  items?: (NutritionPlanItem & { meal?: Meal })[]
}

export interface AiGeneratedWorkoutPlan {
  name: string
  day: string
  exercises: {
    name: string
    sets: number
    reps: string
  }[]
}

export interface AiGeneratedNutritionPlan {
  name: string
  daily_calories: number
  meals: {
    name: string
    meal_type: MealType
    portion: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }[]
}

export interface AiPlanGenerationResult {
  rationale: string
  workout_plan: AiGeneratedWorkoutPlan
  nutrition_plan: AiGeneratedNutritionPlan
  client?: {
    id: string
    name: string
    goal: string
    fitness_level: string
  }
  usage?: {
    used: number
    limit: number
    remaining: number
  }
}

export interface AiPlanGenerationRecord {
  id: string
  workspace_id: string
  client_id: string
  goal: string
  workout_plan: AiGeneratedWorkoutPlan
  nutrition_plan: AiGeneratedNutritionPlan
  rationale: string | null
  created_at: string
}
