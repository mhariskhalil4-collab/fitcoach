import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import AuthCard from './components/AuthCard'
import Dashboard from './components/Dashboard'
import PublicPlanView from './components/PublicPlanView'
import { 
  Dumbbell, 
  Salad, 
  Users, 
  ArrowRight,
  Sparkles,
  LogIn,
  UserPlus
} from 'lucide-react'

export default function App() {
  // 0. Public share route: /p/[token] accessible without login
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const publicPlanMatch = pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/)
  if (publicPlanMatch) {
    return <PublicPlanView token={publicPlanMatch[1]} />
  }

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState<'home' | 'login' | 'signup'>('home')

  useEffect(() => {
    // 1. Check active session on initial mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setAuthView('home')
  }

  // Loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/20">
            <Dumbbell className="h-5 w-5 text-slate-950 stroke-[2.5]" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading FitCoach...</p>
        </div>
      </div>
    )
  }

  // If user is logged in, show the Trainer Dashboard
  if (session) {
    return <Dashboard onSignOut={handleSignOut} />
  }

  // If user navigated to Login or Sign-up view
  if (authView === 'login' || authView === 'signup') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => setAuthView('home')}
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Dumbbell className="h-5 w-5 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FitCoach</span>
            </button>

            <button
              onClick={() => setAuthView('home')}
              className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 cursor-pointer"
            >
              ← Back to Overview
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <AuthCard initialMode={authView} />
        </main>

        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
          FitCoach • Workout and nutrition coach for personal trainers.
        </footer>
      </div>
    )
  }

  // Default Landing / Home Page view
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Dumbbell className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FitCoach</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuthView('login')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              onClick={() => setAuthView('signup')}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-medium shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            Empowering Personal Trainers
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-none">
            FitCoach
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 font-normal leading-relaxed">
            Workout and nutrition coach for personal trainers.
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Scale your coaching business with intelligent workout programming, tailored macro planning,
            and real-time client accountability in one streamlined platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setAuthView('signup')}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-semibold rounded-xl text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition group cursor-pointer"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setAuthView('login')}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-medium rounded-xl text-base transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Sign In to Workspace
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Dumbbell className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Workout Programming</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Build and assign periodized training regimens with supersets, progression tracking, and video guides.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <Salad className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Precision Nutrition Guidance</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Calculate tailored macros, generate meal templates, and track dietary compliance with zero guesswork.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Client Management & Insights</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Consolidate messaging, check-ins, body metrics, and progress photos in a single trainer dashboard.
            </p>
          </div>
        </div>

        {/* Quick Trainer Stats Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-around gap-6 text-center">
          <div>
            <p className="text-3xl font-extrabold text-white">100%</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Trainer Focused</p>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-400">10x</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Faster Program Creation</p>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
          <div>
            <p className="text-3xl font-extrabold text-white">24/7</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Client Sync & Tracking</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FitCoach. All rights reserved.</p>
          <p className="text-slate-400">
            Workout and nutrition coach for personal trainers.
          </p>
        </div>
      </footer>
    </div>
  )
}
