import { create } from 'zustand'

export interface Position {
  id: string
  asset: string
  trade_type: string
  direction: string
  stake: number
  payout: number
  status: 'open' | 'won' | 'lost' | 'refunded'
  entry_price: number
  entry_digit: number
  exit_price: number | null
  exit_digit: number | null
  profit_loss: number | null
  ticks_total: number
  ticks_elapsed: number
  selected_digit: number | null
  is_demo: boolean
  created_at: string
  closed_at: string | null
}

interface PositionStore {
  openPositions: Position[]
  closedPositions: Position[]
  transactions: any[]
  addOpenPosition: (p: Position) => void
  updatePosition: (id: string, updates: Partial<Position>) => void
  closePosition: (id: string, status: 'won' | 'lost', exitData: Partial<Position>) => void
  setClosedPositions: (positions: Position[]) => void
  setTransactions: (transactions: any[]) => void
  incrementTick: (positionId: string) => void
}

export const usePositionStore = create<PositionStore>((set) => ({
  openPositions: [],
  closedPositions: [],
  transactions: [],

  addOpenPosition: (position) => set((state) => ({
    openPositions: [position, ...state.openPositions],
  })),

  updatePosition: (id, updates) => set((state) => ({
    openPositions: state.openPositions.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  closePosition: (id, status, exitData) => set((state) => {
    const position = state.openPositions.find((p) => p.id === id)
    if (!position) return state

    const closed = { ...position, ...exitData, status }
    return {
      openPositions: state.openPositions.filter((p) => p.id !== id),
      closedPositions: [closed, ...state.closedPositions],
    }
  }),

  setClosedPositions: (positions) => set({ closedPositions: positions }),
  setTransactions: (transactions) => set({ transactions }),

  incrementTick: (positionId) => set((state) => ({
    openPositions: state.openPositions.map((p) =>
      p.id === positionId
        ? { ...p, ticks_elapsed: p.ticks_elapsed + 1 }
        : p
    ),
  })),
}))
