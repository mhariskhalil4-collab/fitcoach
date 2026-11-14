import { useState, useEffect, useCallback } from 'react'
import { supabase, type Client, type ClientGoal, type FitnessLevel } from '../lib/supabase'
import ClientFormModal from './ClientFormModal'
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Search, 
  Sparkles, 
  Target, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  Scale, 
  Ruler, 
  FileText 
} from 'lucide-react'

interface ClientsManagerProps {
  workspaceId: string
  trainerName: string
  onClientsUpdated?: (clients: Client[]) => void
}

const SAMPLE_CLIENTS = [
  {
    name: 'Sara',
    age: 28,
    gender: 'Female',
    goal: 'lose weight' as ClientGoal,
    fitness_level: 'beginner' as FitnessLevel,
    weight_kg: 68.0,
    height_cm: 165.0,
    notes: 'Focusing on caloric deficit, whole foods, and 3x weekly bodyweight strength sessions.',
  },
  {
    name: 'Ahmed',
    age: 25,
    gender: 'Male',
    goal: 'build muscle' as ClientGoal,
    fitness_level: 'intermediate' as FitnessLevel,
    weight_kg: 78.5,
    height_cm: 180.0,
    notes: 'Hypertrophy focused: 4-day upper/lower split targeting chest, back, and leg volume.',
  },
  {
    name: 'Bilal',
    age: 34,
    gender: 'Male',
    goal: 'get fit' as ClientGoal,
    fitness_level: 'beginner' as FitnessLevel,
    weight_kg: 82.0,
    height_cm: 176.0,
    notes: 'Improving functional mobility, core stability, and cardio endurance for general wellness.',
  },
]

export default function ClientsManager({ workspaceId, onClientsUpdated }: ClientsManagerProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)
  
  // Delete confirm state
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  const seedSampleClients = useCallback(async () => {
    setIsSeeding(true)
    try {
      // 1. Check existing clients in this workspace to prevent duplicate creation
      const { data: existingClients, error: fetchErr } = await supabase
        .from('clients')
        .select('name')
        .eq('workspace_id', workspaceId)

      if (fetchErr) throw fetchErr

      const existingNames = new Set(
        (existingClients || []).map((c) => c.name.trim().toLowerCase())
      )

      // 2. Only insert sample clients that do NOT already exist by name
      const clientsToInsert = SAMPLE_CLIENTS
        .filter((sample) => !existingNames.has(sample.name.trim().toLowerCase()))
        .map((sample) => ({
          ...sample,
          workspace_id: workspaceId,
        }))

      if (clientsToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('clients').insert(clientsToInsert)
        if (insertErr) throw insertErr
      }

      await fetchClients()
    } catch (err) {
      console.error('Error seeding clients:', err)
    } finally {
      setIsSeeding(false)
    }
  }, [workspaceId])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setTableMissing(false)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          setTableMissing(true)
          setLoading(false)
          return
        }
        throw error
      }

      setClients(data || [])
      if (onClientsUpdated && data) {
        onClientsUpdated(data)
      }

      // Auto-seed if 0 clients exist
      if (!data || data.length === 0) {
        await seedSampleClients()
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, seedSampleClients])

  useEffect(() => {
    if (workspaceId) {
      fetchClients()
    }
  }, [workspaceId, fetchClients])

  const handleDeleteClient = async () => {
    if (!clientToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id)

      if (error) throw error

      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id))
      setClientToDelete(null)
    } catch (err) {
      console.error('Error deleting client:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGoal = selectedGoal === 'all' || client.goal === selectedGoal
    const matchesLevel = selectedLevel === 'all' || client.fitness_level === selectedLevel
    return matchesSearch && matchesGoal && matchesLevel
  })

  const sqlClientsScript = `-- 1. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    goal TEXT NOT NULL CHECK (goal IN ('lose weight', 'build muscle', 'get fit')),
    fitness_level TEXT NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    weight_kg NUMERIC(6,2),
    height_cm NUMERIC(6,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Turn ON Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Trainers can view clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can insert clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can update clients in their workspace" ON public.clients;
DROP POLICY IF EXISTS "Trainers can delete clients in their workspace" ON public.clients;

CREATE POLICY "Trainers can view clients in their workspace"
ON public.clients FOR SELECT
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can insert clients in their workspace"
ON public.clients FOR INSERT
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can update clients in their workspace"
ON public.clients FOR UPDATE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));

CREATE POLICY "Trainers can delete clients in their workspace"
ON public.clients FOR DELETE
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlClientsScript)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  const getGoalBadge = (goal: ClientGoal) => {
    switch (goal) {
      case 'build muscle':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Target className="h-3 w-3" />
            Build Muscle
          </span>
        )
      case 'lose weight':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Target className="h-3 w-3" />
            Lose Weight
          </span>
        )
      case 'get fit':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Target className="h-3 w-3" />
            Get Fit
          </span>
        )
    }
  }

  const getFitnessBadge = (level: FitnessLevel) => {
    switch (level) {
      case 'beginner':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            <Activity className="h-3 w-3 text-slate-400" />
            Beginner
          </span>
        )
      case 'intermediate':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="h-3 w-3 text-blue-400" />
            Intermediate
          </span>
        )
      case 'advanced':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Activity className="h-3 w-3 text-purple-400" />
            Advanced
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" />
            Roster Management
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Athlete & Client Roster</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your personal training clients, program goals, and physical metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={seedSampleClients}
            disabled={isSeeding || loading || tableMissing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            title="Seed Sara (lose weight, beginner), Ahmed (build muscle, intermediate), and Bilal (get fit, beginner)"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Sample Clients'}</span>
          </button>

          <button
            onClick={() => {
              setClientToEdit(null)
              setIsModalOpen(true)
            }}
            disabled={tableMissing}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <UserPlus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Table Missing Warning */}
      {tableMissing && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-amber-300">
                Setup Required: Supabase `clients` Table
              </h3>
              <p className="text-sm text-amber-200/90 mt-1 leading-relaxed">
                The <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300">clients</code> table has not been created in your Supabase database yet. Please run the SQL migration script below in your Supabase Dashboard:
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto max-h-52">
              {sqlClientsScript}
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
              onClick={fetchClients}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              I have run the SQL — Check Again
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      {!tableMissing && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">All Goals</option>
              <option value="lose weight">Goal: Lose Weight</option>
              <option value="build muscle">Goal: Build Muscle</option>
              <option value="get fit">Goal: Get Fit</option>
            </select>
          </div>

          <div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">All Fitness Levels</option>
              <option value="beginner">Level: Beginner</option>
              <option value="intermediate">Level: Intermediate</option>
              <option value="advanced">Level: Advanced</option>
            </select>
          </div>
        </div>
      )}

      {/* Client List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading client roster...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 space-y-4">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-slate-800/80 items-center justify-center text-slate-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Clients Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedGoal !== 'all' || selectedLevel !== 'all'
                ? 'No clients match your filter criteria.'
                : 'Get started by adding your first athlete or seeding the sample clients.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={seedSampleClients}
              disabled={isSeeding || tableMissing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Seed 3 Sample Clients
            </button>
            <button
              onClick={() => {
                setClientToEdit(null)
                setIsModalOpen(true)
              }}
              disabled={tableMissing}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
              Add Client Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition shadow-lg flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header: Name and badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                      {client.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {[client.gender, client.age ? `${client.age} yrs` : null]
                        .filter(Boolean)
                        .join(' • ') || 'Personal Training Client'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {getGoalBadge(client.goal)}
                    {getFitnessBadge(client.fitness_level)}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-slate-500" />
                    <span>Weight: </span>
                    <strong className="text-slate-200">
                      {client.weight_kg ? `${client.weight_kg} kg` : 'N/A'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5 text-slate-500" />
                    <span>Height: </span>
                    <strong className="text-slate-200">
                      {client.height_cm ? `${client.height_cm} cm` : 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* Notes */}
                {client.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs text-slate-400 flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 leading-relaxed">{client.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons: Edit and Delete */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Added {new Date(client.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setClientToEdit(client)
                      setIsModalOpen(true)
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Edit Client"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setClientToDelete(client)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete Client"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <ClientFormModal
          key={clientToEdit ? `edit-${clientToEdit.id}` : 'add-client'}
          workspaceId={workspaceId}
          clientToEdit={clientToEdit}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setClientToEdit(null)
          }}
          onSaved={fetchClients}
        />
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="inline-flex h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 items-center justify-center text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Delete Client?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-white">{clientToDelete.name}</strong>? This action cannot be undone and will remove all associated workout data.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
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
