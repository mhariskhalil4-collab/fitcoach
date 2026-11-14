import { useEffect, useState } from 'react'
import type { PublicPlanData } from '../lib/supabase'
import {
  Dumbbell,
  Salad,
  Flame,
  Calendar,
  User,
  CheckCircle2,
  Check,
  Share2,
  AlertCircle,
  ExternalLink,
  Target,
  Sparkles,
  Info
} from 'lucide-react'

interface PublicPlanViewProps {
  token: string
}

const SUPABASE_PROJECT_URL = 'https://qimrowpaebotfvtjizus.supabase.co'

const MEAL_TYPE_BADGES: Record<string, { label: string; badge: string }> = {
  breakfast: { label: 'Breakfast', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  lunch: { label: 'Lunch', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  dinner: { label: 'Dinner', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  snack: { label: 'Snack', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
}

export default function PublicPlanView({ token }: PublicPlanViewProps) {
  const [data, setData] = useState<PublicPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'workout' | 'nutrition'>('all')

  useEffect(() => {
    let isMounted = true

    async function fetchPlan() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `${SUPABASE_PROJECT_URL}/functions/v1/public-plan?token=${encodeURIComponent(token)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load plan')
        }

        if (isMounted) {
          setData(result)
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[PublicPlanView] Error fetching shared plan:', err)
          setError(err.message || 'Unable to load plan. Please verify the link.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (token) {
      fetchPlan()
    } else {
      setError('Invalid plan link. No token specified.')
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [token])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center animate-pulse shadow-xl shadow-emerald-500/20">
            <Dumbbell className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Loading Your Plan...</h3>
            <p className="text-xs text-slate-400 mt-1">Retrieving personalized workout and nutrition guidance.</p>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Plan Not Found</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'This plan link could not be located. It may have been updated or removed by the coach.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Visit FitCoach Home
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    )
  }

  const { client, workout_plan, nutrition_plan } = data

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Dumbbell className="h-4.5 w-4.5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">FitCoach</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Shared Client Plan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Client Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium mb-3">
                <Sparkles className="h-3 w-3" />
                Personalized Program
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {client?.name ? `${client.name}'s Fitness & Nutrition Plan` : 'Client Plan'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Here is your customized regimen crafted by your coach. Follow each routine and nutrition target to reach your fitness goals.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              {client?.goal && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-200">
                  <Target className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Goal: <strong className="text-white capitalize">{client.goal}</strong></span>
                </div>
              )}
              {client?.fitness_level && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-200">
                  <User className="h-3.5 w-3.5 text-teal-400" />
                  <span>Level: <strong className="text-white capitalize">{client.fitness_level}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Quick tab switcher if both plans exist */}
          {workout_plan && nutrition_plan && (
            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                All Sections
              </button>
              <button
                onClick={() => setActiveTab('workout')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'workout'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Dumbbell className="h-3.5 w-3.5" />
                Workout ({workout_plan.exercises.length})
              </button>
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'nutrition'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Salad className="h-3.5 w-3.5" />
                Nutrition ({nutrition_plan.daily_calories} kcal)
              </button>
            </div>
          )}
        </div>

        {/* SECTION 1: WORKOUT PLAN */}
        {(activeTab === 'all' || activeTab === 'workout') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Workout Plan</h2>
                  <p className="text-xs text-slate-400">Follow the sets and reps prescribed below</p>
                </div>
              </div>

              {workout_plan && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-emerald-400">
                  <Calendar className="h-3 w-3" />
                  {workout_plan.day}
                </span>
              )}
            </div>

            {!workout_plan ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center">
                <p className="text-xs text-slate-500">No workout plan is currently assigned.</p>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{workout_plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Schedule: <strong className="text-slate-300">{workout_plan.day}</strong> • {workout_plan.exercises.length} exercises
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                    {workout_plan.exercises.length} Exercises
                  </div>
                </div>

                {/* Exercises Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workout_plan.exercises.map((ex, idx) => (
                    <div
                      key={ex.id || idx}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-white">{ex.name}</h4>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20 shrink-0">
                            {ex.sets} sets × {ex.reps} reps
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                            {ex.muscle_group}
                          </span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                            {ex.equipment}
                          </span>
                        </div>

                        {ex.instructions && (
                          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            {ex.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION 2: NUTRITION PLAN */}
        {(activeTab === 'all' || activeTab === 'nutrition') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Salad className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Nutrition Plan</h2>
                  <p className="text-xs text-slate-400">Target calorie and meal macro recommendations</p>
                </div>
              </div>

              {nutrition_plan && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400">
                  <Flame className="h-3.5 w-3.5 fill-amber-400" />
                  {nutrition_plan.daily_calories.toLocaleString()} kcal / day
                </span>
              )}
            </div>

            {!nutrition_plan ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center">
                <p className="text-xs text-slate-500">No nutrition plan is currently assigned.</p>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{nutrition_plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target Calories: <strong className="text-white">{nutrition_plan.daily_calories.toLocaleString()} kcal/day</strong> • {nutrition_plan.meals.length} prescribed meals
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5" />
                    {nutrition_plan.daily_calories} kcal
                  </div>
                </div>

                {/* Meals List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nutrition_plan.meals.map((meal, idx) => {
                    const badgeInfo = MEAL_TYPE_BADGES[meal.meal_type] || {
                      label: meal.meal_type,
                      badge: 'bg-slate-800 text-slate-300 border-slate-700',
                    }

                    return (
                      <div
                        key={meal.id || idx}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeInfo.badge}`}>
                                  {badgeInfo.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {meal.portion}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white">{meal.name}</h4>
                            </div>

                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/20 shrink-0 flex items-center gap-1">
                              <Flame className="h-3 w-3" />
                              {meal.calories} kcal
                            </span>
                          </div>

                          {/* Macro breakdown */}
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-center">
                            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/40">
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Protein</p>
                              <p className="text-xs font-bold text-emerald-400">{meal.protein_g}g</p>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/40">
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Carbs</p>
                              <p className="text-xs font-bold text-cyan-400">{meal.carbs_g}g</p>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/40">
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Fat</p>
                              <p className="text-xs font-bold text-amber-400">{meal.fat_g}g</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Read-only Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-400">
          <Info className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            This shared plan is <strong>read-only</strong>. To request changes or track progress, please contact your trainer directly.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <p>© {new Date().getFullYear()} FitCoach</p>
          <span className="flex items-center gap-1 text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Verified Coaching Program
          </span>
        </div>
      </footer>
    </div>
  )
}
