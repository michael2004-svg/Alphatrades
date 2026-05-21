'use client'

import { Square, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  payout: string
  payoutPct: string
  direction: 'up' | 'down' | 'neutral'
  disabled?: boolean
  onTrade: () => void
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
    ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/20'
    : isDown
    ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/20'
    : 'bg-gradient-to-b from-primary to-primary-dark shadow-lg shadow-primary/20'

  const stopBgClass = isUp
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-red-600 hover:bg-red-700'

  if (isAutoMode && isAutoRunning) {
    return (
      <button
        onClick={onStopAuto}
        className={`relative flex flex-col items-center justify-center py-4 sm:py-5 px-3 rounded-xl flex-1 transition-all ${stopBgClass} active:scale-[0.97] touch-manipulation`}
      >
        <Square size={18} className="text-white mb-1" fill="white" />
        <span className="font-display font-bold text-sm sm:text-base text-white">STOP</span>
        <span className="text-white/70 text-[10px] mt-0.5">Auto running</span>
      </button>
    )
  }

  return (
    <button
      onClick={disabled ? undefined : onTrade}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center py-4 sm:py-5 px-3 rounded-xl flex-1 transition-all select-none touch-manipulation
        ${bgClass}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'}
      `}
    >
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="flex items-center gap-1.5">
          {isUp && <TrendingUp size={16} className="text-white flex-shrink-0" />}
          {isDown && <TrendingDown size={16} className="text-white flex-shrink-0" />}
          <span className="font-display font-bold text-sm sm:text-base text-white leading-tight">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-xs sm:text-sm">{payout}</span>
          <span className="text-white/60 text-[10px]">{payoutPct}</span>
        </div>
      </div>
    </button>
  )
}