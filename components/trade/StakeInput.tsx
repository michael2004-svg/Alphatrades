'use client'

import { useTradeStore } from '@/stores/useTradeStore'
import { useUserStore } from '@/stores/useUserStore'
import { Minus, Plus } from 'lucide-react'

const QUICK_STAKES = [1, 5, 10, 25, 50, 100]

export default function StakeInput() {
  const { stake, setStake } = useTradeStore()
  const { sessionPL, sessionStats } = useUserStore()

  const sessionPLStr = sessionPL >= 0
    ? `+$${sessionPL.toFixed(2)}`
    : `-$${Math.abs(sessionPL).toFixed(2)}`

  return (
    <div className="space-y-3">
      {/* Stake row */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setStake(Math.max(0.1, stake - (stake >= 10 ? 5 : 1)))}
          className="w-11 h-11 rounded-2xl bg-[#080d1a] border border-[#0d1525] flex items-center justify-center hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex-shrink-0 text-[#3a4a6b]"
        >
          <Minus size={16} />
        </button>

        <div className="flex-1 bg-[#080d1a] border border-[#0d1525] rounded-2xl px-4 py-3 flex items-center gap-2 focus-within:border-primary/40 transition-all">
          <span className="text-[#3a4a6b] text-[10px] font-bold tracking-widest font-mono">STAKE</span>
          <input
            type="number"
            value={stake}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val) && val >= 0.1) setStake(val)
            }}
            min="0.1"
            max="10000"
            step="1"
            className="flex-1 bg-transparent text-center font-mono font-bold text-xl text-white focus:outline-none"
          />
          <span className="text-[#3a4a6b] text-[10px] font-semibold font-mono">USD</span>
        </div>

        <button
          onClick={() => setStake(stake + (stake >= 10 ? 5 : 1))}
          className="w-11 h-11 rounded-2xl bg-[#080d1a] border border-[#0d1525] flex items-center justify-center hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex-shrink-0 text-[#3a4a6b]"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Quick select */}
      <div className="grid grid-cols-6 gap-1.5">
        {QUICK_STAKES.map((s) => (
          <button
            key={s}
            onClick={() => setStake(s)}
            className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              stake === s
                ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                : 'bg-[#080d1a] border border-[#0d1525] text-[#3a4a6b] hover:border-primary/40 hover:text-white hover:bg-primary/5'
            }`}
          >
            ${s}
          </button>
        ))}
      </div>

      {/* Session P/L */}
      {sessionStats.total > 0 && (
        <div className="flex items-center justify-between bg-[#04060f] border border-[#0d1525] rounded-xl px-3 py-2">
          <span className="text-xs text-[#3a4a6b] font-mono">
            {sessionStats.total} trades · {sessionStats.wins}W / {sessionStats.losses}L
          </span>
          <span className={`text-xs font-bold font-mono tabular-nums ${sessionPL >= 0 ? 'text-win' : 'text-loss'}`}>
            {sessionPLStr}
          </span>
        </div>
      )}
    </div>
  )
}