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
    <div className="min-h-[calc(100vh-64px)] flex flex-col pb-24 lg:pb-6">
      <div className="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-5 py-5 space-y-4">

        {/* Stats row — 3 equal columns, no overflow */}
        <div className="grid grid-cols-3 gap-3">
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
              label: 'Trades',
              value: String(sessionStats.total),
              sub: 'This session',
              valueColor: 'text-white',
            },
          ].map(({ label, value, sub, valueColor }) => (
            <div
              key={label}
              className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 min-w-0"
            >
              <div className="text-[10px] text-[#5A6380] uppercase tracking-wider mb-2 truncate font-semibold">
                {label}
              </div>
              <div className={`font-mono font-bold text-xl sm:text-2xl truncate ${valueColor}`}>
                {value}
              </div>
              <div className="text-[10px] text-[#5A6380] mt-1 truncate">{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-1 w-fit">
          {(['open', 'closed', 'transactions'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 sm:px-5 py-2 rounded-[8px] text-xs sm:text-sm font-semibold transition-all capitalize whitespace-nowrap ${
                tab === t ? 'bg-primary text-white' : 'text-[#5A6380] hover:text-white'
              }`}>
              {t}{t === 'open' && openPositions.length > 0 ? ` (${openPositions.length})` : ''}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && tab !== 'open' ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-[10px] shimmer" />
            ))}
          </div>
        ) : (
          <>
            {/* ── OPEN ── */}
            {tab === 'open' && (
              <div className="space-y-3">
                {openPositions.length === 0 ? (
                  <div className="text-center py-16 bg-[#0d1526] border border-[#1a2235] rounded-[10px]">
                    <div className="w-16 h-16 rounded-[10px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                      <Clock size={28} className="text-[#5A6380]" />
                    </div>
                    <p className="text-white font-semibold text-sm">No open positions</p>
                    <p className="text-xs text-[#5A6380] mt-1.5">Place a trade to see it here</p>
                  </div>
                ) : openPositions.map(pos => {
                  const isUp = ['even', 'over', 'match'].some(d => pos.direction.startsWith(d))
                  const pct = Math.min((pos.ticks_elapsed / pos.ticks_total) * 100, 100)
                  return (
                    <div key={pos.id}
                      className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-[8px] flex items-center justify-center flex-shrink-0 ${isUp ? 'bg-win/15' : 'bg-loss/15'}`}>
                        {isUp
                          ? <TrendingUp size={18} className="text-win" />
                          : <TrendingDown size={18} className="text-loss" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm capitalize truncate">
                          {pos.direction.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-[#5A6380] truncate">
                          {pos.asset} · {pos.trade_type.replace('_', '/')}
                        </div>
                        <div className="mt-2 w-full h-1.5 bg-[#1a2235] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <div className="font-mono font-bold text-white text-sm">${pos.stake.toFixed(2)}</div>
                        <div className="text-xs text-win mt-1">+${pos.payout.toFixed(2)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── CLOSED ── */}
            {tab === 'closed' && (
              <div className="space-y-3">
                {closedPositions.length === 0 ? (
                  <div className="text-center py-16 bg-[#0d1526] border border-[#1a2235] rounded-[10px]">
                    <div className="w-16 h-16 rounded-[10px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                      <BarChart2 size={28} className="text-[#5A6380]" />
                    </div>
                    <p className="text-white font-semibold text-sm">No closed trades yet</p>
                    <p className="text-xs text-[#5A6380] mt-1.5">Completed trades will appear here</p>
                  </div>
                ) : closedPositions.map(pos => (
                  <div key={pos.id}
                    className={`bg-[#0d1526] border rounded-[10px] p-4 flex items-center gap-4 ${
                      pos.status === 'won' ? 'border-win/25' : 'border-loss/25'
                    }`}>
                    <div className={`w-11 h-11 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                      pos.status === 'won' ? 'bg-win/15' : 'bg-loss/15'
                    }`}>
                      {pos.status === 'won'
                        ? <CheckCircle size={18} className="text-win" />
                        : <XCircle    size={18} className="text-loss" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          pos.status === 'won' ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'
                        }`}>
                          {pos.status?.toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-white capitalize truncate">
                          {pos.direction.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-[#5A6380] mt-1 truncate">
                        {pos.asset} · Exit: <span className="text-white font-mono">{pos.exit_digit}</span>
                      </div>
                      {pos.closed_at && (
                        <div className="text-xs text-[#5A6380]">{fmt(pos.closed_at)}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <div className={`font-mono font-bold text-base ${
                        (pos.profit_loss ?? 0) > 0 ? 'text-win' : 'text-loss'
                      }`}>
                        {(pos.profit_loss ?? 0) > 0 ? '+' : ''}
                        {(pos.profit_loss ?? 0).toFixed(2)}
                      </div>
                      {(pos as any).balance_after != null && (
                        <div className="text-xs text-[#5A6380]">
                          Bal: ${(pos as any).balance_after.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TRANSACTIONS ── */}
            {tab === 'transactions' && (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-16 bg-[#0d1526] border border-[#1a2235] rounded-[10px]">
                    <div className="w-16 h-16 rounded-[10px] bg-[#1a2235] flex items-center justify-center mx-auto mb-4">
                      <Clock size={28} className="text-[#5A6380]" />
                    </div>
                    <p className="text-white font-semibold text-sm">No transactions yet</p>
                    <p className="text-xs text-[#5A6380] mt-1.5">Deposits will appear here</p>
                  </div>
                ) : transactions.map((tx: any) => (
                  <div key={tx.id}
                    className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[8px] bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate capitalize">
                        Deposit via {tx.method || 'M-Pesa'}
                      </div>
                      <div className="text-xs text-[#5A6380] mt-0.5 truncate">
                        {fmt(tx.created_at)} · <span className={tx.status === 'completed' ? 'text-win' : 'text-warning'}>{tx.status}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <div className="font-mono font-bold text-win text-sm">
                        +${tx.amount_usd?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-[#5A6380]">
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