'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import {
  Zap, Shield, TrendingUp,
  ArrowRight, AlertCircle, Mail, ArrowLeft, CheckCircle2,
} from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://flowbinary.com/reset-password', // hardcoded — do not use window.location.origin
    })
    setLoading(false)
    if (resetError) {
      setError(resetError.message || 'Something went wrong. Please try again.')
      return
    }
    setSent(true)
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

          {!sent ? (
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-[#5A6380] hover:text-white text-xs font-semibold mb-8 transition-colors">
                <ArrowLeft size={13} /> Back to sign in
              </Link>

              <div className="mb-8">
                <h2 className="font-display font-bold text-2xl text-white">Forgot password?</h2>
                <p className="text-[#5A6380] mt-2 text-sm leading-relaxed">
                  Enter the email on your account and we'll send you a link to reset your password.
                </p>
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
                    Email address
                  </label>
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

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Send Reset Link</span><ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-win/15 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={26} className="text-win" />
              </div>
              <h2 className="font-display font-bold text-2xl text-white mb-3">Check your inbox</h2>
              <p className="text-[#5A6380] text-sm leading-relaxed mb-8">
                We've sent a password reset link to <span className="text-white font-semibold">{email}</span>.
                It'll expire shortly, so use it soon.
              </p>
              <Link href="/login" className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
                Back to Sign In <ArrowRight size={15} />
              </Link>
              <button onClick={() => setSent(false)} className="mt-4 text-[11px] text-[#5A6380] hover:text-white font-semibold transition-colors">
                Didn't get it? Try a different email
              </button>
            </div>
          )}

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
