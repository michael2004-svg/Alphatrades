'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { usePositionStore } from '@/stores/usePositionStore'
import {
  TrendingUp, TrendingDown, Clock,
  CheckCircle, XCircle, BarChart2,
} from 'lucide-react'

type Tab = 'open' | 'closed' | 'transactions'

export default function PositionsPage() {
  const [tab, setTab] = useState<Tab>('open')
  const [loading, setLoading] = useState(false)
  const { user, isDemo, sessionPL, sessionStats } = useUserStore()
  const {
    openPositions, closedPositions,
    setClosedPositions, setTransactions, transactions,
  } = usePositionStore()

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_demo', isDemo)
        .in('status', ['won', 'lost', 'refunded'])
        .order('closed_at', { ascending: false })
        .limit(50),
      supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(([{ data: pos }, { data: deps }]) => {
      if (pos) setClosedPositions(pos as any)
      if (deps) setTransactions(deps)
      setLoading(false)
    })
  }, [user, isDemo])

  const fmt = (ts: string) =>
    new Date(ts).toLocaleString('en-KE', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const winRate = sessionStats.total > 0
    ? ((sessionStats.wins / sessionStats.total) * 100).toFixed(0)
    : null

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col pb-24 lg:pb-8">
      <div className="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-6 py-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Session P/L',
              value: `${sessionPL >= 0 ? '+' : ''}$${Math.abs(sessionPL).toFixed(2)}`,
              sub: 'USD this session',
              valueColor: sessionPL >= 0 ? 'text-win' : 'text-loss',
            },
            {
              label: 'Win Rate',
              value: winRate ? `${winRate}%` : '—',
              sub: `${sessionStats.wins}W · ${sessionStats.losses}L`,
              valueColor: 'text-white',
            },
            {
              label: 'Total Trades',
              value: String(sessionStats.total),
              sub: 'This session',
              valueColor: 'text-white',
            },
          ].map(({ label, value, sub, valueColor }) => (
            <div
              key={label}
              className="bg-[#0d1526] border border-[#1a2235] rounded-[12px] p-5 min-w-0"
            >
              <div className="text-[11px] text-[#5A6380] uppercase tracking-wider mb-3 font-semibold leading-tight">
                {label}
              </div>
              <div className={`font-mono font-bold text-2xl sm:text-3xl truncate ${valueColor}`}>
                {value}
              </div>
              <div className="text-xs text-[#5A6380] mt-2">{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-[#0d1526] border border-[#1a2235] rounded-[12px] p-1.5 w-fit">
          {(['open', 'closed', 'transactions'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 sm:px-6 py-2.5 rounded-[9px] text-sm font-semibold transition-all capitalize whitespace-nowrap ${
                tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#5A6380] hover:text-white'
              }`}>
              {t}{t === 'open' && openPositions.length > 0 ? ` (${openPositions.length})` : ''}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && tab !== 'open' ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-[12px] shimmer" />
            ))}
          </div>
        ) : (
          <>
            {/* OPEN */}
            {tab === 'open' && (
              <div className="space-y-3">
                {openPositions.length === 0 ? (
                  <div className="text-center py-16 bg-[#0d1526] border border-[#1a2235] rounded-[12px]">
                    <div className="w-16 h-16 rounded-[12px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                      <Clock size={28} className="text-[#5A6380]" />
                    </div>
                    <p className="text-white font-semibold text-sm">No open positions</p>
                    <p className="text-sm text-[#5A6380] mt-2">Place a trade to see it here</p>
                  </div>
                ) : openPositions.map(pos => {
                  const isUp = ['even', 'over', 'match'].some(d => pos.direction.startsWith(d))
                  const pct = Math.min((pos.ticks_elapsed / pos.ticks_total) * 100, 100)
                  return (
                    <div key={pos.id}
                      className="bg-[#0d1526] border border-[#1a2235] rounded-[12px] p-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0 ${isUp ? 'bg-win/15' : 'bg-loss/15'}`}>
                        {isUp
                          ? <TrendingUp size={20} className="text-win" />
                          : <TrendingDown size={20} className="text-loss" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm capitalize truncate">
                          {pos.direction.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-[#5A6380] mt-1 truncate">
                          {pos.asset} · {pos.trade_type.replace('_', '/')}
                        </div>
                        <div className="mt-3 w-full h-2 bg-[#1a2235] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <div className="font-mono font-bold text-white text-sm">${pos.stake.toFixed(2)}</div>
                        <div className="text-xs text-win mt-1.5">+${pos.payout.toFixed(2)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* CLOSED */}
            {tab === 'closed' && (
              <div className="space-y-3">
                {closedPositions.length === 0 ? (
                  <div className="text-center py-16 bg-[#0d1526] border border-[#1a2235] rounded-[12px]">
                    <div className="w-16 h-16 rounded-[12px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                      <BarChart2 size={28} className="text-[#5A6380]" />
                    </div>
                    <p className="text-white font-semibold text-sm">No closed trades yet</p>
                    <p className="text-sm text-[#5A6380] mt-2">Completed trades will appear here</p>
                  </div>
                ) : closedPositions.map(pos => (
                  <div key={pos.id}
                    className={`bg-[#0d1526] border rounded-[12px] p-5 flex items-center gap-4 ${
                      pos.status === 'won' ? 'border-win/25' : 'border-loss/25'
                    }`}>
                    <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                      pos.status === 'won' ? 'bg-win/15' : 'bg-loss/15'
                    }`}>
                      {pos.status === 'won'
                        ? <CheckCircle size={20} className="text-win" />
                        : <XCircle    size={20} className="text-loss" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                          pos.status === 'won' ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'
                        }`}>
                          {pos.status?.toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-white capitalize truncate">
                          {pos.direction.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-[#5A6380] mt-2 truncate">
                        {pos.asset} · Exit: <span className="text-white font-mono">{pos.exit_digit}</span>
                      </div>
                      {pos.closed_at && (
                        <div className="text-xs text-[#5A6380] mt-0.5">{fmt(pos.closed_at)}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <div className={`font-mono font-bold text-lg ${
                        (pos.profit_loss ?? 0) > 0 ? 'text-win' : 'text-loss'
                      }`}>
                        {(pos.profit_loss ?? 0) > 0 ? '+' : ''}
                        {(pos.profit_loss ?? 0).toFixed(2)}
                      </div>
                      {(pos as any).balance_after != null && (
                        <div className="text-xs text-[#5A6380] mt-1">
                          Bal: ${(pos as any).balance_after.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TRANSACTIONS */}
            {tab === 'transactions' && (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-16 bg-[#0d1526] border border-[#1a2235] rounded-[12px]">
                    <div className="w-16 h-16 rounded-[12px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                      <Clock size={28} className="text-[#5A6380]" />
                    </div>
                    <p className="text-white font-semibold text-sm">No transactions yet</p>
                    <p className="text-sm text-[#5A6380] mt-2">Deposits will appear here</p>
                  </div>
                ) : transactions.map((tx: any) => (
                  <div key={tx.id}
                    className="bg-[#0d1526] border border-[#1a2235] rounded-[12px] p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[10px] bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate capitalize">
                        Deposit via {tx.method || 'M-Pesa'}
                      </div>
                      <div className="text-xs text-[#5A6380] mt-1 truncate">
                        {fmt(tx.created_at)} · <span className={tx.status === 'completed' ? 'text-win' : 'text-warning'}>{tx.status}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <div className="font-mono font-bold text-win text-sm">
                        +${tx.amount_usd?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-[#5A6380] mt-1">
                        KES {tx.amount_kes?.toFixed(0) || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}