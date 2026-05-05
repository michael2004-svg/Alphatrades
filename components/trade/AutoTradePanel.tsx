'use client'

import { useTradeStore } from '@/stores/useTradeStore'

export default function AutoTradePanel() {
  const { autoConfig, setAutoConfig } = useTradeStore()

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {/* Target Profit */}
      <div className="bg-[#04060f] border border-[#0d1525] rounded-2xl p-3.5 space-y-1.5 focus-within:border-emerald-500/30 transition-all">
        <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Target</div>
        <div className="flex items-center gap-1">
          <span className="text-[#3a4a6b] text-sm font-semibold font-mono">$</span>
          <input
            type="number"
            value={autoConfig.targetProfit}
            onChange={(e) => setAutoConfig({ targetProfit: parseFloat(e.target.value) || 0 })}
            className="w-full bg-transparent font-mono font-bold text-white focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Stop Loss */}
      <div className="bg-[#04060f] border border-[#0d1525] rounded-2xl p-3.5 space-y-1.5 focus-within:border-red-500/30 transition-all">
        <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest font-mono">Stop Loss</div>
        <div className="flex items-center gap-1">
          <span className="text-[#3a4a6b] text-sm font-semibold font-mono">$</span>
          <input
            type="number"
            value={autoConfig.stopLoss}
            onChange={(e) => setAutoConfig({ stopLoss: parseFloat(e.target.value) || 0 })}
            className="w-full bg-transparent font-mono font-bold text-white focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Multiplier */}
      <div className="bg-[#04060f] border border-[#0d1525] rounded-2xl p-3.5 space-y-1.5 focus-within:border-amber-500/30 transition-all">
        <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">Multiplier</div>
        <div className="flex items-center gap-1">
          <span className="text-[#3a4a6b] text-sm font-semibold font-mono">×</span>
          <input
            type="number"
            value={autoConfig.lossMultiplier}
            onChange={(e) => setAutoConfig({ lossMultiplier: parseFloat(e.target.value) || 1 })}
            min="1"
            max="10"
            step="0.5"
            className="w-full bg-transparent font-mono font-bold text-white focus:outline-none text-sm"
          />
        </div>
      </div>
    </div>
  )
}