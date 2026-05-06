'use client'

import { Square, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  payout: string
  payoutPct: string
  direction: 'up' | 'down' | 'neutral'
  disabled?: boolean
  onTrade: () => void
  // Auto mode props
  isAutoMode?: boolean
  isAutoRunning?: boolean
  onStopAuto?: () => void
}

export default function TradeButton({
  label, payout, payoutPct, direction,
  disabled, onTrade,
  isAutoMode, isAutoRunning, onStopAuto,
}: Props) {
  const isUp = direction === 'up'
  const isDown = direction === 'down'

  const bgClass = isUp
    ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25'
    : isDown
    ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25'
    : 'bg-gradient-to-b from-primary to-primary-dark shadow-lg shadow-primary/25'

  const stopBgClass = isUp
    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25'
    : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25'

  // In auto mode, show Stop button if running, otherwise the normal trade button
  if (isAutoMode && isAutoRunning) {
    return (
      <button
        onClick={onStopAuto}
        className={`relative flex flex-col items-center justify-center py-5 px-4 rounded-[10px] flex-1 transition-all ${stopBgClass} active:scale-[0.97]`}
      >
        <Square size={20} className="text-white mb-1" fill="white" />
        <span className="font-display font-bold text-base text-white">STOP</span>
        <span className="text-white/70 text-xs mt-0.5">Auto running</span>
      </button>
    )
  }

  return (
    <button
      onClick={disabled ? undefined : onTrade}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center py-5 px-4 rounded-[10px] flex-1 transition-all select-none
        ${bgClass}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'}
      `}
    >
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Direction icon + label */}
        <div className="flex items-center gap-2">
          {isUp && <TrendingUp size={18} className="text-white" />}
          {isDown && <TrendingDown size={18} className="text-white" />}
          <span className="font-display font-bold text-lg text-white leading-tight">{label}</span>
        </div>
        {/* Payout */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-white font-bold text-sm">{payout}</span>
          <span className="text-white/60 text-xs">{payoutPct}</span>
        </div>
      </div>
    </button>
  )
}