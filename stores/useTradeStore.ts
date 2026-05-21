import { create } from 'zustand'

interface AutoConfig {
  targetProfit: number
  stopLoss: number
  lossMultiplier: number
}

interface TradeStore {
  tradeType: 'even_odd' | 'matches_differs' | 'over_under'
  direction: string | null
  stake: number
  selectedDigit: number
  ticks: number
  mode: 'manual' | 'auto'
  autoConfig: AutoConfig
  isAutoRunning: boolean
  autoSessionProfit: number
  autoTradeCount: number

  setTradeType: (t: 'even_odd' | 'matches_differs' | 'over_under') => void
  setDirection: (d: string | null) => void
  setStake: (s: number) => void
  setSelectedDigit: (d: number) => void
  setTicks: (t: number) => void
  setMode: (m: 'manual' | 'auto') => void
  setAutoConfig: (c: Partial<AutoConfig>) => void
  setIsAutoRunning: (r: boolean) => void
  recordAutoResult: (profitLoss: number) => void
  resetAutoSession: () => void
}

export const useTradeStore = create<TradeStore>((set) => ({
  tradeType: 'even_odd',
  direction: null,
  stake: 10,
  selectedDigit: 5, // default digit (1-9 range)
  ticks: 5,
  mode: 'manual',
  autoConfig: {
    targetProfit: 200,
    stopLoss: 999,
    lossMultiplier: 2,
  },
  isAutoRunning: false,
  autoSessionProfit: 0,
  autoTradeCount: 0,

  setTradeType: (tradeType) => set({ tradeType, direction: null }),
  setDirection: (direction) => set({ direction }),
  setStake: (stake) => set({ stake: Math.max(0.1, stake) }),
  // Clamp selectedDigit to 1–9 only
  setSelectedDigit: (d) => set({ selectedDigit: Math.max(1, Math.min(9, d)) }),
  setTicks: (ticks) => set({ ticks: Math.max(1, Math.min(ticks, 10)) }),
  setMode: (mode) => set({ mode }),
  setAutoConfig: (config) => set((state) => ({
    autoConfig: { ...state.autoConfig, ...config }
  })),
  setIsAutoRunning: (isAutoRunning) => set({ isAutoRunning }),

  recordAutoResult: (profitLoss) => set((state) => ({
    autoSessionProfit: state.autoSessionProfit + profitLoss,
    autoTradeCount: state.autoTradeCount + 1,
    stake: profitLoss < 0
      ? Math.min(state.stake * state.autoConfig.lossMultiplier, 10000)
      : state.stake,
  })),

  resetAutoSession: () => set(() => ({
    autoSessionProfit: 0,
    autoTradeCount: 0,
    isAutoRunning: false,
    stake: 10,
  })),
}))