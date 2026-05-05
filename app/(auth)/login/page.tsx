'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Eye, EyeOff, TrendingUp, Zap, Shield, FlaskConical, ArrowRight, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message || 'Invalid email or password')
      setLoading(false)
      return
    }

    // Real login → always real mode
    localStorage.setItem('Alphatrades_mode', 'real')
    toast.success('Welcome back!')
    router.push('/trade')
  }

  const handleTryDemo = () => {
    setDemoLoading(true)
    // Set demo mode flag so layout knows to allow access without auth
    localStorage.setItem('Alphatrades_mode', 'demo')
    router.push('/trade?demo=true')
  }

  return (
    <div className="min-h-screen bg-[#070d1a] flex relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-win/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-[250px] h-[250px] bg-primary/8 rounded-full blur-2xl" />
      </div>

      {/* ── Left branding panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-16 relative border-r border-[#1a2235]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <TrendingUp size={22} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">Alphatrades</span>
        </div>

        {/* Hero text */}
        <div className="space-y-10">
          <div>
            <h1 className="font-display font-bold text-5xl text-white leading-tight">
              Trade Volatility<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                with Precision.
              </span>
            </h1>
            <p className="mt-4 text-[#5A6380] text-lg leading-relaxed max-w-sm">
              Real-time binary options on synthetic indices.<br />
              Built for the modern trader.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Zap, title: 'Instant Settlements', desc: 'Trades settle in seconds, not minutes' },
              { icon: Shield, title: 'KES Deposits via M-Pesa', desc: 'Deposit and withdraw in Kenyan Shillings' },
              { icon: TrendingUp, title: 'AI Entry Scanner', desc: 'Find the best entry points automatically' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-4 p-4 rounded-2xl bg-[#0d1526] border border-[#1a2235]"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="text-sm text-[#5A6380] mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[#2a3555] text-sm">© 2026 Alphatrades. All rights reserved.</div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-16 relative">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-white tracking-tight">Alphatrades</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-display font-bold text-3xl text-white">Welcome back</h2>
            <p className="text-[#5A6380] mt-2 text-sm leading-relaxed">
              Sign in to your account to start trading.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-loss/10 border border-loss/25 rounded-2xl px-4 py-3.5 mb-5">
              <AlertCircle size={16} className="text-loss flex-shrink-0 mt-0.5" />
              <p className="text-sm text-loss leading-snug">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full bg-[#0d1526] border border-[#1a2235] rounded-2xl px-4 py-3.5 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 hover:border-[#2a3555] transition-colors text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-blue-400 transition-colors font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 hover:border-[#2a3555] transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5A6380] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/25 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Real Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#1a2235]" />
            <span className="text-[#2a3555] text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-[#1a2235]" />
          </div>

          {/* Demo button */}
          <button
            onClick={handleTryDemo}
            disabled={loading || demoLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 hover:border-amber-500/45 text-amber-400 font-bold py-4 rounded-2xl transition-all text-sm disabled:opacity-50"
          >
            {demoLoading ? (
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <>
                <FlaskConical size={17} />
                Try Demo — $10,000 Virtual Funds
              </>
            )}
          </button>
          <p className="text-center text-xs text-[#2a3555] mt-2">
            No account needed · No real money at risk
          </p>

          {/* Register link */}
          <p className="text-center text-[#5A6380] text-sm mt-8">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-primary hover:text-blue-400 font-bold transition-colors"
            >
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
