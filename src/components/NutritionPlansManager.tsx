import { useState, useEffect, useCallback } from 'react'
import { supabase, type Client, type Meal, type NutritionPlan, type MealType } from '../lib/supabase'
import NutritionPlanFormModal from './NutritionPlanFormModal'
import { 
  Utensils, 
  Flame, 
  User, 
  Plus, 
  Trash2, 
  Search, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  Layers,
  Scale,
  Sparkles,
  PieChart,
  Share2
} from 'lucide-react'

interface NutritionPlansManagerProps {
  workspaceId: string
  clients?: Client[]
}

export const CORE_12_MEALS: {
  name: string
  meal_type: MealType
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}[] = [
  { name: 'Oats with Milk', meal_type: 'breakfast', calories: 350, protein_g: 15, carbs_g: 55, fat_g: 8 },
  { name: 'Eggs and Toast', meal_type: 'breakfast', calories: 380, protein_g: 22, carbs_g: 30, fat_g: 18 },
  { name: 'Chicken Salad', meal_type: 'lunch', calories: 420, protein_g: 38, carbs_g: 14, fat_g: 22 },
  { name: 'Grilled Chicken with Rice', meal_type: 'lunch', calories: 520, protein_g: 45, carbs_g: 60, fat_g: 10 },
  { name: 'Daal with Roti', meal_type: 'dinner', calories: 450, protein_g: 18, carbs_g: 72, fat_g: 9 },
  { name: 'Yogurt with Fruit', meal_type: 'snack', calories: 220, protein_g: 14, carbs_g: 32, fat_g: 4 },
  { name: 'Tuna Sandwich', meal_type: 'lunch', calories: 400, protein_g: 32, carbs_g: 42, fat_g: 11 },
  { name: 'Beef Stir Fry', meal_type: 'dinner', calories: 550, protein_g: 42, carbs_g: 40, fat_g: 22 },
  { name: 'Lentil Soup', meal_type: 'dinner', calories: 320, protein_g: 18, carbs_g: 48, fat_g: 6 },
  { name: 'Fruit Smoothie', meal_type: 'snack', calories: 210, protein_g: 6, carbs_g: 44, fat_g: 2 },
  { name: 'Nuts Mix', meal_type: 'snack', calories: 280, protein_g: 8, carbs_g: 10, fat_g: 24 },
  { name: 'Grilled Fish with Vegetables', meal_type: 'dinner', calories: 460, protein_g: 40, carbs_g: 20, fat_g: 16 }
]

const MEAL_TYPE_BADGES: Record<MealType, { label: string; badge: string }> = {
  breakfast: { label: 'Breakfast', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  lunch: { label: 'Lunch', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  dinner: { label: 'Dinner', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  snack: { label: 'Snack', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
}

export default function NutritionPlansManager({ workspaceId, clients }: NutritionPlansManagerProps) {
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [clientsList, setClientsList] = useState<Client[]>(clients || [])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [selectedClientFilter, setSelectedClientFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined)
  const [planToDelete, setPlanToDelete] = useState<NutritionPlan | null>(null)
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
        console.error('Error fetching clients for nutrition plans:', error)
        return
      }
      setClientsList(data || [])
    } catch (err) {
      console.error('Error fetching clients for nutrition plans:', err)
    }
  }, [workspaceId])

  // Sync if prop changes
  useEffect(() => {
    if (clients && clients.length > 0) {
      setClientsList(clients)
    }
  }, [clients])

  // Seed 12 meals if table is empty
  const seedMeals = useCallback(async () => {
    try {
      const { error } = await supabase.from('meals').upsert(CORE_12_MEALS, { onConflict: 'name' })
      if (error) throw error
      const { data: updatedMeals } = await supabase.from('meals').select('*').order('name')
      if (updatedMeals) setMeals(updatedMeals)
    } catch (err) {
      console.error('Error seeding meals:', err)
    }
  }, [])

  // Fetch meals library
  const fetchMeals = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('meals').select('*').order('name')
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          setTableMissing(true)
          return
        }
        throw error
      }
      if (!data || data.length === 0) {
        await seedMeals()
      } else {
        setMeals(data)
      }
    } catch (err) {
      console.error('Error fetching meals:', err)
    }
  }, [seedMeals])

  // Fetch plans with items and client details
  const fetchPlans = useCallback(async () => {
    setLoading(true)
    setTableMissing(false)
    try {
      // 1. Fetch nutrition plans for this workspace
      const { data: plansData, error: plansError } = await supabase
        .from('nutrition_plans')
        .select(`
          id,
          workspace_id,
          client_id,
          name,
          daily_calories,
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
        .from('nutrition_plan_items')
        .select(`
          id,
          plan_id,
          meal_id,
          meal_type,
          portion,
          meal:meals (
            id,
            name,
            meal_type,
            calories,
            protein_g,
            carbs_g,
            fat_g
          )
        `)
        .in('plan_id', planIds)

      if (itemsError) throw itemsError

      // 3. Group items by plan
      const fullPlans: NutritionPlan[] = plansData.map((plan) => {
        const clientObj = Array.isArray(plan.client) ? plan.client[0] : plan.client
        const planItems = (itemsData || [])
          .filter((item) => item.plan_id === plan.id)
          .map((item) => ({
            ...item,
            meal: (Array.isArray(item.meal) ? item.meal[0] : item.meal) as Meal,
          }))

        return {
          id: plan.id,
          workspace_id: plan.workspace_id,
          client_id: plan.client_id,
          name: plan.name,
          daily_calories: plan.daily_calories,
          share_token: plan.share_token,
          created_at: plan.created_at,
          client: clientObj as unknown as Client,
          items: planItems,
        }
      })

      setPlans(fullPlans)
    } catch (err) {
      console.error('Error fetching nutrition plans:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchClients()
    fetchMeals()
    fetchPlans()
  }, [fetchClients, fetchMeals, fetchPlans])

  // Open modal with fresh clients check
  const handleOpenCreateModal = async (clientId?: string) => {
    await fetchClients()
    setPreselectedClientId(clientId)
    setIsModalOpen(true)
  }

  // Copy public share link to clipboard
  const handleSharePlan = (plan: NutritionPlan) => {
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

  // Delete plan
  const handleDeletePlan = async () => {
    if (!planToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('nutrition_plans')
        .delete()
        .eq('id', planToDelete.id)

      if (error) throw error
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id))
      setPlanToDelete(null)
    } catch (err) {
      console.error('Error deleting nutrition plan:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter plans by client and search query
  const filteredPlans = plans.filter((plan) => {
    const matchesClient = selectedClientFilter === 'all' || plan.client_id === selectedClientFilter
    const matchesQuery = 
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.client?.name && plan.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (plan.items && plan.items.some((item) => item.meal?.name.toLowerCase().includes(searchQuery.toLowerCase())))
    return matchesClient && matchesQuery
  })

  const sqlSetupScript = `-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    calories INTEGER NOT NULL,
    protein_g NUMERIC(5,1) NOT NULL,
    carbs_g NUMERIC(5,1) NOT NULL,
    fat_g NUMERIC(5,1) NOT NULL
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view meals" ON public.meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert meals" ON public.meals FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.meals (name, meal_type, calories, protein_g, carbs_g, fat_g)
VALUES
  ('Oats with Milk', 'breakfast', 350, 15, 55, 8),
  ('Eggs and Toast', 'breakfast', 380, 22, 30, 18),
  ('Chicken Salad', 'lunch', 420, 38, 14, 22),
  ('Grilled Chicken with Rice', 'lunch', 520, 45, 60, 10),
  ('Daal with Roti', 'dinner', 450, 18, 72, 9),
  ('Yogurt with Fruit', 'snack', 220, 14, 32, 4),
  ('Tuna Sandwich', 'lunch', 400, 32, 42, 11),
  ('Beef Stir Fry', 'dinner', 550, 42, 40, 22),
  ('Lentil Soup', 'dinner', 320, 18, 48, 6),
  ('Fruit Smoothie', 'snack', 210, 6, 44, 2),
  ('Nuts Mix', 'snack', 280, 8, 10, 24),
  ('Grilled Fish with Vegetables', 'dinner', 460, 40, 20, 16)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    daily_calories INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_workspace_id ON public.nutrition_plans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_client_id ON public.nutrition_plans(client_id);
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view nutrition plans in their workspace"
ON public.nutrition_plans FOR SELECT
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Trainers can insert nutrition plans in their workspace"
ON public.nutrition_plans FOR INSERT
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Trainers can update nutrition plans in their workspace"
ON public.nutrition_plans FOR UPDATE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "Trainers can delete nutrition plans in their workspace"
ON public.nutrition_plans FOR DELETE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid())));

CREATE TABLE IF NOT EXISTS public.nutrition_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    portion TEXT NOT NULL DEFAULT '1 serving'
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plan_items_plan_id ON public.nutrition_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_items_meal_id ON public.nutrition_plan_items(meal_id);
ALTER TABLE public.nutrition_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view nutrition plan items in their workspace"
ON public.nutrition_plan_items FOR SELECT
USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid()))));

CREATE POLICY "Trainers can insert nutrition plan items in their workspace"
ON public.nutrition_plan_items FOR INSERT
WITH CHECK (plan_id IN (SELECT id FROM public.nutrition_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid()))));

CREATE POLICY "Trainers can update nutrition plan items in their workspace"
ON public.nutrition_plan_items FOR UPDATE
USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid()))));

CREATE POLICY "Trainers can delete nutrition plan items in their workspace"
ON public.nutrition_plan_items FOR DELETE
USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = (SELECT auth.uid()))));`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSetupScript)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Utensils className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Nutrition Plans</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Set daily calorie targets and design personalized meal plans for your clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenCreateModal()}
            disabled={clientsList.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Create Nutrition Plan</span>
          </button>
        </div>
      </div>

      {/* SQL Setup Banner if tables missing */}
      {tableMissing && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-amber-300">
                Setup `meals`, `nutrition_plans` & `nutrition_plan_items` Tables
              </h3>
              <p className="text-sm text-amber-200/90 mt-1 leading-relaxed">
                Run this SQL in your Supabase SQL Editor to create the nutrition tables, foreign keys, RLS policies, and 12 seeded meals.
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto max-h-52">
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
                fetchMeals()
                fetchPlans()
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Check Again
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plans, clients, or meals..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-400 transition placeholder:text-slate-600"
            />
          </div>

          {/* Client Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5 text-amber-400 hidden sm:inline" />
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">All Clients ({clientsList.length})</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-right">
          Showing {filteredPlans.length} {filteredPlans.length === 1 ? 'plan' : 'plans'}
        </div>
      </div>

      {/* Plans List or Empty State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading nutrition plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Utensils className="h-6 w-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Nutrition Plans Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {clientsList.length === 0
                ? 'Please add or seed clients in the Clients tab first before creating nutrition plans.'
                : searchQuery || selectedClientFilter !== 'all'
                ? 'No nutrition plans match your current filters. Try resetting the client or search query.'
                : 'Create your first personalized nutrition plan with daily calorie targets and assigned meals.'}
            </p>
          </div>
          {clientsList.length > 0 && !tableMissing && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Create First Nutrition Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => {
            const planItems = plan.items || []
            const totalPlannedCalories = planItems.reduce(
              (sum, it) => sum + (it.meal?.calories || 0), 
              0
            )
            const totalProtein = planItems.reduce(
              (sum, it) => sum + Number(it.meal?.protein_g || 0), 
              0
            )
            const totalCarbs = planItems.reduce(
              (sum, it) => sum + Number(it.meal?.carbs_g || 0), 
              0
            )
            const totalFat = planItems.reduce(
              (sum, it) => sum + Number(it.meal?.fat_g || 0), 
              0
            )

            const targetCal = plan.daily_calories || 0
            const calDifference = totalPlannedCalories - targetCal
            const calPercentage = targetCal > 0 ? Math.round((totalPlannedCalories / targetCal) * 100) : 0

            return (
              <div
                key={plan.id}
                className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-xl relative group"
              >
                <div className="space-y-5">
                  {/* Card Top: Client & Plan Title */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {plan.client?.name || 'Assigned Client'}
                        </span>
                        {plan.client?.goal && (
                          <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg capitalize">
                            {plan.client.goal}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {plan.name}
                      </h3>
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
                        className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl transition cursor-pointer"
                        title="Delete nutrition plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Daily Calorie Target & Summary Banner */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-orange-400" />
                        Daily Target:
                      </span>
                      <span className="font-bold text-white text-sm">
                        {targetCal.toLocaleString()} kcal
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Scale className="h-4 w-4 text-amber-400" />
                        Planned Meals:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300">
                          {totalPlannedCalories.toLocaleString()} kcal
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          calDifference === 0 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : calDifference > 0 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {calDifference === 0 
                            ? 'Exact' 
                            : calDifference > 0 
                            ? `+${calDifference} kcal` 
                            : `${calDifference} kcal`}
                        </span>
                      </div>
                    </div>

                    {/* Calorie Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          calPercentage > 105 
                            ? 'bg-rose-500' 
                            : calPercentage >= 95 
                            ? 'bg-emerald-400' 
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, calPercentage)}%` }}
                      />
                    </div>

                    {/* Macro Breakdown Summary */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <PieChart className="h-3.5 w-3.5 text-slate-500" />
                        <span>Macros:</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-400 font-medium">Protein: {totalProtein.toFixed(0)}g</span>
                        <span className="text-emerald-400 font-medium">Carbs: {totalCarbs.toFixed(0)}g</span>
                        <span className="text-amber-400 font-medium">Fat: {totalFat.toFixed(0)}g</span>
                      </div>
                    </div>
                  </div>

                  {/* Meals List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-amber-400" />
                      Assigned Meals ({planItems.length})
                    </span>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {planItems.map((item, idx) => {
                        const typeInfo = MEAL_TYPE_BADGES[item.meal_type] || {
                          label: item.meal_type,
                          badge: 'bg-slate-800 text-slate-300'
                        }

                        return (
                          <div
                            key={item.id || idx}
                            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white truncate block">
                                  {item.meal?.name || 'Meal'}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${typeInfo.badge}`}>
                                  {typeInfo.label}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span className="text-slate-400">{item.portion}</span>
                                {item.meal && (
                                  <>
                                    <span>•</span>
                                    <span>P: {item.meal.protein_g}g</span>
                                    <span>•</span>
                                    <span>C: {item.meal.carbs_g}g</span>
                                    <span>•</span>
                                    <span>F: {item.meal.fat_g}g</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold text-amber-400">
                                {item.meal?.calories || 0} kcal
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer date */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                  <span className="text-amber-400/80 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    FitCoach Nutrition Engine
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <NutritionPlanFormModal
        workspaceId={workspaceId}
        clients={clientsList}
        meals={meals}
        preselectedClientId={preselectedClientId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          fetchPlans()
        }}
      />

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Nutrition Plan?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="text-white font-medium">&quot;{planToDelete.name}&quot;</span>? This will permanently remove the plan and all of its assigned meals.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
