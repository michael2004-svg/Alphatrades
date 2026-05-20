'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import Image from 'next/image'
import {
  Bell, ChevronDown, LogOut,
  Settings, Wallet, FlaskConical, BadgeDollarSign, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Navbar() {
  const router = useRouter()
  const { user, profile, realBalance, demoBalance, isDemo, toggleDemo } = useUserStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const balance = isDemo ? demoBalance : realBalance

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeposit = () => {
    if (!user) {
      toast.error('Please log in to deposit funds')
      router.push('/login')
      return
    }
    router.push('/wallet?deposit=true')
  }

  const handleSwitchToReal = () => {
    if (!user) {
      toast.error('Please log in to use a real account')
      router.push('/login')
      setAccountOpen(false)
      return
    }
    if (isDemo) toggleDemo()
    setAccountOpen(false)
  }

  const handleSwitchToDemo = () => {
    if (!isDemo) toggleDemo()
    setAccountOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-[#04060f]/95 backdrop-blur-xl border-b border-[#0d1525]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer" onClick={() => router.push('/trade')}>
          <Image src="/logo.png" alt="Alphatrades" width={36} height={36} className="rounded-[10px]" />
          <span className="font-display font-bold text-xl text-white hidden sm:block tracking-tight">
            Alphatrades
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { label: 'Trade',     href: '/trade'     },
            { label: 'Positions', href: '/positions' },
            { label: 'Wallet',    href: '/wallet'    },
          ].map(({ label, href }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className="px-4 py-2 rounded-xl text-[#4a5878] hover:text-white hover:bg-[#0d1526]/80 transition-all text-sm font-medium tracking-wide"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Demo/Real badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
            isDemo
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
          }`}>
            {isDemo ? <FlaskConical size={12} /> : <BadgeDollarSign size={12} />}
            {isDemo ? 'DEMO' : 'REAL'}
          </div>

          {/* Account switcher */}
          <div className="relative">
            <button
              onClick={() => setAccountOpen(!accountOpen)}
              className="flex items-center gap-2 bg-[#080d1a] border border-[#0d1525] rounded-2xl px-3 py-2 hover:border-primary/40 transition-all"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDemo ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="font-mono text-sm font-semibold text-white tabular-nums">
                ${balance.toFixed(2)}
              </span>
              <ChevronDown
                size={14}
                className={`text-[#4a5878] transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {accountOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                {/* Dropdown — no overflow-hidden, use rounded corners on children instead */}
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#080d1a] border border-[#0d1525] rounded-2xl shadow-2xl shadow-black/60 z-50 animate-slide-up">

                  <div className="px-5 pt-5 pb-4 rounded-t-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#4a5878]">Switch Account</p>
                  </div>

                  <button
                    onClick={handleSwitchToReal}
                    className={`w-full flex items-center justify-between px-5 py-4 hover:bg-[#0d1526] transition-colors ${!isDemo ? 'bg-emerald-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!isDemo ? 'bg-emerald-500/15' : 'bg-[#0d1526]'}`}>
                        <BadgeDollarSign size={17} className={!isDemo ? 'text-emerald-400' : 'text-[#4a5878]'} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-white">Real Account</div>
                        <div className="text-xs text-[#4a5878] mt-1">
                          {user ? `$${realBalance.toFixed(2)}` : 'Login required'}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {!isDemo && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">ACTIVE</span>}
                      {!user && <AlertCircle size={14} className="text-[#4a5878]" />}
                    </div>
                  </button>

                  <button
                    onClick={handleSwitchToDemo}
                    className={`w-full flex items-center justify-between px-5 py-4 hover:bg-[#0d1526] transition-colors ${isDemo ? 'bg-amber-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDemo ? 'bg-amber-500/15' : 'bg-[#0d1526]'}`}>
                        <FlaskConical size={17} className={isDemo ? 'text-amber-400' : 'text-[#4a5878]'} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-white">Demo Account</div>
                        <div className="text-xs text-[#4a5878] mt-1">${demoBalance.toFixed(2)} virtual</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {isDemo && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">ACTIVE</span>}
                    </div>
                  </button>

                  {!isDemo && user && (
                    <div className="px-5 pb-5 pt-3 rounded-b-2xl">
                      <button
                        onClick={() => { handleDeposit(); setAccountOpen(false) }}
                        className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-semibold py-3.5 rounded-xl transition-all"
                      >
                        + Deposit Funds
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {user && (
            <button
              onClick={handleDeposit}
              className="hidden sm:flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-2xl transition-all shadow-lg shadow-primary/20"
            >
              Deposit
            </button>
          )}

          {!user && (
            <button
              onClick={() => router.push('/login')}
              className="hidden sm:flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-2xl transition-all shadow-lg shadow-primary/20"
            >
              Log In
            </button>
          )}

          <button className="w-9 h-9 rounded-2xl bg-[#080d1a] border border-[#0d1525] flex items-center justify-center hover:border-primary/40 transition-all relative">
            <Bell size={16} className="text-[#4a5878]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => user ? setMenuOpen(!menuOpen) : router.push('/login')}
              className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center font-display font-bold text-white text-sm shadow-lg shadow-primary/30"
            >
              {profile?.full_name?.[0] || user?.email?.[0] || '?'}
            </button>

            {menuOpen && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#080d1a] border border-[#0d1525] rounded-2xl shadow-2xl shadow-black/60 z-50 animate-slide-up">
                  <div className="px-5 py-4 border-b border-[#0d1525] rounded-t-2xl">
                    <div className="text-sm font-bold text-white truncate">{profile?.full_name || 'Trader'}</div>
                    <div className="text-xs text-[#4a5878] truncate mt-1">{user?.email}</div>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => { router.push('/wallet'); setMenuOpen(false) }}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#0d1526] transition-colors text-[#4a5878] hover:text-white"
                    >
                      <Wallet size={16} /> <span className="text-sm">Wallet</span>
                    </button>
                    <button
                      onClick={() => { router.push('/settings'); setMenuOpen(false) }}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#0d1526] transition-colors text-[#4a5878] hover:text-white"
                    >
                      <Settings size={16} /> <span className="text-sm">Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-[#0d1525] py-2 rounded-b-2xl">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#0d1526] transition-colors text-loss"
                    >
                      <LogOut size={16} /> <span className="text-sm font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}