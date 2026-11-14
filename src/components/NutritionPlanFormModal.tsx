import React, { useState, useEffect } from 'react'
import { supabase, type Client, type Meal, type MealType } from '../lib/supabase'
import { 
  X, 
  Utensils, 
  Flame, 
  User, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Search,
  Sparkles,
  Layers,
  Scale
} from 'lucide-react'

interface NutritionPlanFormModalProps {
  workspaceId: string
  clients: Client[]
  meals: Meal[]
  preselectedClientId?: string
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

interface NutritionPlanItemDraft {
  meal_id: string
  meal: Meal
  meal_type: MealType
  portion: string
}

const MEAL_TYPES: { id: MealType; label: string; badge: string }[] = [
  { id: 'breakfast', label: 'Breakfast', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'lunch', label: 'Lunch', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'dinner', label: 'Dinner', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'snack', label: 'Snack', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
]

export default function NutritionPlanFormModal({
  workspaceId,
  clients,
  meals,
  preselectedClientId,
  isOpen,
  onClose,
  onSaved,
}: NutritionPlanFormModalProps) {
  const [clientId, setClientId] = useState('')
  const [planName, setPlanName] = useState('')
  const [dailyCalories, setDailyCalories] = useState<number | ''>('')
  const [selectedItems, setSelectedItems] = useState<NutritionPlanItemDraft[]>([])
  const [mealSearch, setMealSearch] = useState('')
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | MealType>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset or preset client on open
  useEffect(() => {
    if (isOpen) {
      setClientId(preselectedClientId || (clients.length > 0 ? clients[0].id : ''))
      setPlanName('')
      setDailyCalories('')
      setSelectedItems([])
      setMealSearch('')
      setMealTypeFilter('all')
      setError(null)
    }
  }, [isOpen, preselectedClientId, clients])

  if (!isOpen) return null

  // Add meal to draft
  const handleAddMeal = (meal: Meal) => {
    const newItem: NutritionPlanItemDraft = {
      meal_id: meal.id,
      meal,
      meal_type: meal.meal_type,
      portion: '1 serving',
    }
    setSelectedItems((prev) => [...prev, newItem])
  }

  // Remove meal from draft
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Update item field
  const handleUpdateItem = (
    index: number, 
    field: 'portion' | 'meal_type', 
    value: string
  ) => {
    setSelectedItems((prev) => {
      const updated = [...prev]
      if (field === 'portion') {
        updated[index] = { ...updated[index], portion: value }
      } else {
        updated[index] = { ...updated[index], meal_type: value as MealType }
      }
      return updated
    })
  }

  // Calculate live totals
  const totalCalories = selectedItems.reduce((sum, item) => sum + (item.meal.calories || 0), 0)
  const totalProtein = selectedItems.reduce((sum, item) => sum + Number(item.meal.protein_g || 0), 0)
  const totalCarbs = selectedItems.reduce((sum, item) => sum + Number(item.meal.carbs_g || 0), 0)
  const totalFat = selectedItems.reduce((sum, item) => sum + Number(item.meal.fat_g || 0), 0)

  const targetCal = Number(dailyCalories) || 0
  const calPercent = targetCal > 0 ? Math.min(100, Math.round((totalCalories / targetCal) * 100)) : 0

  const filteredMeals = meals.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(mealSearch.toLowerCase()) ||
      m.meal_type.toLowerCase().includes(mealSearch.toLowerCase())
    const matchesType = mealTypeFilter === 'all' || m.meal_type === mealTypeFilter
    return matchesSearch && matchesType
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!clientId) {
        throw new Error('Please select a client for this nutrition plan.')
      }
      if (!planName.trim()) {
        throw new Error('Please enter a nutrition plan name.')
      }
      if (!dailyCalories || Number(dailyCalories) <= 0) {
        throw new Error('Please enter a valid daily calorie target (greater than 0).')
      }
      if (selectedItems.length === 0) {
        throw new Error('Please add at least one meal to the nutrition plan.')
      }

      // 1. Insert Nutrition Plan
      const { data: planData, error: planError } = await supabase
        .from('nutrition_plans')
        .insert({
          workspace_id: workspaceId,
          client_id: clientId,
          name: planName.trim(),
          daily_calories: Number(dailyCalories),
        })
        .select()
        .single()

      if (planError) throw planError

      // 2. Insert Nutrition Plan Items
      const itemsPayload = selectedItems.map((item) => ({
        plan_id: planData.id,
        meal_id: item.meal_id,
        meal_type: item.meal_type,
        portion: item.portion.trim() || '1 serving',
      }))

      const { error: itemsError } = await supabase
        .from('nutrition_plan_items')
        .insert(itemsPayload)

      if (itemsError) throw itemsError

      onSaved()
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save nutrition plan.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 shrink-0">
          <div className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 mb-2">
            <Utensils className="h-5 w-5 stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Create Nutrition Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Design a custom diet plan by assigning target calories and selecting meals from the food library.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Top Form Fields: Client, Plan Name, Target Calories */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            {/* Choose Client */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-amber-400" />
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition"
                required
              >
                {clients.length === 0 ? (
                  <option value="" disabled>No clients found</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.goal})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Plan Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-amber-400" />
                Plan Name *
              </label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Sara's Cut & Lean Plan"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition placeholder:text-slate-600"
                required
              />
            </div>

            {/* Daily Calories */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                Daily Calories (kcal) *
              </label>
              <input
                type="number"
                min="500"
                max="10000"
                value={dailyCalories}
                onChange={(e) => setDailyCalories(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 1800"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          {/* Macro & Calorie Summary Card */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Total Planned Calories:
                </span>
                <span className="text-sm font-bold text-white">
                  {totalCalories} kcal
                </span>
                {targetCal > 0 && (
                  <span className="text-xs text-slate-400">
                    / {targetCal} target ({calPercent}%)
                  </span>
                )}
              </div>

              {/* Macro breakdown pills */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  P: {totalProtein.toFixed(0)}g
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  C: {totalCarbs.toFixed(0)}g
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  F: {totalFat.toFixed(0)}g
                </span>
              </div>
            </div>

            {/* Target Progress Bar */}
            {targetCal > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    totalCalories > targetCal 
                      ? 'bg-rose-500' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{ width: `${Math.min(100, (totalCalories / targetCal) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Selected Meals in This Plan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-400" />
                Planned Meals ({selectedItems.length})
              </h3>
              <span className="text-xs text-slate-500">
                Adjust portion or meal type below
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-slate-400 text-xs">
                No meals added yet. Browse the food library below and click &quot;+ Add&quot; to include meals in this plan.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item, index) => (
                  <div
                    key={`${item.meal_id}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">
                          {item.meal.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="text-amber-400 font-medium">
                            {item.meal.calories} kcal
                          </span>
                          <span>•</span>
                          <span>P: {item.meal.protein_g}g</span>
                          <span>•</span>
                          <span>C: {item.meal.carbs_g}g</span>
                          <span>•</span>
                          <span>F: {item.meal.fat_g}g</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Meal Type Tag Selector */}
                      <select
                        value={item.meal_type}
                        onChange={(e) => handleUpdateItem(index, 'meal_type', e.target.value)}
                        className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 capitalize"
                      >
                        {MEAL_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Portion text */}
                      <input
                        type="text"
                        value={item.portion}
                        onChange={(e) => handleUpdateItem(index, 'portion', e.target.value)}
                        placeholder="Portion"
                        className="w-24 bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Remove meal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meals Library Selector */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Select Meals from Library ({filteredMeals.length})
              </h3>

              {/* Meal Type Quick Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setMealTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    mealTypeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMealTypeFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer capitalize ${
                      mealTypeFilter === t.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={mealSearch}
                onChange={(e) => setMealSearch(e.target.value)}
                placeholder="Search meal by name or type..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-400 transition placeholder:text-slate-600"
              />
            </div>

            {/* Meal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredMeals.map((meal) => {
                const typeConfig = MEAL_TYPES.find((t) => t.id === meal.meal_type)
                return (
                  <div
                    key={meal.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold text-white truncate block">
                          {meal.name}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${typeConfig?.badge || 'text-slate-400'}`}>
                          {meal.meal_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-amber-400 font-semibold">{meal.calories} kcal</span>
                        <span>•</span>
                        <span>{meal.protein_g}g P</span>
                        <span>{meal.carbs_g}g C</span>
                        <span>{meal.fat_g}g F</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddMeal(meal)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                )
              })}

              {filteredMeals.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-slate-500">
                  No meals found matching your search.
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4" />
                  <span>Save Nutrition Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
