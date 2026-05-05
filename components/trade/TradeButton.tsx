'use client'

import { useState, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  payout: string
  payoutPct: string
  direction: 'up' | 'down' | 'neutral'
  disabled?: boolean
  onTrade: () => Promise<void>
}

export default function TradeButton({
  label, payout, payoutPct, direction, disabled, onTrade
}: Props) {
  const [filling, setFilling] = useState(false)
  const [fillWidth, setFillWidth] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const HOLD_DURATION = 800

  const bgClass =
    direction === 'up'
      ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30'
      : direction === 'down'
      ? 'bg-gradient-to-b from-red-500 to-red-700 shadow-lg shadow-red-500/30'
      : 'bg-gradient-to-b from-primary to-blue-700 shadow-lg shadow-primary/30'

  const hoverClass =
    direction === 'up'
      ? 'hover:from-emerald-400 hover:to-emerald-600'
      : direction === 'down'
      ? 'hover:from-red-400 hover:to-red-600'
      : 'hover:from-primary hover:to-primary-dark'

  const startHold = useCallback(() => {
    if (disabled) return
    setFilling(true)
    setFillWidth(0)
    startTimeRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setFillWidth(pct)

      if (pct >= 100) {
        clearInterval(intervalRef.current!)
        setFilling(false)
        setFillWidth(0)
        onTrade()
      }
    }, 16)
  }, [disabled, onTrade])

  const cancelHold = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setFilling(false)
    setFillWidth(0)
  }, [])

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      disabled={disabled}
      className={`relative overflow-hidden flex flex-col items-center justify-center py-5 px-4 rounded-2xl flex-1 transition-all select-none ${bgClass} ${hoverClass} ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'
      }`}
      style={{ userSelect: 'none' }}
    >
      {/* Top highlight edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/20 rounded-t-2xl" />

      {/* Fill animation overlay */}
      {filling && (
        <div
          className="absolute inset-0 bg-white/20 transition-none"
          style={{ width: `${fillWidth}%`, left: 0 }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          {direction === 'up' && <TrendingUp size={20} className="text-white" />}
          {direction === 'down' && <TrendingDown size={20} className="text-white" />}
          <span className="font-display font-bold text-xl text-white tracking-tight">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/90 text-sm font-bold">{payout}</span>
          <span className="text-white/50 text-xs">payout</span>
        </div>
        <span className="text-white/50 text-[11px] font-mono">{payoutPct}</span>
      </div>

      {/* Progress bar at bottom */}
      {filling && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-2xl">
          <div
            className="h-full bg-white/80 rounded-b-2xl transition-none"
            style={{ width: `${fillWidth}%` }}
          />
        </div>
      )}
    </button>
  )
}