'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase'
import DepositModal from '@/components/modals/DepositModal'
import {
  ArrowDownLeft, ArrowUpRight, Wallet, Copy, Check,
  Share2, FlaskConical, BadgeDollarSign,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function WalletPage() {
  const searchParams = useSearchParams()
  const { user, profile, realBalance, demoBalance, isDemo } = useUserStore()
  const [showDeposit, setShowDeposit] = useState(searchParams.get('deposit') === 'true')
  const [copiedCode, setCopiedCode] = useState(false)
  const [recentTx, setRecentTx] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setRecentTx(data) })
  }, [user])

  const copyReferral = () => {
    navigator.clipboard.writeText(profile?.referral_code || 'TAG123')
    setCopiedCode(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const balance = isDemo ? demoBalance : realBalance

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col pb-24 lg:pb-6">
      <div className="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-5 py-5 space-y-4">

        {/* Balance card — full width with proper mx */}
        <div className="relative bg-gradient-to-br from-primary to-primary-dark rounded-[12px] p-5 sm:p-7 overflow-hidden shadow-2xl shadow-primary/20">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              {isDemo
                ? <FlaskConical size={13} className="text-white/70" />
                : <BadgeDollarSign size={13} className="text-white/70" />}
              <span className="text-sm font-semibold text-white/70">
                {isDemo ? 'Demo Balance' : 'Real Balance'}
              </span>
            </div>
            <div className="font-display font-bold text-4xl sm:text-5xl text-white mb-5 tabular-nums">
              ${balance.toFixed(2)}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowDeposit(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-2.5 rounded-full transition-all text-sm"
              >
                <ArrowDownLeft size={15} /> Deposit
              </button>
              <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-2.5 rounded-full transition-all text-sm">
                <ArrowUpRight size={15} /> Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Stats grid — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Real Balance',       value: `$${realBalance.toFixed(2)}`, color: 'text-win',      icon: BadgeDollarSign, iconColor: 'text-win',      bg: 'bg-win/10'      },
            { label: 'Demo Balance',       value: `$${demoBalance.toFixed(2)}`, color: 'text-primary',  icon: FlaskConical,    iconColor: 'text-primary',  bg: 'bg-primary/10'  },
            { label: 'Referral Earnings',  value: '$0.00',                      color: 'text-warning',  icon: Share2,          iconColor: 'text-warning',  bg: 'bg-warning/10'  },
            { label: 'Total Deposited',    value: '$0.00',                      color: 'text-white',    icon: Wallet,          iconColor: 'text-[#5A6380]',bg: 'bg-[#1a2235]'   },
          ].map(({ label, value, color, icon: Icon, iconColor, bg }) => (
            <div key={label} className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 flex flex-col gap-2.5">
              <div className={`w-9 h-9 rounded-[8px] ${bg} flex items-center justify-center`}>
                <Icon size={16} className={iconColor} />
              </div>
              <div>
                <div className="text-xs text-[#5A6380] font-medium mb-0.5 truncate">{label}</div>
                <div className={`font-mono font-bold text-lg tabular-nums ${color}`}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Refer & Earn */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 sm:p-5">
          <h3 className="font-display font-bold text-base text-white mb-1">Refer &amp; Earn</h3>
          <p className="text-xs text-[#5A6380] mb-4 leading-relaxed">
            Earn 5% commission on every trade your referrals make.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#070d1a] border border-[#1a2235] rounded-[8px] px-4 py-3 font-mono font-bold text-white text-base tracking-widest truncate">
              {profile?.referral_code || 'TAG123'}
            </div>
            <button onClick={copyReferral}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-[8px] font-bold transition-all text-sm flex-shrink-0">
              {copiedCode ? <Check size={15} /> : <Copy size={15} />}
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
            <button className="w-11 h-11 bg-[#070d1a] border border-[#1a2235] rounded-[8px] flex items-center justify-center hover:border-primary/50 transition-all flex-shrink-0">
              <Share2 size={16} className="text-[#5A6380]" />
            </button>
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <h3 className="font-display font-bold text-base text-white mb-3">Recent Transactions</h3>
          {recentTx.length === 0 ? (
            <div className="text-center py-14 bg-[#0d1526] border border-[#1a2235] rounded-[10px]">
              <div className="w-16 h-16 rounded-[10px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                <Wallet size={30} className="text-[#5A6380]" />
              </div>
              <p className="text-white font-semibold text-sm">No transactions yet</p>
              <p className="text-xs text-[#5A6380] mt-1.5">Your transactions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div key={tx.id} className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                    tx.status === 'completed' ? 'bg-win/15' : 'bg-warning/15'
                  }`}>
                    <ArrowDownLeft size={17} className={tx.status === 'completed' ? 'text-win' : 'text-warning'} />
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
                    <div className="font-mono font-bold text-win text-sm">
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
      </div>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
    </div>
  )
}