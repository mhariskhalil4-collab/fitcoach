import React, { useState, useEffect } from 'react'
import { supabase, type Client, type ClientGoal, type FitnessLevel } from '../lib/supabase'
import { X, User, Target, Activity, Scale, Ruler, FileText, AlertCircle, Check } from 'lucide-react'

interface ClientFormModalProps {
  workspaceId: string
  clientToEdit?: Client | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export default function ClientFormModal({
  workspaceId,
  clientToEdit,
  isOpen,
  onClose,
  onSaved,
}: ClientFormModalProps) {
  const [name, setName] = useState('')
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<string>('')
  const [goal, setGoal] = useState<ClientGoal | ''>('')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | ''>('')
  const [weightKg, setWeightKg] = useState<string>('')
  const [heightCm, setHeightCm] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Explicitly reset all fields when adding a new client, or populate with clientToEdit
  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setName(clientToEdit.name || '')
        setAge(
          clientToEdit.age !== null && clientToEdit.age !== undefined
            ? String(clientToEdit.age)
            : ''
        )
        setGender(clientToEdit.gender || '')
        setGoal(clientToEdit.goal || '')
        setFitnessLevel(clientToEdit.fitness_level || '')
        setWeightKg(
          clientToEdit.weight_kg !== null && clientToEdit.weight_kg !== undefined
            ? String(clientToEdit.weight_kg)
            : ''
        )
        setHeightCm(
          clientToEdit.height_cm !== null && clientToEdit.height_cm !== undefined
            ? String(clientToEdit.height_cm)
            : ''
        )
        setNotes(clientToEdit.notes || '')
      } else {
        // Must open completely blank for new client
        setName('')
        setAge('')
        setGender('')
        setGoal('')
        setFitnessLevel('')
        setWeightKg('')
        setHeightCm('')
        setNotes('')
      }
      setError(null)
    }
  }, [clientToEdit, isOpen])

  if (!isOpen) return null

  const isEditing = Boolean(clientToEdit)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const parsedAge = age.trim() ? parseInt(age, 10) : null
      const parsedWeight = weightKg.trim() ? parseFloat(weightKg) : null
      const parsedHeight = heightCm.trim() ? parseFloat(heightCm) : null

      if (!name.trim()) {
        throw new Error('Client name is required.')
      }

      if (!goal) {
        throw new Error('Please select a goal (lose weight, build muscle, or get fit).')
      }

      if (!fitnessLevel) {
        throw new Error('Please select a fitness level (beginner, intermediate, or advanced).')
      }

      if (isEditing && clientToEdit) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            name: name.trim(),
            age: parsedAge,
            gender: gender.trim() || null,
            goal: goal as ClientGoal,
            fitness_level: fitnessLevel as FitnessLevel,
            weight_kg: parsedWeight,
            height_cm: parsedHeight,
            notes: notes.trim() || null,
          })
          .eq('id', clientToEdit.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('clients').insert({
          workspace_id: workspaceId,
          name: name.trim(),
          age: parsedAge,
          gender: gender.trim() || null,
          goal: goal as ClientGoal,
          fitness_level: fitnessLevel as FitnessLevel,
          weight_kg: parsedWeight,
          height_cm: parsedHeight,
          notes: notes.trim() || null,
        })

        if (insertError) throw insertError
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save client details.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <div className="inline-flex h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400 mb-2">
            <User className="h-5 w-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isEditing ? 'Edit Client Profile' : 'Add New Client'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isEditing
              ? `Updating fitness details for ${clientToEdit?.name}`
              : 'Add an athlete to your workspace roster'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Client Name *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter client name"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Age
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age in years"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer ${
                  gender ? 'text-white' : 'text-slate-500'
                }`}
              >
                <option value="">Select gender...</option>
                <option value="Female" className="text-white bg-slate-900">Female</option>
                <option value="Male" className="text-white bg-slate-900">Male</option>
                <option value="Non-binary" className="text-white bg-slate-900">Non-binary</option>
                <option value="Other" className="text-white bg-slate-900">Other</option>
              </select>
            </div>
          </div>

          {/* Goal & Fitness Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                Goal *
              </label>
              <select
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value as ClientGoal)}
                className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer ${
                  goal ? 'text-white' : 'text-slate-500'
                }`}
              >
                <option value="">Select primary goal...</option>
                <option value="lose weight" className="text-white bg-slate-900">lose weight</option>
                <option value="build muscle" className="text-white bg-slate-900">build muscle</option>
                <option value="get fit" className="text-white bg-slate-900">get fit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-teal-400" />
                Fitness Level *
              </label>
              <select
                required
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
                className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer ${
                  fitnessLevel ? 'text-white' : 'text-slate-500'
                }`}
              >
                <option value="">Select fitness level...</option>
                <option value="beginner" className="text-white bg-slate-900">beginner</option>
                <option value="intermediate" className="text-white bg-slate-900">intermediate</option>
                <option value="advanced" className="text-white bg-slate-900">advanced</option>
              </select>
            </div>
          </div>

          {/* Weight & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-slate-400" />
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min={20}
                max={300}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Weight in kg"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-400" />
                Height (cm)
              </label>
              <input
                type="number"
                step="0.5"
                min={50}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Height in cm"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Coach Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any coach notes, health restrictions, or diet targets..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Client'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
