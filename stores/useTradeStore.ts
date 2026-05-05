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
  setTradeType: (t: 'even_odd' | 'matches_differs' | 'over_under') => void
  setDirection: (d: string | null) => void
  setStake: (s: number) => void
  setSelectedDigit: (d: number) => void
  setTicks: (t: number) => void
  setMode: (m: 'manual' | 'auto') => void
  setAutoConfig: (c: Partial<AutoConfig>) => void
  setIsAutoRunning: (r: boolean) => void
}

export const useTradeStore = create<TradeStore>((set) => ({
  tradeType: 'even_odd',
  direction: null,
  stake: 10,
  selectedDigit: 5,
  ticks: 5,
  mode: 'manual',
  autoConfig: {
    targetProfit: 200,
    stopLoss: 999,
    lossMultiplier: 2,
  },
  isAutoRunning: false,

  setTradeType: (tradeType) => set({ tradeType, direction: null }),
  setDirection: (direction) => set({ direction }),
  setStake: (stake) => set({ stake }),
  setSelectedDigit: (selectedDigit) => set({ selectedDigit }),
  setTicks: (ticks) => set({ ticks }),
  setMode: (mode) => set({ mode }),
  setAutoConfig: (config) => set((state) => ({ 
    autoConfig: { ...state.autoConfig, ...config } 
  })),
  setIsAutoRunning: (isAutoRunning) => set({ isAutoRunning }),
}))

