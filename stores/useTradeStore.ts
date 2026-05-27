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
  baseStake: number  // FIX: track base stake before martingale to reset correctly

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
  baseStake: 10,
  selectedDigit: 5,
  ticks: 1,
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
  setStake: (stake) => set({ stake: Math.max(0.1, stake), baseStake: Math.max(0.1, stake) }),
  setSelectedDigit: (d) => set({ selectedDigit: Math.max(0, Math.min(9, d)) }),
  setTicks: (ticks) => set({ ticks: Math.max(1, Math.min(ticks, 10)) }),
  setMode: (mode) => set({ mode }),
  setAutoConfig: (config) => set((state) => ({
    autoConfig: { ...state.autoConfig, ...config }
  })),
  setIsAutoRunning: (isAutoRunning) => set({ isAutoRunning }),

  recordAutoResult: (profitLoss) => set((state) => ({
    autoSessionProfit: state.autoSessionProfit + profitLoss,
    autoTradeCount: state.autoTradeCount + 1,
    // Martingale: multiply on loss, reset to baseStake on win
    stake: profitLoss < 0
      ? Math.min(state.stake * state.autoConfig.lossMultiplier, 10000)
      : state.baseStake,
  })),

  resetAutoSession: () => set((state) => ({
    autoSessionProfit: 0,
    autoTradeCount: 0,
    isAutoRunning: false,
    stake: state.baseStake,  // reset to base, not hardcoded 10
  })),
}))