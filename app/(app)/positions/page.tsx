'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { usePositionStore } from '@/stores/usePositionStore'
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react'

type Tab = 'open' | 'closed' | 'transactions'

export default function PositionsPage() {
  const [tab, setTab] = useState<Tab>('open')
  const [loading, setLoading] = useState(true)
  const { user, isDemo, sessionPL, sessionStats } = useUserStore()
  const { openPositions, closedPositions, setClosedPositions, setTransactions, transactions } = usePositionStore()

  useEffect(() => {
    if (!user) return

    const fetchHistory = async () => {
      setLoading(true)
      
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_demo', isDemo)
        .in('status', ['won', 'lost', 'refunded'])
        .order('closed_at', { ascending: false })
        .limit(50)

      if (positions) setClosedPositions(positions as any)

      const { data: deps } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (deps) setTransactions(deps)
      setLoading(false)
    }

    fetchHistory()
  }, [user, isDemo])

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('en-KE', { 
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit' 
    })
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-6">
      {/* Session summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <div className="text-xs text-[#5A6380] uppercase tracking-wider mb-1">Session P/L</div>
          <div className={`font-mono font-bold text-2xl ${sessionPL >= 0 ? 'text-win' : 'text-loss'}`}>
            {sessionPL >= 0 ? '+' : ''}{sessionPL.toFixed(2)}
          </div>
          <div className="text-xs text-[#5A6380] mt-1">USD</div>
        </div>
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <div className="text-xs text-[#5A6380] uppercase tracking-wider mb-1">Win Rate</div>
          <div className="font-mono font-bold text-2xl text-white">
            {sessionStats.total > 0 
              ? `${((sessionStats.wins / sessionStats.total) * 100).toFixed(0)}%`
              : '—'}
          </div>
          <div className="text-xs text-[#5A6380] mt-1">{sessionStats.wins}W / {sessionStats.losses}L</div>
        </div>
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <div className="text-xs text-[#5A6380] uppercase tracking-wider mb-1">Total Trades</div>
          <div className="font-mono font-bold text-2xl text-white">{sessionStats.total}</div>
          <div className="text-xs text-[#5A6380] mt-1">This session</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d1526] border border-[#1a2235] rounded-xl p-1 mb-6 w-fit">
        {(['open', 'closed', 'transactions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t ? 'bg-primary text-white' : 'text-[#5A6380] hover:text-white'
            }`}
          >
            {t} {t === 'open' && openPositions.length > 0 && `(${openPositions.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && tab !== 'open' ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer" />
          ))}
        </div>
      ) : (
        <>
          {tab === 'open' && (
            <div className="space-y-3">
              {openPositions.length === 0 ? (
                <div className="text-center py-16">
                  <Clock size={32} className="text-[#5A6380] mx-auto mb-3" />
                  <p className="text-[#5A6380]">No open positions</p>
                  <p className="text-xs text-[#2a3555] mt-1">Place a trade to see it here</p>
                </div>
              ) : openPositions.map(pos => (
                <div key={pos.id} className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ['even', 'over', 'match'].some(d => pos.direction.startsWith(d))
                      ? 'bg-win/20' : 'bg-loss/20'
                  }`}>
                    {['even', 'over', 'match'].some(d => pos.direction.startsWith(d))
                      ? <TrendingUp size={20} className="text-win" />
                      : <TrendingDown size={20} className="text-loss" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white capitalize">{pos.direction.replace('_', ' ')}</div>
                    <div className="text-xs text-[#5A6380]">{pos.asset} · {pos.trade_type.replace('_', '/')}</div>
                    <div className="mt-2 w-full h-1 bg-[#1a2235] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(pos.ticks_elapsed / pos.ticks_total) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-[#5A6380] mt-1">{pos.ticks_elapsed}/{pos.ticks_total} ticks</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">${pos.stake.toFixed(2)}</div>
                    <div className="text-xs text-win mt-1">+${pos.payout.toFixed(2)} if win</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'closed' && (
            <div className="space-y-3">
              {closedPositions.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle size={32} className="text-[#5A6380] mx-auto mb-3" />
                  <p className="text-[#5A6380]">No closed trades yet</p>
                </div>
              ) : closedPositions.map(pos => (
                <div key={pos.id} className={`bg-[#0d1526] border rounded-2xl p-4 flex items-center gap-4 ${
                  pos.status === 'won' ? 'border-win/20' : 'border-loss/20'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    pos.status === 'won' ? 'bg-win/20' : 'bg-loss/20'
                  }`}>
                    {pos.status === 'won' 
                      ? <CheckCircle size={20} className="text-win" />
                      : <XCircle size={20} className="text-loss" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        pos.status === 'won' ? 'bg-win/20 text-win' : 'bg-loss/20 text-loss'
                      }`}>
                        {pos.status?.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-white capitalize">
                        {pos.direction.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-[#5A6380] mt-1">
                      {pos.asset} · Exit digit: <span className="text-white font-mono">{pos.exit_digit}</span>
                    </div>
                    <div className="text-xs text-[#5A6380]">
                      {pos.closed_at ? formatTime(pos.closed_at) : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-bold text-lg ${
                      pos.profit_loss && pos.profit_loss > 0 ? 'text-win' : 'text-loss'
                    }`}>
                      {pos.profit_loss && pos.profit_loss > 0 ? '+' : ''}
                      {pos.profit_loss?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-[#5A6380]">Bal: ${((pos as any).balance_after || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'transactions' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-16">
                  <Clock size={32} className="text-[#5A6380] mx-auto mb-3" />
                  <p className="text-[#5A6380]">No transactions yet</p>
                </div>
              ) : transactions.map((tx: any) => (
                <div key={tx.id} className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <TrendingUp size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white capitalize">Deposit via {tx.method || 'M-Pesa'}</div>
                    <div className="text-xs text-[#5A6380]">
                      {formatTime(tx.created_at)} · {tx.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-win">+${tx.amount_usd?.toFixed(2) || '0.00'}</div>
                    <div className="text-xs text-[#5A6380]">KES {tx.amount_kes?.toFixed(0)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
