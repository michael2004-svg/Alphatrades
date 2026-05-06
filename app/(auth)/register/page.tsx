'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Eye, EyeOff, TrendingUp, User, Mail, Phone,
  Gift, ArrowRight, AlertCircle, FlaskConical, Check, Zap, Shield
} from 'lucide-react'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length
  const barColor = score === 0 ? 'bg-[#1a2235]' : score === 1 ? 'bg-loss' : score === 2 ? 'bg-warning' : 'bg-win'
  if (!password) return null
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-[#1a2235]'}`} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`flex items-center gap-1 text-[11px] font-medium ${pass ? 'text-win' : 'text-[#5A6380]'}`}>
            <Check size={10} className={pass ? 'opacity-100' : 'opacity-0'} />{label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', referralCode: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim()) { setError('Please enter your full name'); return }
    if (!form.email.trim()) { setError('Please enter your email'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!agreedToTerms) { setError('Please agree to the Terms of Service'); return }
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(), password: form.password,
      options: { data: { full_name: form.fullName.trim(), phone_number: form.phone.trim(), referral_code: form.referralCode.trim() || null } },
    })
    if (authError) { setError(authError.message || 'Registration failed.'); setLoading(false); return }

    if (data.user) {
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      await supabase.from('profiles').upsert({ id: data.user.id, email: form.email.trim(), full_name: form.fullName.trim(), phone_number: form.phone.trim(), referral_code: referralCode, kyc_verified: false, created_at: new Date().toISOString() })
      await supabase.from('wallets').upsert({ user_id: data.user.id, real_balance: 0, demo_balance: 10000, referral_earnings: 0, updated_at: new Date().toISOString() })
    }

    localStorage.setItem('Alphatrades_mode', 'real')
    toast.success('Account created! Welcome to Alphatrades 🎉')
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
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-win/5 rounded-full blur-3xl" />
      </div>

      {/* Left branding — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-14 relative border-r border-[#1a2235]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white tracking-tight">Alphatrades</span>
        </div>
        <div className="space-y-7">
          <div>
            <h1 className="font-display font-bold text-4xl text-white leading-tight">
              Join Thousands of<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Smart Traders.</span>
            </h1>
            <p className="mt-3 text-[#5A6380] text-sm leading-relaxed max-w-xs">
              Start with $10,000 demo balance. Graduate to real trading when you're ready.
            </p>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: FlaskConical, title: '$10,000 Demo Balance', desc: 'Practice risk-free from day one', color: 'text-amber-400', bg: 'bg-amber-500/15' },
              { icon: Zap, title: 'Instant M-Pesa Deposits', desc: 'Fund your real account in seconds', color: 'text-win', bg: 'bg-win/15' },
              { icon: Shield, title: 'Secure & Regulated', desc: 'Your funds are always protected', color: 'text-primary', bg: 'bg-primary/15' },
              { icon: Gift, title: 'Referral Rewards', desc: 'Earn 5% on every trade your referrals make', color: 'text-warning', bg: 'bg-warning/15' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-start gap-3 p-3.5 rounded-[10px] bg-[#0d1526] border border-[#1a2235]">
                <div className={`w-8 h-8 rounded-[8px] ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={color} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="text-xs text-[#5A6380] mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[#2a3555] text-xs">© 2026 Alphatrades. All rights reserved.</div>
      </div>

      {/* Right form — vertically centered */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-14 relative overflow-y-auto">
        <div className="w-full max-w-sm py-6 lg:py-0">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-7 lg:hidden">
            <div className="w-10 h-10 rounded-[10px] bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">Alphatrades</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl text-white">Create your account</h2>
            <p className="text-[#5A6380] mt-1 text-sm">Free to join · Start with $10,000 demo</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-loss/10 border border-loss/25 rounded-[8px] px-4 py-3 mb-5">
              <AlertCircle size={15} className="text-loss flex-shrink-0 mt-0.5" />
              <p className="text-sm text-loss leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" required autoComplete="name"
                    className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[8px] pl-9 pr-3 py-3 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0712..." autoComplete="tel"
                    className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[8px] pl-9 pr-3 py-3 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email"
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[8px] pl-9 pr-4 py-3 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password"
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[8px] px-4 py-3 pr-11 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A6380] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Referral */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest">
                Referral Code <span className="normal-case font-medium text-[#2a3555]">(optional)</span>
              </label>
              <div className="relative">
                <Gift size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                <input type="text" name="referralCode" value={form.referralCode} onChange={handleChange} placeholder="e.g. ABC123" autoComplete="off"
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[8px] pl-9 pr-4 py-3 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary/60 transition-colors text-sm uppercase tracking-widest" />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div onClick={() => setAgreedToTerms(!agreedToTerms)}
                className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${agreedToTerms ? 'bg-primary border-primary' : 'border-[#1a2235] bg-[#0d1526] group-hover:border-primary/50'}`}>
                {agreedToTerms && <Check size={11} className="text-white" />}
              </div>
              <span className="text-xs text-[#5A6380] leading-snug">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-blue-400 transition-colors font-semibold">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:text-blue-400 transition-colors font-semibold">Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-[22px] transition-all shadow-lg shadow-primary/25">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Create Real Account</span><ArrowRight size={15} /></>}
            </button>
          </form>

          {/* Divider — 16px+ space above and below */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#1a2235]" />
            <span className="text-[#2a3555] text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-[#1a2235]" />
          </div>

          {/* Demo — 16px below divider via my-5 above */}
          <button onClick={handleTryDemo} disabled={loading || demoLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 hover:border-amber-500/45 text-amber-400 font-bold py-3.5 rounded-[22px] transition-all text-sm disabled:opacity-50">
            {demoLoading
              ? <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              : <><FlaskConical size={15} /><span>Try Demo First — $10,000 Virtual</span></>}
          </button>
          <p className="text-center text-xs text-[#2a3555] mt-2">No deposit required · Switch to real anytime</p>

          <p className="text-center text-[#5A6380] text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-blue-400 font-bold transition-colors">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
