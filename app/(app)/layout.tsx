'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import Navbar from '@/components/ui/Navbar'
import TabBar from '@/components/ui/TabBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setProfile, setRealBalance, setDemoBalance } = useUserStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const isDemo = typeof window !== 'undefined' &&
        window.location.search.includes('demo=true')

      const { data: { session } } = await supabase.auth.getSession()

      if (!session && !isDemo) {
        router.push('/login')
        return
      }

      // FIX: always seed demo balance so demo trading works without a session
      setDemoBalance(10000)

      if (session?.user) {
        setUser(session.user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) setProfile(profile)

        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (wallet) {
          setRealBalance(wallet.real_balance)
          setDemoBalance(wallet.demo_balance)
        } else {
          // No wallet row yet — keep the seeded demo balance
          setRealBalance(0)
        }
      }

      setInitialized(true)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#04060f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="font-display text-white text-lg tracking-tight">Alphatrades</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#04060f] flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16 lg:pb-0">
        {children}
      </main>
      <TabBar />
    </div>
  )
}