import React, { useState, useEffect } from 'react'
import { supabase, type Client, type Exercise } from '../lib/supabase'
import { 
  X, 
  Dumbbell, 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Search,
  Sparkles
} from 'lucide-react'

interface WorkoutPlanFormModalProps {
  workspaceId: string
  clients: Client[]
  exercises: Exercise[]
  preselectedClientId?: string
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

interface PlanItemDraft {
  exercise_id: string
  exercise: Exercise
  sets: number
  reps: string
}

export default function WorkoutPlanFormModal({
  workspaceId,
  clients,
  exercises,
  preselectedClientId,
  isOpen,
  onClose,
  onSaved,
}: WorkoutPlanFormModalProps) {
  const [clientId, setClientId] = useState('')
  const [planName, setPlanName] = useState('')
  const [day, setDay] = useState('')
  const [selectedItems, setSelectedItems] = useState<PlanItemDraft[]>([])
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset or preset client on open
  useEffect(() => {
    if (isOpen) {
      setClientId(preselectedClientId || (clients.length > 0 ? clients[0].id : ''))
      setPlanName('')
      setDay('')
      setSelectedItems([])
      setExerciseSearch('')
      setMuscleFilter('all')
      setError(null)
    }
  }, [isOpen, preselectedClientId, clients])

  if (!isOpen) return null

  // Add exercise to draft
  const handleAddExercise = (exercise: Exercise) => {
    // Default 3 sets, 10 reps
    const newItem: PlanItemDraft = {
      exercise_id: exercise.id,
      exercise,
      sets: 3,
      reps: '10',
    }
    setSelectedItems((prev) => [...prev, newItem])
  }

  // Remove exercise from draft
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Update sets or reps for an item
  const handleUpdateItem = (index: number, field: 'sets' | 'reps', value: string | number) => {
    setSelectedItems((prev) => {
      const updated = [...prev]
      if (field === 'sets') {
        updated[index] = { ...updated[index], sets: Math.max(1, Number(value) || 1) }
      } else {
        updated[index] = { ...updated[index], reps: String(value) }
      }
      return updated
    })
  }

  const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscle_group)))

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(exerciseSearch.toLowerCase())
    const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter
    return matchesSearch && matchesMuscle
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!clientId) {
        throw new Error('Please select a client for this workout plan.')
      }
      if (!planName.trim()) {
        throw new Error('Please enter a plan name.')
      }
      if (!day.trim()) {
        throw new Error('Please specify a day or schedule (e.g. Monday, Day 1).')
      }
      if (selectedItems.length === 0) {
        throw new Error('Please add at least one exercise to the workout plan.')
      }

      // 1. Insert Workout Plan
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          workspace_id: workspaceId,
          client_id: clientId,
          name: planName.trim(),
          day: day.trim(),
        })
        .select()
        .single()

      if (planError) throw planError

      // 2. Insert Workout Plan Items
      const itemsPayload = selectedItems.map((item) => ({
        plan_id: planData.id,
        exercise_id: item.exercise_id,
        sets: item.sets,
        reps: item.reps.trim() || '10',
      }))

      const { error: itemsError } = await supabase
        .from('workout_plan_items')
        .insert(itemsPayload)

      if (itemsError) throw itemsError

      onSaved()
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save workout plan.')
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
          <div className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 mb-2">
            <Dumbbell className="h-5 w-5 stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Create Workout Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Build a targeted routine by choosing a client, scheduling a day, and assigning exercises.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Top Form Fields: Client, Plan Name, Day */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            {/* Choose Client */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-400" />
                Select Client *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="" disabled>Choose a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} ({c.goal})
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                Plan Name *
              </label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Full Body Strength"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Day */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                Day / Schedule *
              </label>
              <input
                type="text"
                required
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="e.g. Monday, Day 1"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Selected Exercises Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-emerald-400" />
                Plan Exercises ({selectedItems.length})
              </h3>
              <span className="text-xs text-slate-400">
                {selectedItems.length === 0 ? 'No exercises added yet' : 'Adjust sets and reps below'}
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400">
                  Select exercises from the library below to include them in this workout plan.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedItems.map((item, idx) => (
                  <div
                    key={`${item.exercise_id}-${idx}`}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{item.exercise.name}</p>
                        <p className="text-xs text-slate-400">
                          {item.exercise.muscle_group} • {item.exercise.equipment}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-slate-400 uppercase font-medium">Sets:</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={item.sets}
                          onChange={(e) => handleUpdateItem(idx, 'sets', e.target.value)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-slate-400 uppercase font-medium">Reps:</label>
                        <input
                          type="text"
                          value={item.reps}
                          onChange={(e) => handleUpdateItem(idx, 'reps', e.target.value)}
                          placeholder="e.g. 10"
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove Exercise"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exercise Library Picker */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Exercise Library</h3>
                <p className="text-xs text-slate-400">Click "+ Add" to include an exercise in this plan.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={muscleFilter}
                  onChange={(e) => setMuscleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Muscle Groups</option>
                  {muscleGroups.map((mg) => (
                    <option key={mg} value={mg}>{mg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 hover:border-slate-700 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate" title={ex.name}>
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {ex.muscle_group}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddExercise(ex)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Save Workout Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
