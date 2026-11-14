import { useState } from 'react'
import { 
  Dumbbell, 
  Salad, 
  Users, 
  ArrowRight,
  Sparkles
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'nutrition'>('overview')

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

          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('workouts')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'workouts'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Workouts
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'nutrition'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nutrition
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Ready
            </span>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-sm font-semibold transition shadow-md shadow-emerald-500/20 cursor-pointer">
              Get Started
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
            <button className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-semibold rounded-xl text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition group cursor-pointer">
              Start Free Trial
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-medium rounded-xl text-base transition flex items-center justify-center gap-2 cursor-pointer">
              Explore Demo
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
