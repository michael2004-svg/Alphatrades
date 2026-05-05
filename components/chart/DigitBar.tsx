'use client'

import { usePriceStore } from '@/stores/usePriceStore'
import { useTradeStore } from '@/stores/useTradeStore'

export default function DigitBar() {
  const { digitStats, lastDigit } = usePriceStore()
  const { tradeType, selectedDigit, setSelectedDigit } = useTradeStore()

  const maxPct = Math.max(...Object.values(digitStats).map(s => s.percentage), 1)
  const hotDigit = Object.entries(digitStats).reduce((max, [d, s]) =>
    s.percentage > (digitStats[parseInt(max)]?.percentage || 0) ? d : max, '0'
  )

  const isClickable = tradeType === 'over_under' || tradeType === 'matches_differs'

  return (
    <div className="flex items-end gap-1 w-full px-1">
      {Array.from({ length: 10 }, (_, d) => {
        const stat = digitStats[d] || { count: 0, percentage: 10 }
        const isHot = parseInt(hotDigit) === d
        const isCurrent = lastDigit === d
        const isSelected = isClickable && selectedDigit === d
        const barHeight = Math.max((stat.percentage / maxPct) * 52, 4)

        return (
          <button
            key={d}
            onClick={() => isClickable && setSelectedDigit(d)}
            className={`flex-1 flex flex-col items-center gap-1 group transition-all ${
              isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
            }`}
          >
            <span className={`text-[9px] font-mono font-semibold transition-colors ${
              isCurrent ? 'text-white' : 'text-[#3a4a6b]'
            }`}>
              {stat.percentage.toFixed(1)}%
            </span>

            <div className="relative w-full flex flex-col items-center">
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${
                  isSelected
                    ? 'bg-primary shadow-md shadow-primary/35'
                    : isHot
                    ? 'bg-emerald-500/60'
                    : isCurrent
                    ? 'bg-primary/45'
                    : 'bg-[#0d1525]'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            </div>

            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
              isSelected
                ? 'bg-primary text-white shadow-md shadow-primary/35 ring-2 ring-primary/25'
                : isCurrent
                ? 'bg-primary/20 text-primary border border-primary/40'
                : isHot
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                : 'bg-[#080d1a] text-[#3a4a6b] border border-[#0d1525]'
            }`}>
              {d}
            </div>
          </button>
        )
      })}
    </div>
  )
}