'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { fetchWalletBalances } from '@/services/tradeApi'
import Image from 'next/image'
import {
  ChevronDown, LogOut,
  Settings, Wallet, FlaskConical, BadgeDollarSign, AlertCircle,
  ArrowDownToLine, ArrowUpFromLine, History, UserCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Navbar() {
  const router = useRouter()
  const {
    user, profile, realBalance, demoBalance, isDemo, toggleDemo,
    setUser, setProfile, setRealBalance, setDemoBalance, setIsDemo,
  } = useUserStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const balance = isDemo ? demoBalance : realBalance

  // ── Auth init + balance sync ────────────────────────────────────────
  useEffect(() => {
    // Restore demo/real preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('Alphatrades_mode')
      if (saved === 'real') setIsDemo(false)
    }

    // Get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setUser(session.user)

      // Load profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (prof) setProfile(prof)

      // Load wallet — source of truth for balances
      const wallet = await fetchWalletBalances(session.user.id)
      if (wallet) {
        setRealBalance(wallet.real_balance)
        setDemoBalance(wallet.demo_balance)
      }
    })

    // Auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (prof) setProfile(prof)

        const wallet = await fetchWalletBalances(session.user.id)
        if (wallet) {
          setRealBalance(wallet.real_balance)
          setDemoBalance(wallet.demo_balance)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setRealBalance(0)
        setDemoBalance(0)
        // FIX: navigate to login from inside the listener so it always
        // fires even if the component has already unmounted after signOut()
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Realtime wallet balance updates ──────────────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('wallet-balance')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const w = payload.new as any
          setRealBalance(w.real_balance ?? 0)
          setDemoBalance(w.demo_balance ?? 0)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // FIX: close dropdown first, then sign out — prevents the backdrop
  // onClick intercepting the button click and swallowing the logout action.
  // Also moved router.push into onAuthStateChange SIGNED_OUT handler above
  // so navigation always fires regardless of component mount state.
  const handleLogout = async () => {
    setAccountOpen(false)
    await supabase.auth.signOut()
    // router.push('/login') is now handled by the SIGNED_OUT listener above
  }

  const handleDeposit = () => {
    if (!user) {
      toast.error('Please log in to deposit funds')
      router.push('/login')
      return
    }
    router.push('/wallet?deposit=true')
  }

  const handleWithdraw = () => {
    if (!user) {
      toast.error('Please log in to withdraw funds')
      router.push('/login')
      return
    }
    router.push('/wallet?withdraw=true')
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
          <Image src="/logo.png" alt="FlowBinary" width={36} height={36} className="rounded-[10px]" />
          <span className="font-display font-bold text-xl text-white hidden sm:block tracking-tight">
            FlowBinary
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
            <span>{isDemo ? 'Demo' : 'Real'}</span>
          </div>

          {/* Balance display */}
          <div className="hidden sm:flex items-center gap-1 bg-[#0d1526] border border-[#1a2235] rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-[#5A6380] font-semibold">
              {isDemo ? 'DEMO' : 'BAL'}
            </span>
            <span className="font-mono font-bold text-sm text-white ml-1">
              ${balance.toFixed(2)}
            </span>
          </div>

          {/* Account dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-1.5 bg-[#0d1526] border border-[#1a2235] rounded-xl px-3 py-1.5 hover:border-primary/30 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserCircle2 size={14} className="text-primary" />
                </div>
                <span className="hidden sm:block text-xs font-semibold text-white max-w-[100px] truncate">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
                <ChevronDown size={12} className={`text-[#5A6380] transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountOpen && (
                <>
                  {/* FIX: backdrop uses onMouseDown + preventDefault to prevent it
                      from stealing focus away from dropdown buttons on click */}
                  <div
                    className="fixed inset-0 z-40"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setAccountOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#070d1a] border border-[#1a2235] rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Balance summary */}
                    <div className="p-4 border-b border-[#1a2235]">
                      <div className="text-[10px] text-[#5A6380] font-semibold uppercase tracking-wider mb-2">
                        Account
                      </div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[#5A6380]">Real</span>
                        <span className="font-mono font-bold text-sm text-win">${realBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#5A6380]">Demo</span>
                        <span className="font-mono font-bold text-sm text-white">${demoBalance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Switch account */}
                    <div className="p-2 border-b border-[#1a2235]">
                      <button
                        onClick={handleSwitchToReal}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${!isDemo ? 'bg-primary/10 text-primary' : 'text-white hover:bg-[#1a2235]'}`}
                      >
                        <BadgeDollarSign size={14} />
                        Real Account
                        {!isDemo && <span className="ml-auto text-[10px] text-primary font-bold">ACTIVE</span>}
                      </button>
                      <button
                        onClick={handleSwitchToDemo}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${isDemo ? 'bg-amber-500/10 text-amber-400' : 'text-white hover:bg-[#1a2235]'}`}
                      >
                        <FlaskConical size={14} />
                        Demo Account
                        {isDemo && <span className="ml-auto text-[10px] text-amber-400 font-bold">ACTIVE</span>}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="p-2 border-b border-[#1a2235]">
                      <button
                        onClick={() => { handleDeposit(); setAccountOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-[#1a2235] transition-all"
                      >
                        <ArrowDownToLine size={14} className="text-win" />
                        Deposit
                      </button>
                      <button
                        onClick={() => { handleWithdraw(); setAccountOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-[#1a2235] transition-all"
                      >
                        <ArrowUpFromLine size={14} className="text-[#5A6380]" />
                        Withdraw
                      </button>
                      <button
                        onClick={() => { router.push('/positions'); setAccountOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white hover:bg-[#1a2235] transition-all"
                      >
                        <History size={14} className="text-[#5A6380]" />
                        Trade History
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-loss hover:bg-loss/10 transition-all"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-9 h-9 bg-[#0d1526] border border-[#1a2235] rounded-xl flex items-center justify-center"
          >
            <Settings size={15} className="text-[#5A6380]" />
          </button>
        </div>
      </div>
    </header>
  )
}