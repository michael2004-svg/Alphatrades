import { create } from 'zustand'

interface SessionStats {
  wins: number
  losses: number
  total: number
}

interface UserStore {
  user: any | null
  profile: any | null
  realBalance: number
  demoBalance: number
  isDemo: boolean
  sessionPL: number
  sessionStats: SessionStats
  setUser: (user: any) => void
  setProfile: (profile: any) => void
  setRealBalance: (balance: number) => void
  setDemoBalance: (balance: number) => void
  toggleDemo: () => void
  updateSessionPL: (amount: number, won: boolean) => void
  resetSession: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  profile: null,
  realBalance: 0,
  demoBalance: 10000,
  isDemo: true,
  sessionPL: 0,
  sessionStats: { wins: 0, losses: 0, total: 0 },

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setRealBalance: (realBalance) => set({ realBalance }),
  setDemoBalance: (demoBalance) => set({ demoBalance }),
  toggleDemo: () => set((state) => ({ isDemo: !state.isDemo })),
  
  updateSessionPL: (amount, won) => set((state) => ({
    sessionPL: state.sessionPL + amount,
    sessionStats: {
      wins: state.sessionStats.wins + (won ? 1 : 0),
      losses: state.sessionStats.losses + (won ? 0 : 1),
      total: state.sessionStats.total + 1,
    },
  })),
  
  resetSession: () => set({
    sessionPL: 0,
    sessionStats: { wins: 0, losses: 0, total: 0 },
  }),
}))
