'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import {
  Eye, EyeOff, Zap, Shield, TrendingUp,
  ArrowRight, AlertCircle, Lock, CheckCircle2,
} from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY after parsing the recovery token from the URL hash
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })

    // Fallback: if a session already exists (e.g. fast reload), allow reset
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
    })

    const t = setTimeout(() => {
      setSessionReady((ready) => {
        if (!ready) setSessionError(true)
        return ready
      })
    }, 4000)

    return () => { listener.subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password || !confirmPassword) { setError('Please fill in both fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Something went wrong. Please try again.')
      return
    }
    toast.success('Password updated!')
    setSuccess(true)
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
          <Image src="/logo.png" alt="FlowBinary" width={40} height={40} className="rounded-[10px]" />
          <span className="font-display font-bold text-xl text-white tracking-tight">FlowBinary</span>
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
        <div className="text-[#5A6380] text-xs">© 2026 FlowBinary. All rights reserved.</div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 relative overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <Image src="/logo.png" alt="FlowBinary" width={52} height={52} className="rounded-[12px]" />
            <span className="font-display font-bold text-xl text-white tracking-tight">FlowBinary</span>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-win/15 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={26} className="text-win" />
              </div>
              <h2 className="font-display font-bold text-2xl text-white mb-3">Password updated</h2>
              <p className="text-[#5A6380] text-sm leading-relaxed mb-8">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <button onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
                Continue to Sign In <ArrowRight size={15} />
              </button>
            </div>
          ) : sessionError ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-loss/15 flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={26} className="text-loss" />
              </div>
              <h2 className="font-display font-bold text-2xl text-white mb-3">Link expired</h2>
              <p className="text-[#5A6380] text-sm leading-relaxed mb-8">
                This password reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Link href="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
                Request New Link <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-display font-bold text-2xl text-white">Set new password</h2>
                <p className="text-[#5A6380] mt-2 text-sm leading-relaxed">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-loss/10 border border-loss/25 rounded-[10px] px-4 py-4 mb-6">
                  <AlertCircle size={15} className="text-loss flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-loss leading-snug">{error}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2.5">
                  <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">
                    New password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      placeholder="••••••••" autoComplete="new-password" required
                      className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-12 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5A6380] hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                    <input
                      type={showPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                      placeholder="••••••••" autoComplete="new-password" required
                      className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-4 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || !sessionReady}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Update Password</span><ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
