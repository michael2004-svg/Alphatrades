'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase'
import DepositModal from '@/components/modals/DepositModal'
import {
  ArrowDownLeft, ArrowUpRight, Wallet, Copy, Check, Share2,
  FlaskConical, BadgeDollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function WalletPage() {
  const searchParams = useSearchParams()
  const { user, profile, realBalance, demoBalance, isDemo } = useUserStore()
  const [showDeposit, setShowDeposit] = useState(searchParams.get('deposit') === 'true')
  const [copiedCode, setCopiedCode] = useState(false)
  const [recentTx, setRecentTx] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => { if (data) setRecentTx(data) })
    }
  }, [user])

  const copyReferral = () => {
    const code = profile?.referral_code || 'TAG123'
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const balance = isDemo ? demoBalance : realBalance

  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 pb-24 lg:pb-8">

      {/* Balance card */}
      <div className="relative bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl shadow-primary/20">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            {isDemo
              ? <FlaskConical size={14} className="text-white/70" />
              : <BadgeDollarSign size={14} className="text-white/70" />
            }
            <span className="text-sm font-semibold text-white/70">
              {isDemo ? 'Demo Balance' : 'Real Balance'}
            </span>
          </div>
          <div className="font-display font-bold text-5xl sm:text-6xl text-white mb-6 tabular-nums">
            ${balance.toFixed(2)}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowDeposit(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold px-5 py-2.5 rounded-2xl transition-all text-sm"
            >
              <ArrowDownLeft size={16} />
              Deposit
            </button>
            <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold px-5 py-2.5 rounded-2xl transition-all text-sm">
              <ArrowUpRight size={16} />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Real Balance', value: `$${realBalance.toFixed(2)}`, color: 'text-win', icon: BadgeDollarSign, iconColor: 'text-win', bg: 'bg-win/10' },
          { label: 'Demo Balance', value: `$${demoBalance.toFixed(2)}`, color: 'text-primary', icon: FlaskConical, iconColor: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Referral Earnings', value: '$0.00', color: 'text-warning', icon: Share2, iconColor: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Total Deposited', value: '$0.00', color: 'text-white', icon: Wallet, iconColor: 'text-[#5A6380]', bg: 'bg-[#1a2235]' },
        ].map(({ label, value, color, icon: Icon, iconColor, bg }) => (
          <div key={label} className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={16} className={iconColor} />
            </div>
            <div>
              <div className="text-xs text-[#5A6380] font-medium mb-0.5">{label}</div>
              <div className={`font-mono font-bold text-xl tabular-nums ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Referral section */}
      <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-5 sm:p-6">
        <h3 className="font-display font-bold text-lg text-white mb-1">Refer & Earn</h3>
        <p className="text-sm text-[#5A6380] mb-5 leading-relaxed">
          Earn 5% commission on every trade your referrals make.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#070d1a] border border-[#1a2235] rounded-2xl px-4 py-3 font-mono font-bold text-white text-lg tracking-widest overflow-hidden overflow-ellipsis">
            {profile?.referral_code || 'TAG123'}
          </div>
          <button
            onClick={copyReferral}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-2xl font-bold transition-all text-sm flex-shrink-0 shadow-lg shadow-primary/20"
          >
            {copiedCode ? <Check size={16} /> : <Copy size={16} />}
            {copiedCode ? 'Copied!' : 'Copy'}
          </button>
          <button className="w-12 h-12 bg-[#070d1a] border border-[#1a2235] rounded-2xl flex items-center justify-center hover:border-primary/50 transition-all flex-shrink-0">
            <Share2 size={18} className="text-[#5A6380]" />
          </button>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <h3 className="font-display font-bold text-lg text-white mb-4">Recent Transactions</h3>
        {recentTx.length === 0 ? (
          <div className="text-center py-14 bg-[#0d1526] border border-[#1a2235] rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
              <Wallet size={24} className="text-[#5A6380]" />
            </div>
            <p className="text-[#5A6380] font-medium">No transactions yet</p>
            <p className="text-xs text-[#2a3555] mt-1.5">Deposits and withdrawals will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTx.map((tx) => (
              <div key={tx.id} className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  tx.status === 'completed' ? 'bg-win/15' : 'bg-warning/15'
                }`}>
                  <ArrowDownLeft size={18} className={tx.status === 'completed' ? 'text-win' : 'text-warning'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">
                    Deposit via {tx.method || 'M-Pesa'}
                  </div>
                  <div className="text-xs text-[#5A6380] mt-0.5">
                    {new Date(tx.created_at).toLocaleString('en-KE')}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-win">
                    +${tx.amount_usd?.toFixed(2) || '0.00'}
                  </div>
                  <div className={`text-xs mt-0.5 font-medium ${
                    tx.status === 'completed' ? 'text-win' : 'text-warning'
                  }`}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
    </div>
  )
}