import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Dumbbell,
  Salad,
  Users,
  Flame,
  Calendar,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Clock
} from 'lucide-react'

interface DemoClient {
  id: string
  name: string
  goal: string
  fitness_level: string
  age: number
  gender: string
  weight_kg: number
  height_cm: number
  notes: string
}

interface DemoExerciseItem {
  id: string
  sets: number
  reps: string
  exercise: {
    name: string
    muscle_group: string
    equipment: string
  }
}

interface DemoWorkoutPlan {
  id: string
  client_id: string
  name: string
  day: string
  items: DemoExerciseItem[]
}

interface DemoMealItem {
  id: string
  portion: string
  meal_type: string
  meal: {
    name: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

interface DemoNutritionPlan {
  id: string
  client_id: string
  name: string
  daily_calories: number
  items: DemoMealItem[]
}

interface DemoProgressLog {
  id: string
  log_date: string
  weight_kg: number
  notes: string
}

const MEAL_TYPE_BADGES: Record<string, { label: string; badge: string }> = {
  breakfast: { label: 'Breakfast', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  lunch: { label: 'Lunch', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  dinner: { label: 'Dinner', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  snack: { label: 'Snack', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
}

const FALLBACK_CLIENTS: DemoClient[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000011',
    name: 'Sara',
    goal: 'lose weight',
    fitness_level: 'beginner',
    age: 28,
    gender: 'Female',
    weight_kg: 68.0,
    height_cm: 165,
    notes: 'Sedentary office routine, aiming to shed 5kg with calorie control and resistance training.',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000012',
    name: 'Ahmed',
    goal: 'build muscle',
    fitness_level: 'intermediate',
    age: 25,
    gender: 'Male',
    weight_kg: 74.5,
    height_cm: 178,
    notes: 'Focusing on upper/lower hypertrophy progression, progressive overload, and surplus calories.',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000013',
    name: 'Bilal',
    goal: 'get fit',
    fitness_level: 'intermediate',
    age: 32,
    gender: 'Male',
    weight_kg: 80.0,
    height_cm: 182,
    notes: 'Targeting athletic cardiovascular endurance, core strength, and overall functional fitness.',
  },
]

const FALLBACK_WORKOUT_PLANS: DemoWorkoutPlan[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000021',
    client_id: 'd0000000-0000-0000-0000-000000000011',
    name: "Sara's Fat-Loss Full Body Circuit",
    day: 'Monday, Wednesday, Friday',
    items: [
      { id: '1', sets: 3, reps: '12', exercise: { name: 'Squat', muscle_group: 'Quadriceps & Glutes', equipment: 'Barbell' } },
      { id: '2', sets: 3, reps: '10', exercise: { name: 'Push-up', muscle_group: 'Chest & Core', equipment: 'Bodyweight' } },
      { id: '3', sets: 3, reps: '10', exercise: { name: 'Lunge', muscle_group: 'Quadriceps & Glutes', equipment: 'Dumbbells' } },
      { id: '4', sets: 3, reps: '45s', exercise: { name: 'Plank', muscle_group: 'Core & Stability', equipment: 'Bodyweight' } },
    ],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000022',
    client_id: 'd0000000-0000-0000-0000-000000000012',
    name: "Ahmed's Hypertrophy Strength Routine",
    day: 'Tuesday, Thursday, Saturday',
    items: [
      { id: '5', sets: 4, reps: '8', exercise: { name: 'Bench Press', muscle_group: 'Chest & Triceps', equipment: 'Barbell' } },
      { id: '6', sets: 4, reps: '10', exercise: { name: 'Barbell Row', muscle_group: 'Upper Back & Lats', equipment: 'Barbell' } },
      { id: '7', sets: 3, reps: '10', exercise: { name: 'Overhead Press', muscle_group: 'Shoulders & Core', equipment: 'Barbell' } },
      { id: '8', sets: 3, reps: '12', exercise: { name: 'Bicep Curl', muscle_group: 'Biceps', equipment: 'Dumbbells' } },
    ],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000023',
    client_id: 'd0000000-0000-0000-0000-000000000013',
    name: "Bilal's Functional Conditioning Plan",
    day: 'Monday, Thursday, Saturday',
    items: [
      { id: '9', sets: 3, reps: '8', exercise: { name: 'Deadlift', muscle_group: 'Hamstrings & Back', equipment: 'Barbell' } },
      { id: '10', sets: 3, reps: '8', exercise: { name: 'Pull-up', muscle_group: 'Lats & Biceps', equipment: 'Pull-up Bar' } },
      { id: '11', sets: 3, reps: '12', exercise: { name: 'Leg Press', muscle_group: 'Quadriceps & Glutes', equipment: 'Leg Press Machine' } },
      { id: '12', sets: 3, reps: '60s', exercise: { name: 'Plank', muscle_group: 'Core & Stability', equipment: 'Bodyweight' } },
    ],
  },
]

const FALLBACK_NUTRITION_PLANS: DemoNutritionPlan[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000031',
    client_id: 'd0000000-0000-0000-0000-000000000011',
    name: "Sara's 1,800 kcal Balanced Deficit",
    daily_calories: 1800,
    items: [
      { id: '1', portion: '1 bowl', meal_type: 'breakfast', meal: { name: 'Oats with Milk', calories: 350, protein_g: 15, carbs_g: 55, fat_g: 8 } },
      { id: '2', portion: '1 large bowl', meal_type: 'lunch', meal: { name: 'Chicken Salad', calories: 420, protein_g: 38, carbs_g: 14, fat_g: 22 } },
      { id: '3', portion: '1 glass', meal_type: 'snack', meal: { name: 'Fruit Smoothie', calories: 210, protein_g: 6, carbs_g: 44, fat_g: 2 } },
      { id: '4', portion: '1 plate', meal_type: 'dinner', meal: { name: 'Grilled Fish with Vegetables', calories: 460, protein_g: 40, carbs_g: 20, fat_g: 16 } },
    ],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000032',
    client_id: 'd0000000-0000-0000-0000-000000000012',
    name: "Ahmed's 2,800 kcal Hypertrophy Fuel",
    daily_calories: 2800,
    items: [
      { id: '5', portion: '3 eggs + 2 slices toast', meal_type: 'breakfast', meal: { name: 'Eggs and Toast', calories: 380, protein_g: 22, carbs_g: 30, fat_g: 18 } },
      { id: '6', portion: '200g chicken + 1.5 cups rice', meal_type: 'lunch', meal: { name: 'Grilled Chicken with Rice', calories: 520, protein_g: 45, carbs_g: 60, fat_g: 10 } },
      { id: '7', portion: '50g mixed nuts', meal_type: 'snack', meal: { name: 'Nuts Mix', calories: 280, protein_g: 8, carbs_g: 10, fat_g: 24 } },
      { id: '8', portion: '1 large bowl', meal_type: 'dinner', meal: { name: 'Beef Stir Fry', calories: 550, protein_g: 42, carbs_g: 40, fat_g: 22 } },
    ],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000033',
    client_id: 'd0000000-0000-0000-0000-000000000013',
    name: "Bilal's 2,200 kcal Energy & Maintenance",
    daily_calories: 2200,
    items: [
      { id: '9', portion: '1 bowl', meal_type: 'breakfast', meal: { name: 'Oats with Milk', calories: 350, protein_g: 15, carbs_g: 55, fat_g: 8 } },
      { id: '10', portion: '1 sandwich', meal_type: 'lunch', meal: { name: 'Tuna Sandwich', calories: 400, protein_g: 32, carbs_g: 42, fat_g: 11 } },
      { id: '11', portion: '1 cup', meal_type: 'snack', meal: { name: 'Yogurt with Fruit', calories: 220, protein_g: 14, carbs_g: 32, fat_g: 4 } },
      { id: '12', portion: '1 bowl daal + 2 rotis', meal_type: 'dinner', meal: { name: 'Daal with Roti', calories: 450, protein_g: 18, carbs_g: 72, fat_g: 9 } },
    ],
  },
]

const FALLBACK_PROGRESS_LOGS: DemoProgressLog[] = [
  { id: '1', log_date: '2026-10-31', weight_kg: 70.0, notes: 'Initial assessment with Alex. Excited to start the fat-loss journey!' },
  { id: '2', log_date: '2026-11-07', weight_kg: 69.1, notes: 'Week 1 completed! Energy is great during workout sessions and sticking to 1,800 kcal.' },
  { id: '3', log_date: '2026-11-14', weight_kg: 68.0, notes: 'Week 2 progress: down 2.0 kg! Squat and push-up form feels noticeably stronger.' },
]

export default function DemoView() {
  const [trainerName] = useState('Alex Fitness')
  const [clients, setClients] = useState<DemoClient[]>(FALLBACK_CLIENTS)
  const [workoutPlans, setWorkoutPlans] = useState<DemoWorkoutPlan[]>(FALLBACK_WORKOUT_PLANS)
  const [nutritionPlans, setNutritionPlans] = useState<DemoNutritionPlan[]>(FALLBACK_NUTRITION_PLANS)
  const [progressLogs, setProgressLogs] = useState<DemoProgressLog[]>(FALLBACK_PROGRESS_LOGS)
  const [selectedClientId, setSelectedClientId] = useState<string>('d0000000-0000-0000-0000-000000000011')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadDemoData() {
      setLoading(true)
      try {
        // 1. Fetch Demo Clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, goal, fitness_level, age, gender, weight_kg, height_cm, notes')
          .eq('workspace_id', 'd0000000-0000-0000-0000-000000000001')
          .order('name', { ascending: true })

        if (clientsData && clientsData.length > 0) {
          setClients(clientsData as DemoClient[])
          // Default to Sara
          const sara = clientsData.find((c) => c.name.toLowerCase() === 'sara') || clientsData[0]
          setSelectedClientId(sara.id)
        }

        // 2. Fetch Demo Workout Plans with items and exercises
        const { data: wpData } = await supabase
          .from('workout_plans')
          .select(`
            id,
            client_id,
            name,
            day,
            items:workout_plan_items (
              id,
              sets,
              reps,
              exercise:exercises (
                name,
                muscle_group,
                equipment
              )
            )
          `)
          .eq('workspace_id', 'd0000000-0000-0000-0000-000000000001')

        if (wpData) {
          const formattedWp = wpData.map((wp: any) => ({
            ...wp,
            items: (wp.items || []).map((item: any) => ({
              ...item,
              exercise: Array.isArray(item.exercise) ? item.exercise[0] : item.exercise,
            })),
          }))
          setWorkoutPlans(formattedWp)
        }

        // 3. Fetch Demo Nutrition Plans with items and meals
        const { data: npData } = await supabase
          .from('nutrition_plans')
          .select(`
            id,
            client_id,
            name,
            daily_calories,
            items:nutrition_plan_items (
              id,
              portion,
              meal_type,
              meal:meals (
                name,
                calories,
                protein_g,
                carbs_g,
                fat_g
              )
            )
          `)
          .eq('workspace_id', 'd0000000-0000-0000-0000-000000000001')

        if (npData) {
          const formattedNp = npData.map((np: any) => ({
            ...np,
            items: (np.items || []).map((item: any) => ({
              ...item,
              meal: Array.isArray(item.meal) ? item.meal[0] : item.meal,
            })),
          }))
          setNutritionPlans(formattedNp)
        }

        // 4. Fetch Sara's Progress Logs
        const { data: logsData } = await supabase
          .from('progress_logs')
          .select('id, log_date, weight_kg, notes')
          .eq('workspace_id', 'd0000000-0000-0000-0000-000000000001')
          .order('log_date', { ascending: true })

        if (logsData) {
          setProgressLogs(logsData as DemoProgressLog[])
        }
      } catch (err) {
        console.error('[DemoView] Error loading demo data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDemoData()
  }, [])

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0]
  const currentWorkoutPlan = workoutPlans.find((wp) => wp.client_id === selectedClient?.id)
  const currentNutritionPlan = nutritionPlans.find((np) => np.client_id === selectedClient?.id)
  const isSara = selectedClient?.name.toLowerCase() === 'sara'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Dumbbell className="h-4.5 w-4.5 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">FitCoach</span>
            </a>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              Live Demo • No Login Needed
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900"
            >
              ← Back to Home
            </a>
            <a
              href="/?auth=signup"
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              Create Account
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Workspace Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-emerald-400 font-medium mb-3">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Demo Trainer Workspace (Read-Only)
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {trainerName}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Explore an active personal trainer workspace. Browse real clients, customized training programs, macro nutrition diets, and client weight loss analytics.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
                <p className="text-2xl font-extrabold text-white">{clients.length || 3}</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Clients</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{workoutPlans.length || 3}</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Workouts</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
                <p className="text-2xl font-extrabold text-teal-400">{nutritionPlans.length || 3}</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Diets</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Chooser Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Demo Clients ({clients.length})
            </h2>
            <span className="text-xs text-slate-400">Click a client to inspect their plans</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {clients.map((c) => {
              const isSelected = c.id === selectedClient?.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{c.name}</h3>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">
                        {c.gender}, {c.age} yrs • {c.weight_kg} kg
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        c.goal === 'lose weight'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : c.goal === 'build muscle'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}
                    >
                      {c.goal}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {c.notes}
                  </p>

                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active Client View
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Client Detailed Dossier */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Loading demo plans...</p>
          </div>
        ) : selectedClient && (
          <div className="space-y-8">
            {/* Client Profile Header Bar */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedClient.name}
                    <span className="text-xs font-normal text-slate-400">({selectedClient.gender}, {selectedClient.age} yrs)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target Goal: <strong className="text-emerald-400 capitalize">{selectedClient.goal}</strong> • Fitness Level: <strong className="text-white capitalize">{selectedClient.fitness_level}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/80">
                  Weight: <strong className="text-white">{selectedClient.weight_kg} kg</strong>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/80">
                  Height: <strong className="text-white">{selectedClient.height_cm} cm</strong>
                </span>
              </div>
            </div>

            {/* Grid of Workout Plan & Nutrition Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 1. WORKOUT PLAN */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                          Workout Program
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {currentWorkoutPlan?.name || `${selectedClient.name}'s Workout Plan`}
                        </h4>
                      </div>
                    </div>

                    {currentWorkoutPlan?.day && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3 text-emerald-400" />
                        {currentWorkoutPlan.day}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Prescribed training exercises with target sets and reps:
                  </p>

                  {/* Exercises list */}
                  <div className="space-y-2">
                    {currentWorkoutPlan?.items && currentWorkoutPlan.items.length > 0 ? (
                      currentWorkoutPlan.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {item.exercise?.name || 'Exercise'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {item.exercise?.muscle_group} • {item.exercise?.equipment}
                              </p>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20 shrink-0">
                            {item.sets} sets × {item.reps}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No exercises recorded.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Read-Only Routine
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {currentWorkoutPlan?.items?.length || 0} exercises assigned
                  </span>
                </div>
              </div>

              {/* 2. NUTRITION PLAN */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <Salad className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">
                          Nutrition Plan
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {currentNutritionPlan?.name || `${selectedClient.name}'s Nutrition Plan`}
                        </h4>
                      </div>
                    </div>

                    {currentNutritionPlan?.daily_calories && (
                      <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1 shrink-0">
                        <Flame className="h-3.5 w-3.5" />
                        {currentNutritionPlan.daily_calories.toLocaleString()} kcal
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Prescribed meals and macronutrient distributions:
                  </p>

                  {/* Meals list */}
                  <div className="space-y-2">
                    {currentNutritionPlan?.items && currentNutritionPlan.items.length > 0 ? (
                      currentNutritionPlan.items.map((item, idx) => {
                        const badgeInfo = MEAL_TYPE_BADGES[item.meal_type] || {
                          label: item.meal_type,
                          badge: 'bg-slate-800 text-slate-300 border-slate-700',
                        }
                        return (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full border ${badgeInfo.badge}`}>
                                  {badgeInfo.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {item.portion}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-white">
                                {item.meal?.name || 'Meal Item'}
                              </p>
                              {item.meal && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  P: <strong className="text-blue-400">{item.meal.protein_g}g</strong> • C: <strong className="text-emerald-400">{item.meal.carbs_g}g</strong> • F: <strong className="text-amber-400">{item.meal.fat_g}g</strong>
                                </p>
                              )}
                            </div>

                            <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/20 shrink-0">
                              {item.meal?.calories || 0} kcal
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic">No meals recorded.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    Read-Only Diet
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {currentNutritionPlan?.items?.length || 0} meals assigned
                  </span>
                </div>
              </div>
            </div>

            {/* 3. PROGRESS LOGS SECTION (HIGHLIGHT FOR SARA) */}
            {isSara && (
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Sara's Weight Loss Progress
                      </h4>
                      <p className="text-xs text-slate-400">
                        Logged weigh-ins and notes tracked by coach Alex
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <span>Net Change:</span>
                    <strong className="text-sm">-2.0 kg (Down 2.9%)</strong>
                  </div>
                </div>

                {/* Progress Visual Timeline Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {progressLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between gap-3 relative"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-emerald-400" />
                            {log.log_date}
                          </span>
                          <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                            Check-in #{idx + 1}
                          </span>
                        </div>

                        <div className="mt-2">
                          <p className="text-2xl font-black text-white">
                            {Number(log.weight_kg).toFixed(1)} <span className="text-xs font-normal text-slate-400">kg</span>
                          </p>
                        </div>

                        <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
                          "{log.notes}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Coach Alex Verified</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Read-Only Banner & Sign-up CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/20 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Ready to launch your own coaching workspace?
            </h3>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mt-1">
              Join personal trainers using FitCoach to build intelligent workouts, calculate precision nutrition plans, and track client transformations.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/?auth=signup"
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-sm font-medium transition flex items-center justify-center"
            >
              Back to Overview
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <p>© {new Date().getFullYear()} FitCoach • Public Read-Only Demo</p>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Live Demo Mode
          </span>
        </div>
      </footer>
    </div>
  )
}
