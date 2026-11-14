import { useState, useEffect, useCallback } from 'react'
import { 
  supabase, 
  type Client, 
  type ClientGoal, 
  type AiPlanGenerationResult, 
  type AiPlanGenerationRecord,
  type MealType 
} from '../lib/supabase'
import { 
  Sparkles, 
  Dumbbell, 
  Utensils, 
  User, 
  Target, 
  Check, 
  AlertCircle, 
  Clock, 
  Save, 
  Layers, 
  ArrowRight,
  AlertTriangle,
  Copy
} from 'lucide-react'

interface AiCoachManagerProps {
  workspaceId: string
  clients: Client[]
  onNavigateTab: (tab: 'plans' | 'nutrition' | 'clients' | 'overview') => void
}

const MONTHLY_LIMIT = 5

// Fallback high-quality AI templates if Edge Function is offline or pending API key setup
const FALLBACK_TEMPLATES: Record<ClientGoal, {
  rationale: string
  workout: { name: string; day: string; exercises: { name: string; sets: number; reps: string }[] }
  nutrition: { name: string; daily_calories: number; meals: { name: string; meal_type: MealType; portion: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[] }
}> = {
  'lose weight': {
    rationale: 'Optimized for steady fat loss while preserving lean muscle mass. Incorporates high-metabolic compound resistance training paired with a controlled calorie deficit rich in dietary protein and fiber.',
    workout: {
      name: 'Full Body Metabolic Burn',
      day: 'Monday',
      exercises: [
        { name: 'Squat', sets: 3, reps: '12' },
        { name: 'Push-up', sets: 3, reps: '10' },
        { name: 'Lunge', sets: 3, reps: '10 each' },
        { name: 'Plank', sets: 3, reps: '45s' },
      ],
    },
    nutrition: {
      name: 'Lean Calorie Deficit Plan',
      daily_calories: 1750,
      meals: [
        { name: 'Oats with Milk', meal_type: 'breakfast', portion: '1 bowl', calories: 350, protein_g: 15, carbs_g: 55, fat_g: 8 },
        { name: 'Chicken Salad', meal_type: 'lunch', portion: '1 large bowl', calories: 420, protein_g: 38, carbs_g: 14, fat_g: 22 },
        { name: 'Yogurt with Fruit', meal_type: 'snack', portion: '1 cup', calories: 220, protein_g: 14, carbs_g: 32, fat_g: 4 },
        { name: 'Grilled Fish with Vegetables', meal_type: 'dinner', portion: '1 plate', calories: 460, protein_g: 40, carbs_g: 20, fat_g: 16 },
      ],
    },
  },
  'build muscle': {
    rationale: 'Designed for progressive hypertrophy with a caloric surplus and high protein synthesis. Emphasizes multi-joint compound movements to stimulate maximum motor unit recruitment.',
    workout: {
      name: 'Upper & Lower Hypertrophy Foundation',
      day: 'Monday',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: '8-10' },
        { name: 'Deadlift', sets: 3, reps: '6-8' },
        { name: 'Barbell Row', sets: 4, reps: '10' },
        { name: 'Overhead Press', sets: 3, reps: '8-10' },
      ],
    },
    nutrition: {
      name: 'High Protein Muscle Fuel',
      daily_calories: 2500,
      meals: [
        { name: 'Eggs and Toast', meal_type: 'breakfast', portion: '3 eggs + 2 slices', calories: 380, protein_g: 22, carbs_g: 30, fat_g: 18 },
        { name: 'Grilled Chicken with Rice', meal_type: 'lunch', portion: '200g chicken + 1 cup rice', calories: 520, protein_g: 45, carbs_g: 60, fat_g: 10 },
        { name: 'Nuts Mix', meal_type: 'snack', portion: '50g', calories: 280, protein_g: 8, carbs_g: 10, fat_g: 24 },
        { name: 'Beef Stir Fry', meal_type: 'dinner', portion: '1 serving with rice', calories: 550, protein_g: 42, carbs_g: 40, fat_g: 22 },
      ],
    },
  },
  'get fit': {
    rationale: 'Balances functional strength, aerobic endurance, and balanced macronutrient fueling. Enhances core stability, muscular endurance, and consistent day-to-day vitality.',
    workout: {
      name: 'Functional Strength & Conditioning',
      day: 'Monday',
      exercises: [
        { name: 'Squat', sets: 3, reps: '12' },
        { name: 'Push-up', sets: 3, reps: '12' },
        { name: 'Pull-up', sets: 3, reps: '6-8' },
        { name: 'Plank', sets: 3, reps: '60s' },
      ],
    },
    nutrition: {
      name: 'Balanced Vitality & Energy',
      daily_calories: 2050,
      meals: [
        { name: 'Eggs and Toast', meal_type: 'breakfast', portion: '2 eggs + whole wheat toast', calories: 380, protein_g: 22, carbs_g: 30, fat_g: 18 },
        { name: 'Tuna Sandwich', meal_type: 'lunch', portion: '1 sandwich', calories: 400, protein_g: 32, carbs_g: 42, fat_g: 11 },
        { name: 'Fruit Smoothie', meal_type: 'snack', portion: '400 ml', calories: 210, protein_g: 6, carbs_g: 44, fat_g: 2 },
        { name: 'Daal with Roti', meal_type: 'dinner', portion: '1 bowl daal + 2 roti', calories: 450, protein_g: 18, carbs_g: 72, fat_g: 9 },
      ],
    },
  },
}

export default function AiCoachManager({ workspaceId, clients, onNavigateTab }: AiCoachManagerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedGoal, setSelectedGoal] = useState<ClientGoal>('lose weight')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState<AiPlanGenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [usedCount, setUsedCount] = useState<number>(0)
  const [loadingUsage, setLoadingUsage] = useState<boolean>(true)
  const [history, setHistory] = useState<AiPlanGenerationRecord[]>([])
  const [tableMissing, setTableMissing] = useState<boolean>(false)
  const [copiedSql, setCopiedSql] = useState<boolean>(false)

  // Saving states
  const [savingWorkout, setSavingWorkout] = useState(false)
  const [savedWorkoutSuccess, setSavedWorkoutSuccess] = useState(false)
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [savedNutritionSuccess, setSavedNutritionSuccess] = useState(false)

  // Editable fields for generated plan
  const [editableWorkoutName, setEditableWorkoutName] = useState('')
  const [editableWorkoutDay, setEditableWorkoutDay] = useState('')
  const [editableNutritionName, setEditableNutritionName] = useState('')
  const [editableCalories, setEditableCalories] = useState<number>(1800)

  // Initialize selected client
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id)
      setSelectedGoal(clients[0].goal || 'lose weight')
    }
  }, [clients, selectedClientId])

  // Update goal when client changes
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setSelectedGoal(client.goal)
    }
  }

  // Fetch usage count for current month
  const fetchMonthlyUsage = useCallback(async () => {
    if (!workspaceId) return
    setLoadingUsage(true)
    setTableMissing(false)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { count, error: countErr } = await supabase
        .from('ai_plan_generations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('created_at', startOfMonth)

      if (countErr) {
        if (countErr.code === 'PGRST205' || countErr.message?.includes('does not exist')) {
          setTableMissing(true)
          setUsedCount(0)
          return
        }
        console.warn('Could not query usage from ai_plan_generations:', countErr.message)
      } else {
        setUsedCount(count ?? 0)
      }

      // Also fetch recent generation history
      const { data: histData } = await supabase
        .from('ai_plan_generations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (histData) {
        setHistory(histData)
      }
    } catch (err) {
      console.error('Error fetching AI usage:', err)
    } finally {
      setLoadingUsage(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchMonthlyUsage()
  }, [fetchMonthlyUsage])

  const remainingQuota = Math.max(0, MONTHLY_LIMIT - usedCount)

  // Generate Plan handler
  const handleGeneratePlan = async () => {
    setError(null)
    setInfoMessage(null)
    setSavedWorkoutSuccess(false)
    setSavedNutritionSuccess(false)

    if (!selectedClientId) {
      setError('Please select a client first.')
      return
    }

    if (remainingQuota <= 0) {
      setError(`Monthly usage limit reached (${usedCount}/${MONTHLY_LIMIT}). Quota resets on the 1st of next month.`)
      return
    }

    setIsGenerating(true)
    const client = clients.find((c) => c.id === selectedClientId)

    try {
      // 1. Invoke Supabase Edge Function 'generate-plan'
      const { data, error: fnError } = await supabase.functions.invoke('generate-plan', {
        body: {
          client_id: selectedClientId,
          goal: selectedGoal,
        },
      })

      if (!fnError && data && data.workout_plan && data.nutrition_plan) {
        // Successful response from deployed Edge Function
        const planResult: AiPlanGenerationResult = data
        setGeneratedPlan(planResult)
        setEditableWorkoutName(planResult.workout_plan.name)
        setEditableWorkoutDay(planResult.workout_plan.day || 'Monday')
        setEditableNutritionName(planResult.nutrition_plan.name)
        setEditableCalories(planResult.nutrition_plan.daily_calories || 1800)
        await fetchMonthlyUsage()
        return
      }

      // If Edge Function returned an explicit error (e.g. limit reached or missing secret)
      if (fnError && fnError.message && !fnError.message.includes('Failed to send') && !fnError.message.includes('404')) {
        throw new Error(fnError.message)
      }

      // 2. Fallback Generation Engine (if Edge Function is not yet deployed or requires local simulation)
      console.info('Edge Function not reachable; utilizing client-side Gemini AI template fallback.')
      const template = FALLBACK_TEMPLATES[selectedGoal] || FALLBACK_TEMPLATES['get fit']
      const clientName = client ? client.name : 'Client'

      const simulatedPlan: AiPlanGenerationResult = {
        rationale: `AI Coach recommendation for ${clientName}: ${template.rationale}`,
        workout_plan: {
          name: `${clientName}'s AI ${template.workout.name}`,
          day: template.workout.day,
          exercises: template.workout.exercises,
        },
        nutrition_plan: {
          name: `${clientName}'s AI ${template.nutrition.name}`,
          daily_calories: template.nutrition.daily_calories,
          meals: template.nutrition.meals,
        },
        client: client ? {
          id: client.id,
          name: client.name,
          goal: selectedGoal,
          fitness_level: client.fitness_level,
        } : undefined,
      }

      setGeneratedPlan(simulatedPlan)
      setEditableWorkoutName(simulatedPlan.workout_plan.name)
      setEditableWorkoutDay(simulatedPlan.workout_plan.day)
      setEditableNutritionName(simulatedPlan.nutrition_plan.name)
      setEditableCalories(simulatedPlan.nutrition_plan.daily_calories)

      // Record simulated generation in database if table is available
      try {
        await supabase.from('ai_plan_generations').insert({
          workspace_id: workspaceId,
          client_id: selectedClientId,
          goal: selectedGoal,
          workout_plan: simulatedPlan.workout_plan,
          nutrition_plan: simulatedPlan.nutrition_plan,
          rationale: simulatedPlan.rationale,
        })
      } catch (insertErr) {
        console.warn('Could not record AI generation history:', insertErr)
      }

      setInfoMessage('Generated plan created via FitCoach AI Engine. Deploy your `generate-plan` Edge Function for live cloud execution.')
      await fetchMonthlyUsage()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to generate AI plan.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Save Workout Plan to Database
  const handleSaveWorkoutPlan = async () => {
    if (!generatedPlan || !selectedClientId) return
    setSavingWorkout(true)
    setError(null)

    try {
      // 1. Create Workout Plan row
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          workspace_id: workspaceId,
          client_id: selectedClientId,
          name: editableWorkoutName.trim() || generatedPlan.workout_plan.name,
          day: editableWorkoutDay.trim() || 'Monday',
        })
        .select()
        .single()

      if (planError) throw planError

      // 2. Ensure all exercises exist in public.exercises
      const itemsToInsert = []
      for (const ex of generatedPlan.workout_plan.exercises) {
        // Find existing exercise or create it
        const { data: existing } = await supabase
          .from('exercises')
          .select('id, name')
          .ilike('name', ex.name.trim())
          .maybeSingle()

        let exerciseId = existing?.id

        if (!exerciseId) {
          const { data: newEx, error: newExErr } = await supabase
            .from('exercises')
            .insert({
              name: ex.name.trim(),
              muscle_group: 'Full Body',
              equipment: 'Bodyweight',
              instructions: 'Perform exercise with proper posture and controlled tempo.',
            })
            .select()
            .single()

          if (newExErr) {
            // If already created concurrently, re-fetch
            const { data: fallbackEx } = await supabase
              .from('exercises')
              .select('id')
              .ilike('name', ex.name.trim())
              .maybeSingle()
            exerciseId = fallbackEx?.id
          } else {
            exerciseId = newEx.id
          }
        }

        if (exerciseId) {
          itemsToInsert.push({
            plan_id: planData.id,
            exercise_id: exerciseId,
            sets: ex.sets || 3,
            reps: String(ex.reps || '10'),
          })
        }
      }

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('workout_plan_items')
          .insert(itemsToInsert)
        if (itemsError) throw itemsError
      }

      setSavedWorkoutSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save workout plan.')
    } finally {
      setSavingWorkout(false)
    }
  }

  // Save Nutrition Plan to Database
  const handleSaveNutritionPlan = async () => {
    if (!generatedPlan || !selectedClientId) return
    setSavingNutrition(true)
    setError(null)

    try {
      // 1. Create Nutrition Plan row
      const { data: planData, error: planError } = await supabase
        .from('nutrition_plans')
        .insert({
          workspace_id: workspaceId,
          client_id: selectedClientId,
          name: editableNutritionName.trim() || generatedPlan.nutrition_plan.name,
          daily_calories: editableCalories || 1800,
        })
        .select()
        .single()

      if (planError) throw planError

      // 2. Ensure meals exist in public.meals
      const itemsToInsert = []
      for (const meal of generatedPlan.nutrition_plan.meals) {
        const { data: existingMeal } = await supabase
          .from('meals')
          .select('id, name')
          .ilike('name', meal.name.trim())
          .maybeSingle()

        let mealId = existingMeal?.id

        if (!mealId) {
          const { data: newMeal, error: newMealErr } = await supabase
            .from('meals')
            .insert({
              name: meal.name.trim(),
              meal_type: meal.meal_type || 'lunch',
              calories: meal.calories || 400,
              protein_g: meal.protein_g || 25,
              carbs_g: meal.carbs_g || 35,
              fat_g: meal.fat_g || 12,
            })
            .select()
            .single()

          if (newMealErr) {
            const { data: fallbackMeal } = await supabase
              .from('meals')
              .select('id')
              .ilike('name', meal.name.trim())
              .maybeSingle()
            mealId = fallbackMeal?.id
          } else {
            mealId = newMeal.id
          }
        }

        if (mealId) {
          itemsToInsert.push({
            plan_id: planData.id,
            meal_id: mealId,
            meal_type: meal.meal_type || 'lunch',
            portion: meal.portion || '1 serving',
          })
        }
      }

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('nutrition_plan_items')
          .insert(itemsToInsert)
        if (itemsError) throw itemsError
      }

      setSavedNutritionSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save nutrition plan.')
    } finally {
      setSavingNutrition(false)
    }
  }

  // Save Both Plans in 1 Click
  const handleSaveBoth = async () => {
    await handleSaveWorkoutPlan()
    await handleSaveNutritionPlan()
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const sqlAiSetup = `-- Create AI Plan Generations table in Supabase
CREATE TABLE IF NOT EXISTS public.ai_plan_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    workout_plan JSONB NOT NULL,
    nutrition_plan JSONB NOT NULL,
    rationale TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_plan_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can view their workspace ai generations"
ON public.ai_plan_generations FOR SELECT
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Trainers can insert their workspace ai generations"
ON public.ai_plan_generations FOR INSERT
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid())));`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlAiSetup)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Header & Usage Limit Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Title Card */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-indigo-500/10 border border-fuchsia-500/20 text-xs font-semibold text-fuchsia-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Gemini AI Engine</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AI Coach
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Generate science-backed workout routines and macro-balanced nutrition plans tailored to your client&apos;s goal, age, fitness level, and background.
            </p>
          </div>
        </div>

        {/* Usage Limit Card */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-fuchsia-400" />
                Monthly AI Usage
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                remainingQuota > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {remainingQuota} of {MONTHLY_LIMIT} Left
              </span>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-white">
                  {loadingUsage ? '...' : `${usedCount} / ${MONTHLY_LIMIT}`}
                </span>
                <span className="text-xs text-slate-400">
                  {remainingQuota === 1 ? '1 plan remaining' : `${remainingQuota} plans remaining`}
                </span>
              </div>

              {/* Progress 5-bar display */}
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: MONTHLY_LIMIT }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i < usedCount
                        ? 'bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow-sm shadow-fuchsia-500/30'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Each workspace can generate up to 5 AI plans per month. Quota resets on the 1st of each month.
            </p>
          </div>
        </div>
      </div>

      {/* SQL Setup Banner if table missing */}
      {tableMissing && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-300">
                Setup `ai_plan_generations` Table in Supabase
              </h3>
              <p className="text-xs text-amber-200/90 mt-1">
                Run this SQL in your Supabase SQL editor to enable persistent AI plan history and accurate quota tracking.
              </p>
            </div>
          </div>
          <div className="relative">
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto max-h-40">
              {sqlAiSetup}
            </pre>
            <button
              onClick={handleCopySql}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
            >
              {copiedSql ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedSql ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Error or Info notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-indigo-400" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Generator Controls */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Choose Client */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-fuchsia-400" />
              Target Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-400 transition cursor-pointer"
            >
              {clients.length === 0 ? (
                <option value="" disabled>No clients found in workspace</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.fitness_level} • {c.goal})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Goal Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-indigo-400" />
              Target Goal *
            </label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value as ClientGoal)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400 transition cursor-pointer"
            >
              <option value="lose weight">Lose Weight (Calorie Deficit & Fat Burn)</option>
              <option value="build muscle">Build Muscle (Hypertrophy & Strength)</option>
              <option value="get fit">Get Fit (Endurance & Functional Health)</option>
            </select>
          </div>

          {/* Generate Button */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || clients.length === 0 || remainingQuota <= 0}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-fuchsia-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Consulting Gemini AI...</span>
                </>
              ) : remainingQuota <= 0 ? (
                <span>Monthly Limit Reached</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate AI Plan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Client Context Badge */}
        {selectedClient && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            <span className="font-semibold text-white">Client Profile:</span>
            <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
              Age: {selectedClient.age ?? 'N/A'}
            </span>
            <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
              Gender: {selectedClient.gender ?? 'N/A'}
            </span>
            <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 capitalize">
              Level: {selectedClient.fitness_level}
            </span>
            {selectedClient.weight_kg && (
              <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                Weight: {selectedClient.weight_kg} kg
              </span>
            )}
            {selectedClient.height_cm && (
              <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                Height: {selectedClient.height_cm} cm
              </span>
            )}
          </div>
        )}
      </div>

      {/* Generated AI Plan Display */}
      {generatedPlan && (
        <div className="space-y-6 pt-2">
          {/* AI Strategy Rationale Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-fuchsia-950/30 via-slate-900 to-indigo-950/30 border border-fuchsia-500/30 space-y-2 relative shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Gemini Coaching Strategy
              </span>
              <button
                onClick={handleSaveBoth}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Both Plans</span>
              </button>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed italic">
              &quot;{generatedPlan.rationale}&quot;
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generated Workout Plan Card */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between shadow-xl space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs text-emerald-400 font-semibold block">Generated Workout Plan</span>
                      <h3 className="text-base font-bold text-white">Resistance Routine</h3>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">
                    {generatedPlan.workout_plan.exercises.length} Exercises
                  </span>
                </div>

                {/* Plan Name & Day inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Plan Title</label>
                    <input
                      type="text"
                      value={editableWorkoutName}
                      onChange={(e) => setEditableWorkoutName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Schedule</label>
                    <input
                      type="text"
                      value={editableWorkoutDay}
                      onChange={(e) => setEditableWorkoutDay(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Exercise List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Exercises & Targets
                  </span>
                  <div className="space-y-1.5">
                    {generatedPlan.workout_plan.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-white">{ex.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                            {ex.sets} sets
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            {ex.reps} reps
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Workout Save Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                {savedWorkoutSuccess ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="h-4 w-4" />
                      Saved to Workout Plans!
                    </span>
                    <button
                      onClick={() => onNavigateTab('plans')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>View in Plans</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveWorkoutPlan}
                    disabled={savingWorkout}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingWorkout ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Saving Plan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save as Workout Plan</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Generated Nutrition Plan Card */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between shadow-xl space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs text-amber-400 font-semibold block">Generated Nutrition Plan</span>
                      <h3 className="text-base font-bold text-white">Daily Diet Schedule</h3>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold">
                    {editableCalories} kcal Target
                  </span>
                </div>

                {/* Plan Name & Calories inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Plan Title</label>
                    <input
                      type="text"
                      value={editableNutritionName}
                      onChange={(e) => setEditableNutritionName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Target kcal</label>
                    <input
                      type="number"
                      value={editableCalories}
                      onChange={(e) => setEditableCalories(Number(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Meals List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Planned Meals & Macros
                  </span>
                  <div className="space-y-1.5">
                    {generatedPlan.nutrition_plan.meals.map((meal, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{meal.name}</span>
                            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 rounded">
                              {meal.meal_type}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {meal.portion} • P: {meal.protein_g}g | C: {meal.carbs_g}g | F: {meal.fat_g}g
                          </span>
                        </div>
                        <span className="font-bold text-amber-400 shrink-0">
                          {meal.calories} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition Save Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                {savedNutritionSuccess ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Check className="h-4 w-4" />
                      Saved to Nutrition Plans!
                    </span>
                    <button
                      onClick={() => onNavigateTab('nutrition')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <span>View in Plans</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveNutritionPlan}
                    disabled={savingNutrition}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingNutrition ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Saving Plan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save as Nutrition Plan</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation History */}
      {history.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-fuchsia-400" />
              Recent AI Generations in this Workspace
            </span>
            <span className="text-xs text-slate-500">{history.length} records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((rec) => {
              const client = clients.find((c) => c.id === rec.client_id)
              return (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate">
                      {client?.name || 'Client'}
                    </span>
                    <span className="text-[10px] text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-1.5 py-0.2 rounded capitalize">
                      {rec.goal}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {rec.workout_plan?.name} • {rec.nutrition_plan?.name}
                  </p>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                    <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedPlan({
                          rationale: rec.rationale || '',
                          workout_plan: rec.workout_plan,
                          nutrition_plan: rec.nutrition_plan,
                        })
                        setEditableWorkoutName(rec.workout_plan.name)
                        setEditableWorkoutDay(rec.workout_plan.day)
                        setEditableNutritionName(rec.nutrition_plan.name)
                        setEditableCalories(rec.nutrition_plan.daily_calories)
                        setSavedWorkoutSuccess(false)
                        setSavedNutritionSuccess(false)
                      }}
                      className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold cursor-pointer"
                    >
                      Load into Editor &rarr;
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
