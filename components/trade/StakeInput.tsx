'use client'

import { useTradeStore } from '@/stores/useTradeStore'
import { useUserStore } from '@/stores/useUserStore'
import { Minus, Plus } from 'lucide-react'

const QUICK_STAKES = [1, 5, 10, 25, 50, 100]

export default function StakeInput() {
  const { stake, setStake, ticks, setTicks } = useTradeStore()
  const { sessionPL, sessionStats } = useUserStore()

  const sessionPLStr = sessionPL >= 0
    ? `+$${sessionPL.toFixed(2)}`
    : `-$${Math.abs(sessionPL).toFixed(2)}`

  return (
    <div className="space-y-2.5">
      {/* Stake row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStake(Math.max(0.1, stake >= 10 ? stake - 5 : stake - 1))}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#080d1a] border border-[#0d1525] flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all flex-shrink-0 text-[#3a4a6b] active:scale-95"
        >
          <Minus size={15} />
        </button>

        <div className="flex-1 bg-[#080d1a] border border-[#0d1525] rounded-xl px-3 py-2.5 flex items-center gap-2 focus-within:border-primary/40 transition-all min-w-0">
          <span className="text-[#3a4a6b] text-[9px] font-bold tracking-widest font-mono flex-shrink-0">STAKE</span>
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
            className="flex-1 bg-transparent text-center font-mono font-bold text-lg text-white focus:outline-none min-w-0"
          />
          <span className="text-[#3a4a6b] text-[9px] font-semibold font-mono flex-shrink-0">USD</span>
        </div>

        <button
          onClick={() => setStake(stake >= 10 ? stake + 5 : stake + 1)}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#080d1a] border border-[#0d1525] flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all flex-shrink-0 text-[#3a4a6b] active:scale-95"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Quick stakes */}
      <div className="grid grid-cols-6 gap-1">
        {QUICK_STAKES.map((s) => (
          <button
            key={s}
            onClick={() => setStake(s)}
            className={`py-2 rounded-lg text-[11px] font-bold font-mono transition-all active:scale-95 ${
              stake === s
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-[#080d1a] border border-[#0d1525] text-[#3a4a6b] hover:border-primary/40 hover:text-white'
            }`}
          >
            ${s}
          </button>
        ))}
      </div>

      {/* Ticks selector */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-[#3a4a6b] uppercase tracking-widest font-mono flex-shrink-0">TICKS</span>
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 5, 10].map((t) => (
            <button
              key={t}
              onClick={() => setTicks(t)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all active:scale-95 ${
                ticks === t
                  ? 'bg-primary text-white shadow-sm shadow-primary/25'
                  : 'bg-[#080d1a] border border-[#0d1525] text-[#3a4a6b] hover:border-primary/40 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Session P/L */}
      {sessionStats.total > 0 && (
        <div className="flex items-center justify-between bg-[#04060f] border border-[#0d1525] rounded-xl px-3 py-2">
          <span className="text-[10px] text-[#3a4a6b] font-mono">
            {sessionStats.total} trades · {sessionStats.wins}W / {sessionStats.losses}L
          </span>
          <span className={`text-[11px] font-bold font-mono tabular-nums ${sessionPL >= 0 ? 'text-win' : 'text-loss'}`}>
            {sessionPLStr}
          </span>
        </div>
      )}
    </div>
  )
}