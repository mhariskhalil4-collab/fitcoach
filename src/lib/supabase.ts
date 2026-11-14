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
