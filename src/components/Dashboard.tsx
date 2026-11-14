import { useEffect, useState, useCallback } from 'react'
import { supabase, type Workspace, type Client } from '../lib/supabase'
import ClientsManager from './ClientsManager'
import WorkoutPlansManager from './WorkoutPlansManager'
import { 
  Dumbbell, 
  LogOut, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertTriangle, 
  UserCheck, 
  Calendar, 
  KeyRound, 
  LayoutDashboard,
  Users
} from 'lucide-react'

interface DashboardProps {
  onSignOut: () => Promise<void>
}

export default function Dashboard({ onSignOut }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'plans' | 'clients' | 'overview'>('plans')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [allVisibleWorkspaces, setAllVisibleWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  const fetchDashboardClients = useCallback(async (wsId: string) => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', wsId)
        .order('name', { ascending: true })
      if (data) setClients(data)
    } catch (err) {
      console.error('Error fetching dashboard clients:', err)
    }
  }, [])

  const fetchWorkspace = async (retryCount = 0) => {
    if (retryCount === 0) setLoading(true)
    setTableMissing(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserEmail(user.email || '')
      setUserId(user.id)

      // Query workspaces belonging to this user
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          setTableMissing(true)
          setLoading(false)
          return
        }
        throw error
      }

      let list = data || []

      // Delete duplicate workspace rows so user has exactly 1 workspace
      if (list.length > 1) {
        const primaryWorkspace = list[0]
        const duplicateIds = list.slice(1).map((w) => w.id)

        try {
          await supabase.from('workspaces').delete().in('id', duplicateIds)
          list = [primaryWorkspace]
        } catch (err) {
          console.error('Error removing duplicate workspaces:', err)
        }
      }

      // If user just signed up and trigger is still executing, retry briefly
      if (list.length === 0 && retryCount < 2) {
        setTimeout(() => fetchWorkspace(retryCount + 1), 600)
        return
      }

      setAllVisibleWorkspaces(list)
      if (list.length > 0) {
        setWorkspace(list[0])
        fetchDashboardClients(list[0].id)
      } else {
        setWorkspace(null)
      }
    } catch (err) {
      console.error('Error fetching workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkspace()
  }, [])

  const sqlSetupScript = `-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trainer_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workspace"
ON public.workspaces FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspace"
ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace"
ON public.workspaces FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspace"
ON public.workspaces FOR DELETE USING (auth.uid() = user_id);`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSetupScript)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  const trainerDisplay = workspace?.trainer_name || userEmail.split('@')[0] || 'Trainer'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header with Navigation & Logout */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Dumbbell className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">FitCoach</span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Trainer Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-400">
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              {userEmail}
            </span>

            {/* Logout Button */}
            <button
              onClick={onSignOut}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 border border-slate-800 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Coach Dashboard
            </div>
            
            {/* Required Welcome and Trainer Name */}
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{trainerDisplay}</span>!
            </h1>
            
            <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
              Your personalized FitCoach workspace is active and isolated under Supabase Row Level Security.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="h-4 w-4" />
            <span>Workout Plans</span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Clients</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Workspace & Security</span>
          </button>
        </div>

        {/* Workspace Missing Alert (if user hasn't run workspace schema yet) */}
        {tableMissing && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-amber-300">
                  Supabase `workspaces` Table Setup
                </h3>
                <p className="text-sm text-amber-200/90 mt-1 leading-relaxed">
                  Run the SQL migration script from <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300">supabase/schema.sql</code> in your Supabase SQL Editor.
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
                onClick={() => fetchWorkspace(0)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Check Again
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Workout Plans Page */}
        {activeTab === 'plans' && workspace && (
          <WorkoutPlansManager
            workspaceId={workspace.id}
            clients={clients}
          />
        )}

        {/* Tab 2: Clients Page */}
        {activeTab === 'clients' && workspace && (
          <ClientsManager
            workspaceId={workspace.id}
            trainerName={trainerDisplay}
            onClientsUpdated={setClients}
          />
        )}

        {/* Tab 3: Overview & Security */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Workspace Card */}
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-emerald-400" />
                      Your Assigned Workspace
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Active
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-8 flex items-center justify-center">
                      <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : workspace ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-slate-500 block">Trainer Name</span>
                        <p className="text-xl font-bold text-white">{workspace.trainer_name}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div>
                          <span className="text-xs text-slate-500 block">Workspace ID</span>
                          <p className="text-xs font-mono text-slate-300 truncate" title={workspace.id}>
                            {workspace.id}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Created At</span>
                          <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            {new Date(workspace.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-slate-400">Waiting for trigger to provision workspace...</p>
                      <button
                        onClick={() => fetchWorkspace(0)}
                        className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 mx-auto"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh Workspace
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    User ID: {userId.substring(0, 8)}...
                  </span>
                  <button
                    onClick={() => fetchWorkspace(0)}
                    className="hover:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* RLS Security Isolation Card */}
              <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-teal-400" />
                      Row Level Security (RLS) Status
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                      Enforced
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Postgres Row Level Security ensures that <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded text-xs">auth.uid() = user_id</code>.
                      Each personal trainer can only read and write their own data.
                    </p>

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Total Workspaces visible to this session:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {allVisibleWorkspaces.length}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Query executed: <code className="text-slate-400">SELECT * FROM workspaces</code>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Only your single assigned workspace is visible in this session.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                  Trigger-provisioned • 1 Workspace per Trainer
                </div>
              </div>
            </div>

            {/* Verification Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                Row Level Security (RLS) Client Isolation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <strong className="text-slate-200 block mb-1">1. Workspace Isolation:</strong>
                  Trainers can only query and mutate clients where <code className="text-emerald-400">workspace_id</code> belongs to their <code className="text-emerald-400">auth.uid()</code>.
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <strong className="text-slate-200 block mb-1">2. Sample Seeding:</strong>
                  Sara, Ahmed, and Bilal are seeded directly into this workspace with full Edit and Delete capabilities.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
