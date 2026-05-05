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

export const usePriceStore = create<PriceStore>((set, get) => ({
  ticks: [],
  currentPrice: 0,
  lastDigit: 0,
  digitStats: Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [i, { count: 0, percentage: 10 }])
  ),
  connectionStatus: 'disconnected',
  activeAsset: '1HZ10V',

  addTick: (price: number, digit: number) => {
    set((state) => {
      const newTicks = [...state.ticks, price].slice(-500)
      
      // Recalculate digit stats from last 100 ticks
      const recentTicks = newTicks.slice(-100)
      const newDigitStats: Record<number, DigitStat> = {}
      
      for (let d = 0; d <= 9; d++) {
        const count = recentTicks.filter(t => {
          const tickDigit = Math.floor((t * 100) % 10)
          return tickDigit === d
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
    digitStats: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [i, { count: 0, percentage: 10 }])
    )
  }),
}))
