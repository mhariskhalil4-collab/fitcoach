import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Dumbbell, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'

interface AuthCardProps {
  initialMode?: 'login' | 'signup'
  onSuccess?: () => void
}

export default function AuthCard({ initialMode = 'login', onSuccess }: AuthCardProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [trainerName, setTrainerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const trimmedName = trainerName.trim() || email.split('@')[0]
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              trainer_name: trimmedName,
            },
          },
        })

        if (signUpError) throw signUpError

        // If a session is established immediately (e.g., auto-confirm enabled)
        if (data.session && data.user) {
          setMessage('Account created successfully!')
          if (onSuccess) onSuccess()
        } else {
          setMessage(
            'Sign-up successful! Please check your email to confirm your account (or disable email confirmation in your Supabase project settings to log in immediately).'
          )
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        if (data.user && onSuccess) {
          onSuccess()
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected authentication error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
          <Dumbbell className="h-6 w-6 text-slate-950 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {mode === 'login' ? 'Welcome Back' : 'Create Trainer Account'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {mode === 'login'
            ? 'Sign in to access your coaching workspace'
            : 'Join FitCoach to build and manage your athlete roster'}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setError(null)
            setMessage(null)
          }}
          className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
            setMessage(null)
          }}
          className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'signup'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="leading-tight">{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Trainer Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@example.com"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
          {mode === 'signup' && (
            <p className="text-[11px] text-slate-500 mt-1">Minimum 6 characters</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <>
              {mode === 'login' ? 'Sign In to FitCoach' : 'Create My Workspace'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
        {mode === 'login' ? (
          <p>
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
                setMessage(null)
              }}
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Sign up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
                setMessage(null)
              }}
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
