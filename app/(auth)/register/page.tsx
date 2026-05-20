'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'
import {
  Eye, EyeOff, User, Mail, Phone,
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
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-[#1a2235]'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`flex items-center gap-1.5 text-[11px] font-medium ${pass ? 'text-win' : 'text-[#5A6380]'}`}>
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
          <Image src="/logo.png" alt="Alphatrades" width={40} height={40} className="rounded-[10px]" />
          <span className="font-display font-bold text-xl text-white tracking-tight">Alphatrades</span>
        </div>
        <div className="space-y-7">
          <div>
            <h1 className="font-display font-bold text-4xl text-white leading-tight">
              Join Thousands of<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Smart Traders.</span>
            </h1>
            <p className="mt-4 text-[#5A6380] text-sm leading-relaxed max-w-xs">
              Start with $10,000 demo balance. Graduate to real trading when you're ready.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: FlaskConical, title: '$10,000 Demo Balance',    desc: 'Practice risk-free from day one',              color: 'text-amber-400', bg: 'bg-amber-500/15' },
              { icon: Zap,          title: 'Instant M-Pesa Deposits', desc: 'Fund your real account in seconds',            color: 'text-win',       bg: 'bg-win/15'       },
              { icon: Shield,       title: 'Secure & Regulated',      desc: 'Your funds are always protected',             color: 'text-primary',   bg: 'bg-primary/15'   },
              { icon: Gift,         title: 'Referral Rewards',        desc: 'Earn 5% on every trade your referrals make', color: 'text-warning',   bg: 'bg-warning/15'   },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-[10px] bg-[#0d1526] border border-[#1a2235]">
                <div className={`w-10 h-10 rounded-[8px] ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={17} className={color} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="text-xs text-[#5A6380] mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* FIX: was #2a3555 (invisible). Updated to #5A6380 */}
        <div className="text-[#5A6380] text-xs">© 2026 Alphatrades. All rights reserved.</div>
      </div>

      {/* Right form — vertically centred, scrollable */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 relative overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <Image src="/logo.png" alt="Alphatrades" width={52} height={52} className="rounded-[12px]" />
            <span className="font-display font-bold text-xl text-white tracking-tight">Alphatrades</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-white">Create your account</h2>
            <p className="text-[#5A6380] mt-2 text-sm leading-relaxed">Free to join · Start with $10,000 demo</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-loss/10 border border-loss/25 rounded-[10px] px-4 py-4 mb-6">
              <AlertCircle size={15} className="text-loss flex-shrink-0 mt-0.5" />
              <p className="text-sm text-loss leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Name + Phone — stacked on mobile, side by side on md+ */}
            {/* FIX: was sm:grid-cols-2 — changed to md:grid-cols-2 to avoid cramped inputs on small tablets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                  {/* FIX: placeholder was #2a3555 (too dark) — changed to #3d4f6e */}
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" required autoComplete="name"
                    className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-4 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0712..." autoComplete="tel"
                    className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-4 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email"
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-4 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password"
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] px-4 py-4 pr-12 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5A6380] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Referral */}
            <div className="space-y-2.5">
              {/* FIX: "optional" label was #2a3555 — changed to #5A6380 */}
              <label className="block text-[11px] font-bold text-[#5A6380] uppercase tracking-widest">
                Referral Code <span className="normal-case font-medium text-[#5A6380] opacity-60">(optional)</span>
              </label>
              <div className="relative">
                <Gift size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6380]" />
                <input type="text" name="referralCode" value={form.referralCode} onChange={handleChange} placeholder="e.g. ABC123" autoComplete="off"
                  className="w-full bg-[#0d1526] border border-[#1a2235] rounded-[10px] pl-11 pr-4 py-4 text-white placeholder-[#3d4f6e] focus:outline-none focus:border-primary/60 transition-colors text-sm uppercase tracking-widest" />
              </div>
            </div>

            {/* FIX: Terms — moved onClick to the outer label so clicking the text also toggles the checkbox */}
            <label className="flex items-start gap-3.5 cursor-pointer group pt-1" onClick={() => setAgreedToTerms(v => !v)}>
              <div
                className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${agreedToTerms ? 'bg-primary border-primary' : 'border-[#1a2235] bg-[#0d1526] group-hover:border-primary/50'}`}
              >
                {agreedToTerms && <Check size={11} className="text-white" />}
              </div>
              <span className="text-sm text-[#5A6380] leading-snug">
                I agree to the{' '}
                {/* FIX: stop propagation so clicking the link doesn't also toggle the checkbox */}
                <Link href="/terms" onClick={e => e.stopPropagation()} className="text-primary hover:text-blue-400 transition-colors font-semibold">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" onClick={e => e.stopPropagation()} className="text-primary hover:text-blue-400 transition-colors font-semibold">Privacy Policy</Link>
              </span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-primary/25">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Create Real Account</span><ArrowRight size={15} /></>}
            </button>
          </form>

          {/* FIX: divider "or" was #2a3555 — changed to #5A6380 */}
          <div className="my-7 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#1a2235]" />
            <span className="text-[#5A6380] text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-[#1a2235]" />
          </div>

          <button onClick={handleTryDemo} disabled={loading || demoLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/40 hover:border-amber-500/60 text-amber-400 font-bold py-4 rounded-[22px] transition-all text-sm disabled:opacity-50">
            {demoLoading
              ? <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              : <><FlaskConical size={15} /><span>Try Demo First — $10,000 Virtual</span></>}
          </button>

          {/* FIX: caption was #2a3555 — changed to #5A6380 */}
          <p className="text-center text-xs text-[#5A6380] mt-3">No deposit required · Switch to real anytime</p>

          <p className="text-center text-[#5A6380] text-sm mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-blue-400 font-bold transition-colors">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
