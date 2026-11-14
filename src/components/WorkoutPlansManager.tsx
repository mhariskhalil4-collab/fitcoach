import { useState, useEffect, useCallback } from 'react'
import { supabase, type Client, type Exercise, type WorkoutPlan } from '../lib/supabase'
import WorkoutPlanFormModal from './WorkoutPlanFormModal'
import { 
  Dumbbell, 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  Layers,
  Share2
} from 'lucide-react'

interface WorkoutPlansManagerProps {
  workspaceId: string
  clients?: Client[]
}

const CORE_12_EXERCISES = [
  { name: 'Squat', muscle_group: 'Quadriceps & Glutes', equipment: 'Barbell', instructions: 'Lower hips until thighs are parallel to the floor, keep chest up and core braced, drive through midfoot.' },
  { name: 'Bench Press', muscle_group: 'Chest & Triceps', equipment: 'Barbell', instructions: 'Lie flat on bench, lower barbell to mid-chest with elbows at ~45 degrees, press upwards with control.' },
  { name: 'Deadlift', muscle_group: 'Hamstrings & Back', equipment: 'Barbell', instructions: 'Stand with feet hip-width, hinge at hips, keep spine neutral and pull bar upward along shins to lockout.' },
  { name: 'Overhead Press', muscle_group: 'Shoulders & Core', equipment: 'Barbell', instructions: 'Press bar vertically overhead until arms lock out, avoiding excessive backward arching.' },
  { name: 'Barbell Row', muscle_group: 'Upper Back & Lats', equipment: 'Barbell', instructions: 'Hinge torso forward at 45 degrees, pull barbell toward lower ribcage squeezing shoulder blades, lower with control.' },
  { name: 'Pull-up', muscle_group: 'Lats & Biceps', equipment: 'Pull-up Bar', instructions: 'Grip bar with overhand grip wider than shoulders, pull chest toward bar until chin clears bar, lower under control.' },
  { name: 'Push-up', muscle_group: 'Chest & Core', equipment: 'Bodyweight', instructions: 'Assume rigid plank posture, lower chest to hover above floor, push back up while keeping core rigid.' },
  { name: 'Plank', muscle_group: 'Core & Stability', equipment: 'Bodyweight', instructions: 'Hold rigid body alignment supported on forearms and toes, squeezing glutes and abdomen.' },
  { name: 'Lunge', muscle_group: 'Quadriceps & Glutes', equipment: 'Dumbbells', instructions: 'Step forward, drop rear knee just above floor forming 90-degree angles with both legs, push back to start.' },
  { name: 'Bicep Curl', muscle_group: 'Biceps', equipment: 'Dumbbells', instructions: 'With elbows pinned at sides, curl dumbbells toward shoulders, squeeze at contraction, lower under control.' },
  { name: 'Tricep Dip', muscle_group: 'Triceps & Chest', equipment: 'Dip Station', instructions: 'Lower body bending elbows until upper arms are parallel to floor, drive down to full arm extension.' },
  { name: 'Leg Press', muscle_group: 'Quadriceps & Glutes', equipment: 'Leg Press Machine', instructions: 'Place feet shoulder-width on sled, lower sled to 90 degrees knee flexion, press up smoothly without locking knees.' }
]

export default function WorkoutPlansManager({ workspaceId, clients }: WorkoutPlansManagerProps) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [clientsList, setClientsList] = useState<Client[]>(clients || [])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [selectedClientFilter, setSelectedClientFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined)
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null)

  // Fetch clients directly from Supabase for this workspace
  const fetchClients = useCallback(async () => {
    if (!workspaceId) return
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching clients for workout plans:', error)
        return
      }
      setClientsList(data || [])
    } catch (err) {
      console.error('Error fetching clients for workout plans:', err)
    }
  }, [workspaceId])

  // Sync if prop changes
  useEffect(() => {
    if (clients && clients.length > 0) {
      setClientsList(clients)
    }
  }, [clients])

  // Seed 12 exercises if table is empty
  const seedExercises = useCallback(async () => {
    try {
      const { error } = await supabase.from('exercises').upsert(CORE_12_EXERCISES, { onConflict: 'name' })
      if (error) throw error
      const { data: updatedEx } = await supabase.from('exercises').select('*').order('name')
      if (updatedEx) setExercises(updatedEx)
    } catch (err) {
      console.error('Error seeding exercises:', err)
    }
  }, [])

  // Fetch exercises library
  const fetchExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          setTableMissing(true)
          return
        }
        throw error
      }
      if (!data || data.length === 0) {
        await seedExercises()
      } else {
        setExercises(data)
      }
    } catch (err) {
      console.error('Error fetching exercises:', err)
    }
  }, [seedExercises])

  // Fetch plans with items and client details
  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setTableMissing(false)
    try {
      // 1. Fetch workout plans for this workspace
      const { data: plansData, error: plansError } = await supabase
        .from('workout_plans')
        .select(`
          id,
          workspace_id,
          client_id,
          name,
          day,
          share_token,
          created_at,
          client:clients (
            id,
            name,
            goal,
            fitness_level
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (plansError) {
        if (plansError.code === 'PGRST205' || plansError.message?.includes('does not exist')) {
          setTableMissing(true)
          setLoading(false)
          return
        }
        throw plansError
      }

      if (!plansData || plansData.length === 0) {
        setPlans([])
        setLoading(false)
        return
      }

      // 2. Fetch items for all plans
      const planIds = plansData.map((p) => p.id)
      const { data: itemsData, error: itemsError } = await supabase
        .from('workout_plan_items')
        .select(`
          id,
          plan_id,
          exercise_id,
          sets,
          reps,
          exercise:exercises (
            id,
            name,
            muscle_group,
            equipment,
            instructions
          )
        `)
        .in('plan_id', planIds)

      if (itemsError) throw itemsError

      // Group items by plan_id
      const plansWithItems: WorkoutPlan[] = plansData.map((p) => {
        const clientObj = Array.isArray(p.client) ? p.client[0] : p.client
        const planItems = (itemsData || [])
          .filter((item) => item.plan_id === p.id)
          .map((item) => ({
            ...item,
            exercise: Array.isArray(item.exercise) ? item.exercise[0] : item.exercise,
          }))

        return {
          id: p.id,
          workspace_id: p.workspace_id,
          client_id: p.client_id,
          name: p.name,
          day: p.day,
          share_token: p.share_token,
          created_at: p.created_at,
          client: clientObj as Client,
          items: planItems,
        }
      })

      setPlans(plansWithItems)
    } catch (err) {
      console.error('Error fetching workout plans:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchExercises()
    if (workspaceId) {
      fetchPlans()
      fetchClients()
    }
  }, [workspaceId, fetchExercises, fetchPlans, fetchClients])

  const handleSharePlan = (plan: WorkoutPlan) => {
    if (!plan.share_token) return
    const shareUrl = `${window.location.origin}/p/${plan.share_token}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
    }
    setCopiedPlanId(plan.id)
    setTimeout(() => {
      setCopiedPlanId((current) => (current === plan.id ? null : current))
    }, 2500)
  }

  const handleDeletePlan = async () => {
    if (!planToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planToDelete.id)

      if (error) throw error

      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id))
      setPlanToDelete(null)
    } catch (err) {
      console.error('Error deleting workout plan:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesClient = selectedClientFilter === 'all' || plan.client_id === selectedClientFilter
    const clientName = plan.client?.name || ''
    const matchesSearch = plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.day.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesClient && matchesSearch
  })

  const sqlSetupScript = `-- 1. Create exercises table & seed 12 exercises
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    muscle_group TEXT NOT NULL,
    equipment TEXT NOT NULL,
    instructions TEXT
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view exercises" ON public.exercises;
DROP POLICY IF EXISTS "Anyone authenticated can insert exercises" ON public.exercises;
CREATE POLICY "Anyone authenticated can view exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (true);

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

-- 2. Create workout_plans table & RLS
CREATE TABLE IF NOT EXISTS public.workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trainers can view workout plans in their workspace" ON public.workout_plans;
DROP POLICY IF EXISTS "Trainers can insert workout plans in their workspace" ON public.workout_plans;
DROP POLICY IF EXISTS "Trainers can delete workout plans in their workspace" ON public.workout_plans;
CREATE POLICY "Trainers can view workout plans in their workspace" ON public.workout_plans FOR SELECT USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Trainers can insert workout plans in their workspace" ON public.workout_plans FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
CREATE POLICY "Trainers can delete workout plans in their workspace" ON public.workout_plans FOR DELETE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

-- 3. Create workout_plan_items table & RLS
CREATE TABLE IF NOT EXISTS public.workout_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    sets INTEGER NOT NULL DEFAULT 3,
    reps TEXT NOT NULL DEFAULT '10'
);
ALTER TABLE public.workout_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trainers can view workout plan items in their workspace" ON public.workout_plan_items;
DROP POLICY IF EXISTS "Trainers can insert workout plan items in their workspace" ON public.workout_plan_items;
DROP POLICY IF EXISTS "Trainers can delete workout plan items in their workspace" ON public.workout_plan_items;
CREATE POLICY "Trainers can view workout plan items in their workspace" ON public.workout_plan_items FOR SELECT USING (plan_id IN (SELECT id FROM public.workout_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())));
CREATE POLICY "Trainers can insert workout plan items in their workspace" ON public.workout_plan_items FOR INSERT WITH CHECK (plan_id IN (SELECT id FROM public.workout_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())));
CREATE POLICY "Trainers can delete workout plan items in their workspace" ON public.workout_plan_items FOR DELETE USING (plan_id IN (SELECT id FROM public.workout_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())));`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSetupScript)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  const handleOpenCreateModal = async () => {
    await fetchClients()
    setPreselectedClientId(undefined)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Layers className="h-4 w-4" />
            Training Routines
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Workout Plans</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Assign custom exercises, sets, and rep schemes to your clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            disabled={clientsList.length === 0 || tableMissing}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create Workout Plan</span>
          </button>
        </div>
      </div>

      {/* Table Missing Alert */}
      {tableMissing && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-amber-300">
                Setup Required: Supabase `exercises` & `workout_plans` Tables
              </h3>
              <p className="text-sm text-amber-200/90 mt-1 leading-relaxed">
                Run the SQL script below in your Supabase SQL Editor to create the tables, seed the 12 exercises, and enable Row Level Security.
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto max-h-56">
              {sqlSetupScript}
            </pre>
            <button
              onClick={handleCopySql}
              className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                fetchExercises()
                fetchPlans()
                fetchClients()
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check Again
            </button>
          </div>
        </div>
      )}

      {/* Filter & Client Chooser Bar */}
      {!tableMissing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans, days, or clients..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">All Clients ({clientsList.length})</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  Client: {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading workout plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 space-y-4">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-slate-800/80 items-center justify-center text-slate-400">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Workout Plans Yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {clientsList.length === 0
                ? 'Please add or seed clients in the Clients tab first before creating workout plans.'
                : 'Build custom training plans with exercises, sets, and reps for your clients.'}
            </p>
          </div>
          {clientsList.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleOpenCreateModal}
                disabled={tableMissing}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Create First Plan
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Calendar className="h-3 w-3" />
                        {plan.day}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        <User className="h-3 w-3 text-emerald-400" />
                        {plan.client?.name || 'Assigned Client'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSharePlan(plan)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        copiedPlanId === plan.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600'
                      }`}
                      title="Copy public link to client's plan"
                    >
                      {copiedPlanId === plan.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Share</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setPlanToDelete(plan)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Workout Plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Exercises List inside Plan */}
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Exercises ({plan.items?.length || 0})
                  </p>
                  
                  {(!plan.items || plan.items.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">No exercises added to this plan.</p>
                  ) : (
                    <div className="space-y-2">
                      {plan.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center">
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

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                              {item.sets} sets × {item.reps} reps
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Footer */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Active Routine
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Workout Plan */}
      {isModalOpen && (
        <WorkoutPlanFormModal
          workspaceId={workspaceId}
          clients={clientsList}
          exercises={exercises}
          preselectedClientId={preselectedClientId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            fetchPlans()
            fetchClients()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="inline-flex h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 items-center justify-center text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Delete Workout Plan?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-white">{planToDelete.name}</strong> for {planToDelete.client?.name || 'this client'}? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
