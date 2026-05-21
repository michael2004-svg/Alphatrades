'use client'

import { usePriceStore } from '@/stores/usePriceStore'
import { useTradeStore } from '@/stores/useTradeStore'

export default function DigitBar() {
  const { digitStats, lastDigit } = usePriceStore()
  const { tradeType, selectedDigit, setSelectedDigit } = useTradeStore()

  // Only digits 1–9
  const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  const hotDigit = DIGITS.reduce<number>((max, d) => {
    const pct = digitStats[d]?.percentage ?? 0
    const maxPct = digitStats[max]?.percentage ?? 0
    return pct > maxPct ? d : max
  }, 1)

  const isClickable = tradeType === 'over_under' || tradeType === 'matches_differs'

  return (
    <div className="flex items-start gap-1.5 w-full px-1 py-2">
      {DIGITS.map((d) => {
        const stat = digitStats[d] || { count: 0, percentage: 11.1 }
        const isHot = hotDigit === d
        const isCurrent = lastDigit === d
        const isSelected = selectedDigit === d

        return (
          <button
            key={d}
            type="button"
            onClick={() => {
              if (isClickable) setSelectedDigit(d)
            }}
            className={`flex-1 flex flex-col items-center gap-2 transition-all ${
              isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
            }`}
          >
            {/* Circle */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                isSelected && isClickable
                  ? 'bg-primary text-white shadow-md shadow-primary/40 ring-2 ring-primary/30 scale-110'
                  : isCurrent
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : isHot
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#080d1a] text-[#5a6b8a] border border-[#1a2235]'
              }`}
            >
              {d}
            </div>

            {/* Percentage below */}
            <span
              className={`text-[9px] leading-none font-mono font-semibold transition-colors ${
                isSelected && isClickable
                  ? 'text-primary'
                  : isCurrent
                  ? 'text-white'
                  : 'text-[#5a6b8a]'
              }`}
            >
              {stat.percentage.toFixed(1)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}