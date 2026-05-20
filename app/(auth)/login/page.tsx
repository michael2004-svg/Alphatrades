'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import {
  Eye, EyeOff, Zap, Shield, TrendingUp,
  FlaskConical, ArrowRight, AlertCircle, Mail,
} from 'lucide-react'

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
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })
    if (authError) {
      setError(authError.message || 'Invalid email or password')
      setLoading(false)
      return
    }
    localStorage.setItem('Alphatrades_mode', 'real')
    toast.success('Welcome back!')
    router.push('/trade')
  }

  const handleTryDemo = () => {
    setDemoLoading(true)
    localStorage.setItem('Alphatrades_mode', 'demo')
    router.push('/trade?demo=true')
  }

  return (
    <div className="min-h-screen bg-[#070d1a] flex relative overflow-hidden">

      {/* BG glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-win/5 rounded-full blur-3xl" />
      </div>

      {/* Left branding — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-14 relative border-r border-[#1a2235]">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Alphatrades" width={40} height={40} className="rounded-[10px]" />
          <span className="font-display font-bold text-xl text-white tracking-tight">Alphatrades</span>
        </div>
        <div className="space-y-8">
          <div>
            <h1 className="font-display font-bold text-4xl text-white leading-tight">
              Trade Volatility<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                with Precision.
              </span>
            </h1>
            <p className="mt-4 text-[#5A6380] text-base leading-relaxed max-w-sm">
              Real-time binary options on synthetic indices. Built for the modern trader.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: Zap,        title: 'Instant Settlements',     desc: 'Trades settle in seconds, not minutes'    },
              { icon: Shield,     title: 'KES Deposits via M-Pesa', desc: 'Deposit and withdraw in Kenyan Shillings' },
              { icon: TrendingUp, title: 'AI Entry Scanner',        desc: 'Find the best entry points automatically' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-[10px] bg-[#0d1526] border border-[#1a2235]">
                <div className="w-10 h-10 rounded-[8px] bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="text-xs text-[#5A6380] mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* FIX: was #2a3555 (invisible) → #5A6380 */}
        <div className="text-[#5A6380] text-xs">© 2026 Alphatrades. All rights reserved.</div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 relative overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <Image src="/logo.png" alt="Alphatrades" width={52} height={52} className="rounded-[12px]" />
            <span className="font-display font-bold text-xl text-white tracking-tight">Alphatrades</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-white">Welcome back</h2>
            <p className="text-[#5A6380] mt-2 text-sm leading-relaxed">Sign in to your account to start trading.</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-loss/10 border border-loss/25 rounded-[10px] px-4 py-4 mb-6">
              <AlertCircle size={15} className="text-loss flex-shrink-0 mt-0.5" />
              <p className="text-sm text-loss leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">
                Email address
              </label>
              {/* FIX: consistent input style with register page + icon added + placeholder color fixed */}
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com" autoComplete="email" required
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-4 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">Password</label>
                <Link href="/forgot-password" className="text-[11px] text-primary hover:text-blue-400 transition-colors font-semibold">
                  Forgot?
                </Link>
              </div>
              {/* FIX: consistent input style + placeholder color fixed */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••" autoComplete="current-password" required
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] px-4 py-4 pr-12 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5A6380] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* FIX: removed redundant mt-2 */}
            <button type="submit" disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign In to Real Account</span><ArrowRight size={15} /></>}
            </button>
          </form>

          {/* FIX: "or" was #2a3555 (invisible) → #5A6380 */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#1a2235]" />
            <span className="text-[#5A6380] text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-[#1a2235]" />
          </div>

          <button onClick={handleTryDemo} disabled={loading || demoLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/50 text-yellow-400 font-bold py-4 rounded-[22px] transition-all text-sm disabled:opacity-50">
            {demoLoading
              ? <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              : <><FlaskConical size={16} /><span>Try Demo — $10,000 Virtual Funds</span></>}
          </button>
          {/* FIX: was #2a3555 (invisible) → #5A6380 */}
          <p className="text-center text-xs text-[#5A6380] mt-3">No account needed · No real money at risk</p>

          <p className="text-center text-[#5A6380] text-sm mt-8">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:text-blue-400 font-bold transition-colors">
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
