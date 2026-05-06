import { create } from 'zustand'

interface DigitStat {
  count: number
  percentage: number
}

interface PriceStore {
  ticks: number[]
  currentPrice: number
  lastDigit: number
  digitStats: Record<number, DigitStat>
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  activeAsset: string
  addTick: (price: number, digit: number) => void
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void
  setActiveAsset: (asset: string) => void
  clearTicks: () => void
}

const defaultDigitStats = (): Record<number, DigitStat> =>
  Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [i, { count: 0, percentage: 10 }])
  )

export const usePriceStore = create<PriceStore>((set) => ({
  ticks: [],
  currentPrice: 0,
  lastDigit: 0,
  digitStats: defaultDigitStats(),
  connectionStatus: 'disconnected',
  activeAsset: '1HZ10V',

  addTick: (price: number, digit: number) => {
    set((state) => {
      // Keep last 500 ticks for chart, cap at 500
      const newTicks = state.ticks.length >= 500
        ? [...state.ticks.slice(-499), price]
        : [...state.ticks, price]

      // Digit stats computed from last 100 ticks
      const recentTicks = newTicks.slice(-100)
      const newDigitStats: Record<number, DigitStat> = {}

      for (let d = 0; d <= 9; d++) {
        const count = recentTicks.filter(t => {
          // Consistent digit extraction matching derivWs
          return parseInt(t.toFixed(2).slice(-1), 10) === d
        }).length
        newDigitStats[d] = {
          count,
          percentage: recentTicks.length > 0
            ? (count / recentTicks.length) * 100
            : 10,
        }
      }

      return {
        ticks: newTicks,
        currentPrice: price,
        lastDigit: digit,
        digitStats: newDigitStats,
      }
    })
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setActiveAsset: (asset) => set({ activeAsset: asset }),

  clearTicks: () => set({
    ticks: [],
    currentPrice: 0,
    lastDigit: 0,
    digitStats: defaultDigitStats(),
  }),
}))