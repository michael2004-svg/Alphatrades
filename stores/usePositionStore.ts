import { create } from 'zustand'

// Matches the DB schema exactly including balance_after and settling status
export interface Position {
  id: string
  user_id?: string
  asset: string
  trade_type: string
  direction: string
  stake: number
  payout: number
  status: 'open' | 'won' | 'lost' | 'refunded' | 'settling'
  entry_price: number
  entry_digit: number
  exit_price: number | null
  exit_digit: number | null
  profit_loss: number | null
  ticks_total: number
  ticks_elapsed: number
  selected_digit: number | null
  is_demo: boolean
  is_auto: boolean
  balance_after: number | null
  created_at: string
  closed_at: string | null
}

interface PositionStore {
  openPositions: Position[]
  closedPositions: Position[]
  transactions: any[]

  addOpenPosition: (p: Omit<Position, 'created_at' | 'closed_at' | 'balance_after'> & {
    created_at?: string
    closed_at?: string | null
    balance_after?: number | null
  }) => void
  updatePosition: (id: string, updates: Partial<Position>) => void
  closePosition: (id: string, status: 'won' | 'lost' | 'refunded', exitData: Partial<Position>) => void
  setClosedPositions: (positions: Position[]) => void
  setTransactions: (transactions: any[]) => void
  incrementTick: (positionId: string) => void
  clearOpenPositions: () => void
}

export const usePositionStore = create<PositionStore>((set) => ({
  openPositions: [],
  closedPositions: [],
  transactions: [],

  addOpenPosition: (position) => set((state) => ({
    openPositions: [
      {
        created_at: new Date().toISOString(),
        closed_at: null,
        balance_after: null,
        is_auto: false,
        ...position,
      },
      ...state.openPositions,
    ],
  })),

  updatePosition: (id, updates) => set((state) => ({
    openPositions: state.openPositions.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  closePosition: (id, status, exitData) => set((state) => {
    const position = state.openPositions.find((p) => p.id === id)
    if (!position) return state

    const closed: Position = {
      ...position,
      ...exitData,
      status,
      closed_at: exitData.closed_at || new Date().toISOString(),
    }

    return {
      openPositions: state.openPositions.filter((p) => p.id !== id),
      // Prepend and cap closed history at 200
      closedPositions: [closed, ...state.closedPositions].slice(0, 200),
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

  clearOpenPositions: () => set({ openPositions: [] }),
}))