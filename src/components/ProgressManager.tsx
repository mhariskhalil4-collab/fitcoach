import { useState, useEffect, useCallback } from 'react'
import { 
  supabase, 
  type Client, 
  type ProgressLog, 
  type WorkoutCheckin, 
  type WorkoutPlan 
} from '../lib/supabase'
import { 
  TrendingUp, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  User, 
  Dumbbell, 
  CalendarDays, 
  Award, 
  Scale, 
  AlertCircle
} from 'lucide-react'

interface ProgressManagerProps {
  workspaceId: string
  clients: Client[]
}

export default function ProgressManager({ workspaceId, clients }: ProgressManagerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([])
  const [checkins, setCheckins] = useState<WorkoutCheckin[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Log weight form modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [weightInput, setWeightInput] = useState<number | ''>('')
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().split('T')[0])
  const [notesInput, setNotesInput] = useState<string>('')
  const [savingWeight, setSavingWeight] = useState(false)

  // Checkin action state
  const [checkingIn, setCheckingIn] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  // Initialize selected client
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId])

  // Fetch plans, progress logs, and checkins for selected client
  const fetchData = useCallback(async () => {
    if (!workspaceId || !selectedClientId) return
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch workout plans for dropdown
      const { data: plansData } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('client_id', selectedClientId)
        .order('name')

      if (plansData) {
        setWorkoutPlans(plansData)
        if (plansData.length > 0 && !selectedPlanId) {
          setSelectedPlanId(plansData[0].id)
        }
      }

      // 2. Fetch progress logs
      const { data: logsData, error: logsErr } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('client_id', selectedClientId)
        .order('log_date', { ascending: true })

      if (logsErr) throw logsErr
      setProgressLogs(logsData || [])

      // 3. Fetch workout checkins
      const { data: checkinsData, error: checkinsErr } = await supabase
        .from('workout_checkins')
        .select(`
          id,
          workspace_id,
          client_id,
          workout_plan_id,
          checkin_date,
          completed,
          created_at,
          workout_plan:workout_plans (*)
        `)
        .eq('workspace_id', workspaceId)
        .eq('client_id', selectedClientId)
        .order('checkin_date', { ascending: false })

      if (checkinsErr) throw checkinsErr
      
      const formattedCheckins: WorkoutCheckin[] = (checkinsData || []).map((c) => ({
        ...c,
        workout_plan: (Array.isArray(c.workout_plan) ? c.workout_plan[0] : c.workout_plan) as unknown as WorkoutPlan,
      }))
      setCheckins(formattedCheckins)
    } catch (err: unknown) {
      console.error('Error fetching progress data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, selectedClientId, selectedPlanId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate current week workouts
  const todayStr = new Date().toISOString().split('T')[0]
  
  const getStartAndEndOfWeek = () => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = (day === 0 ? -6 : 1) - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return {
      startStr: monday.toISOString().split('T')[0],
      endStr: sunday.toISOString().split('T')[0],
      monday,
    }
  }

  const { startStr, endStr, monday } = getStartAndEndOfWeek()
  const weeklyCheckins = checkins.filter(
    (c) => c.completed && c.checkin_date >= startStr && c.checkin_date <= endStr
  )
  const workoutsCompletedThisWeek = weeklyCheckins.length

  // Check if today already has a checkin
  const todayCheckin = checkins.find((c) => c.checkin_date === todayStr && c.completed)

  // Toggle check-in for today
  const handleToggleCheckinToday = async () => {
    if (!selectedClientId) return
    setCheckingIn(true)
    setError(null)
    try {
      if (todayCheckin) {
        // Remove today's checkin
        const { error: delErr } = await supabase
          .from('workout_checkins')
          .delete()
          .eq('id', todayCheckin.id)
        if (delErr) throw delErr
      } else {
        // Insert new checkin
        const { error: insErr } = await supabase
          .from('workout_checkins')
          .insert({
            workspace_id: workspaceId,
            client_id: selectedClientId,
            workout_plan_id: selectedPlanId || null,
            checkin_date: todayStr,
            completed: true,
          })
        if (insErr) throw insErr
      }
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update check-in.')
    } finally {
      setCheckingIn(false)
    }
  }

  // Save new weight log
  const handleSaveWeightLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || !weightInput || Number(weightInput) <= 0) return
    setSavingWeight(true)
    setError(null)
    try {
      const { error: insErr } = await supabase
        .from('progress_logs')
        .insert({
          workspace_id: workspaceId,
          client_id: selectedClientId,
          log_date: dateInput || todayStr,
          weight_kg: Number(weightInput),
          notes: notesInput.trim() || null,
        })

      if (insErr) throw insErr

      setIsModalOpen(false)
      setWeightInput('')
      setNotesInput('')
      setDateInput(todayStr)
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save weight log.')
    } finally {
      setSavingWeight(false)
    }
  }

  // Delete a weight log
  const handleDeleteLog = async (id: string) => {
    try {
      const { error: delErr } = await supabase
        .from('progress_logs')
        .delete()
        .eq('id', id)
      if (delErr) throw delErr
      setProgressLogs((prev) => prev.filter((l) => l.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete log.')
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Chart metrics
  const sortedLogs = [...progressLogs].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
  const hasLogs = sortedLogs.length > 0
  const firstLog = hasLogs ? sortedLogs[0] : null
  const latestLog = hasLogs ? sortedLogs[sortedLogs.length - 1] : null
  const weightChange = (firstLog && latestLog && sortedLogs.length > 1) 
    ? Number((latestLog.weight_kg - firstLog.weight_kg).toFixed(1)) 
    : 0

  // SVG Chart Dimensions
  const chartWidth = 560
  const chartHeight = 160
  const paddingX = 40
  const paddingY = 25

  let pointsString = ''
  let minWeight = 0
  let maxWeight = 100

  if (sortedLogs.length > 1) {
    const weights = sortedLogs.map((l) => Number(l.weight_kg))
    minWeight = Math.floor(Math.min(...weights) - 1)
    maxWeight = Math.ceil(Math.max(...weights) + 1)
    const weightRange = Math.max(1, maxWeight - minWeight)

    const points = sortedLogs.map((log, index) => {
      const x = paddingX + (index / (sortedLogs.length - 1)) * (chartWidth - paddingX * 2)
      const y = chartHeight - paddingY - ((Number(log.weight_kg) - minWeight) / weightRange) * (chartHeight - paddingY * 2)
      return { x, y, weight: log.weight_kg, date: log.log_date }
    })

    pointsString = points.map((p) => `${p.x},${p.y}`).join(' ')
  }

  // Day indicators for current week (Mon-Sun)
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
    const isCompleted = checkins.some((c) => c.completed && c.checkin_date === dStr)
    const isToday = dStr === todayStr
    return { date: dStr, label: dayLabel, isCompleted, isToday }
  })

  return (
    <div className="space-y-6">
      {/* Top Header Card & Client Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Progress & Tracking</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitor client weight logs over time and track weekly workout consistency.
          </p>
        </div>

        {/* Client Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
          <User className="h-4 w-4 text-teal-400 ml-2" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none pr-3 cursor-pointer"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                {c.name} ({c.goal})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards: Weekly Checkins & Quick Checkin Button */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workout Checkins Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-teal-400" />
                Weekly Workout Consistency
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                {workoutsCompletedThisWeek} Completed This Week
              </span>
            </div>

            {/* 7-Day Week Matrix */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => (
                <div
                  key={d.date}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                    d.isCompleted
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : d.isToday
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 ring-1 ring-teal-500/50'
                      : 'bg-slate-950/60 border-slate-800/70 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase">{d.label}</span>
                  <div className="h-6 w-6 rounded-full flex items-center justify-center">
                    {d.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-700" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Action Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {workoutPlans.length > 0 && !todayCheckin && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Dumbbell className="h-3.5 w-3.5 text-teal-400" />
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400"
                  >
                    {workoutPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.day})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleToggleCheckinToday}
              disabled={checkingIn}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                todayCheckin
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 shadow-teal-500/20'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>
                {todayCheckin ? 'Completed Today (Click to Undo)' : 'Mark Workout as Done for Today'}
              </span>
            </button>
          </div>
        </div>

        {/* Weight Stat Summary Card */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-teal-400" />
              Weight Summary
            </span>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Current Weight</span>
                <span className="text-2xl font-black text-white">
                  {latestLog ? `${latestLog.weight_kg} kg` : selectedClient?.weight_kg ? `${selectedClient.weight_kg} kg` : 'None logged'}
                </span>
              </div>

              {sortedLogs.length > 1 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Total Progress:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${
                    weightChange < 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : weightChange > 0
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {weightChange > 0 ? `+${weightChange} kg` : `${weightChange} kg`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setWeightInput(latestLog ? latestLog.weight_kg : selectedClient?.weight_kg || '')
              setIsModalOpen(true)
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
          >
            <Plus className="h-4 w-4" />
            <span>Log Weight Entry</span>
          </button>
        </div>
      </div>

      {/* Weight Over Time Visual Trend Chart */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Weight Over Time ({sortedLogs.length} Entries)
            </h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Entry</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedLogs.length >= 2 ? (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 overflow-visible"
            >
              {/* Grid Lines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={chartWidth - paddingX}
                y2={paddingY}
                stroke="#334155"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="#334155"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {/* Y Axis Labels */}
              <text x={paddingX - 8} y={paddingY + 4} fill="#64748b" fontSize="10" textAnchor="end">
                {maxWeight} kg
              </text>
              <text x={paddingX - 8} y={chartHeight - paddingY + 4} fill="#64748b" fontSize="10" textAnchor="end">
                {minWeight} kg
              </text>

              {/* Connecting Line */}
              <polyline
                fill="none"
                stroke="#14b8a6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* Data points */}
              {sortedLogs.map((log, index) => {
                const weights = sortedLogs.map((l) => Number(l.weight_kg))
                const minW = Math.floor(Math.min(...weights) - 1)
                const maxW = Math.ceil(Math.max(...weights) + 1)
                const range = Math.max(1, maxW - minW)
                const x = paddingX + (index / (sortedLogs.length - 1)) * (chartWidth - paddingX * 2)
                const y = chartHeight - paddingY - ((Number(log.weight_kg) - minW) / range) * (chartHeight - paddingY * 2)

                return (
                  <g key={log.id} className="group">
                    <circle
                      cx={x}
                      cy={y}
                      r="4.5"
                      fill="#0f172a"
                      stroke="#14b8a6"
                      strokeWidth="2.5"
                      className="cursor-pointer hover:scale-125 transition-transform"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {log.weight_kg}
                    </text>
                    <text
                      x={x}
                      y={chartHeight - 6}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        ) : sortedLogs.length === 1 ? (
          <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
            <span className="text-sm font-bold text-white block">
              1 Entry Logged: {sortedLogs[0].weight_kg} kg on {sortedLogs[0].log_date}
            </span>
            <p className="text-xs text-slate-400">
              Log at least 2 weigh-in entries to display the visual progression chart.
            </p>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-3">
            <Scale className="h-8 w-8 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <span className="text-sm font-bold text-white block">No Weight Logs Yet</span>
              <p className="text-xs text-slate-400">
                Log regular weight check-ins for {selectedClient?.name || 'this client'} to visualize their progress.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Log First Weigh-in
            </button>
          </div>
        )}

        {/* Detailed Logs List */}
        {sortedLogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Log History
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {[...sortedLogs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.weight_kg} kg</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.log_date).toLocaleDateString()}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
                        {log.notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    title="Delete log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log Weight Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Log Weight Entry</h3>
                <p className="text-xs text-slate-400">Recording progress for {selectedClient?.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveWeightLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 67.5"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Log Date *
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Morning weigh-in, feeling energized"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWeight}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {savingWeight ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
