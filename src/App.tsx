import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import AuthCard from './components/AuthCard'
import Dashboard from './components/Dashboard'
import PublicPlanView from './components/PublicPlanView'
import DemoView from './components/DemoView'
import { 
  Dumbbell, 
  Salad, 
  Users, 
  ArrowRight,
  Sparkles,
  LogIn,
  UserPlus,
  Eye,
  TrendingUp,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Check,
  Flame,
  Layers
} from 'lucide-react'

export default function App() {
  // 0. Public share route: /p/[token] accessible without login
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const publicPlanMatch = pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/)
  if (publicPlanMatch) {
    return <PublicPlanView token={publicPlanMatch[1]} />
  }

  // 1. Public demo route: /demo accessible without login
  if (pathname === '/demo' || pathname === '/demo/') {
    return <DemoView />
  }

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState<'home' | 'login' | 'signup'>('home')

  useEffect(() => {
    // Check URL parameters for explicit auth triggers
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('auth=signup')) {
        setAuthView('signup')
      } else if (window.location.search.includes('auth=login')) {
        setAuthView('login')
      }
    }

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
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">FitCoach</span>
              <span className="hidden sm:inline-block text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                For Trainers
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#features"
              className="hidden md:inline-block text-xs font-medium text-slate-400 hover:text-white transition px-2.5 py-1.5"
            >
              Features
            </a>
            <a
              href="/demo"
              className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View demo</span>
            </a>
            <button
              onClick={() => setAuthView('login')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign in</span>
            </button>
            <button
              onClick={() => setAuthView('signup')}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Sign up</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-semibold shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            Built for Independent Personal Trainers
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
            Your clients' workouts and meals, in one place.
          </h1>

          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
              FitCoach helps trainers manage clients, build customized workout and meal plans, track weight progress over time, and share plans with a private link.
            </p>
            <p className="text-sm sm:text-base text-slate-400">
              Built specifically for <strong>independent personal trainers</strong> who want to deliver a professional coaching experience without spreadsheets or complicated apps.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <a
              href="/demo"
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 font-semibold rounded-xl text-base transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              View demo
            </a>
            <button
              onClick={() => setAuthView('signup')}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition group cursor-pointer"
            >
              Sign up
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <p className="text-xs text-slate-500 pt-2">
            Free to get started • No credit card required • Zero-friction client viewing
          </p>

          {/* Quick Mockup / Preview Card */}
          <div className="pt-8 max-w-4xl mx-auto">
            <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-left relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80"></div>
                  <span className="text-xs font-mono text-slate-400 ml-2">fitcoach-sepia-tau.vercel.app/demo</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Coach Alex • 3 Active Clients
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Sara (lose weight)</span>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 font-semibold">Beginner</span>
                  </div>
                  <p className="text-xs text-slate-400">Workout: Fat-Loss Circuit (4 exercises)</p>
                  <p className="text-xs text-slate-400">Nutrition: 1,800 kcal Balanced Deficit</p>
                  <div className="pt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Down 2.0 kg in 2 weeks</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Ahmed (build muscle)</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Intermediate</span>
                  </div>
                  <p className="text-xs text-slate-400">Workout: Hypertrophy Split (Bench, Row, Press)</p>
                  <p className="text-xs text-slate-400">Nutrition: 2,800 kcal Muscle Fuel</p>
                  <div className="pt-2 text-xs text-cyan-400 font-semibold flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    <span>Upper / Lower Split</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Bilal (get fit)</span>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-semibold">Intermediate</span>
                  </div>
                  <p className="text-xs text-slate-400">Workout: Conditioning & Core</p>
                  <p className="text-xs text-slate-400">Nutrition: 2,200 kcal Maintenance</p>
                  <div className="pt-2 text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    <span>Conditioning Focus</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-slate-800/80 bg-slate-950/60 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold">
                <Layers className="h-3.5 w-3.5" />
                Features
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Everything you need to coach your athletes
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Simple, powerful tools designed specifically for independent personal trainers to deliver results.
              </p>
            </div>

            {/* 6 Core Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1: Clients */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Client Management</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Add, organize, and manage your clients in one dedicated roster. Track goals (lose weight, build muscle, get fit), fitness level, body metrics, and coach notes.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Isolated RLS workspaces
                </div>
              </div>

              {/* Feature 2: Workout Plans */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Dumbbell className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Workout Plans</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Build customized training routines with sets and reps. Choose from the 12-exercise core library or add custom movements, scheduled by training days.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60 text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Sets, reps & technique cues
                </div>
              </div>

              {/* Feature 3: Nutrition Plans */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Salad className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Nutrition Plans</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Set daily calorie targets and structure complete meal plans. Assign meals across breakfast, lunch, dinner, and snacks with protein, carb, and fat breakdowns.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60 text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Macro grams & calorie tracking
                </div>
              </div>

              {/* Feature 4: AI Coach */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">AI Coach (Gemini API)</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Generate personalized workout routines and tailored nutrition plans in seconds powered by Google Gemini. Review, tweak, and save directly to your client roster.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60 text-xs font-semibold text-fuchsia-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Instant intelligent programming
                </div>
              </div>

              {/* Feature 5: Progress Tracking */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Progress Tracking</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Log weekly client weigh-ins with an interactive SVG trend line chart. Mark workouts completed today and track 7-day consistency at a glance.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60 text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Weight trends & weekly check-ins
                </div>
              </div>

              {/* Feature 6: Share Links */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Shareable Client Links</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Share plans with a private, read-only link (`/p/[token]`). Anyone with the link can view their exercises and meals on any device with zero login required.
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60 text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  No client account or login needed
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Independent Trainers Section */}
        <section className="py-20 border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Why independent personal trainers choose FitCoach
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Zero Client Friction
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clients don't need to download an app or remember passwords. Send them a private link and their plan opens immediately.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Workouts + Nutrition
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stop juggling two separate apps. Keep training routines and dietary targets together in a unified workspace.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  Isolated & Secure
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your clients and coaching data are protected by database-level Row Level Security (RLS). You see only your clients.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to streamline your coaching?
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Test out the live demo with real sample clients, or create your own trainer workspace in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="/demo"
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View demo
              </a>
              <button
                onClick={() => setAuthView('signup')}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                Sign up free
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Dumbbell className="h-3.5 w-3.5 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-sm font-bold text-white">FitCoach</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Workout and nutrition coach for personal trainers.</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="/demo" className="hover:text-emerald-400 transition">Demo</a>
              <button onClick={() => setAuthView('login')} className="hover:text-white transition cursor-pointer">Sign in</button>
              <button onClick={() => setAuthView('signup')} className="hover:text-white transition cursor-pointer">Sign up</button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-600">
            <p>© {new Date().getFullYear()} FitCoach. Built for independent personal trainers.</p>
            <p className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              All systems operational
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
