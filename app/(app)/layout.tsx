'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { getDerivWs } from '@/services/derivWs'
import Navbar from '@/components/ui/Navbar'
import TabBar from '@/components/ui/TabBar'

const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    setUser, setProfile, setRealBalance,
    setDemoBalance, setIsDemo, user,
  } = useUserStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Eagerly connect WS on app mount — not waiting for auth
    getDerivWs().connect()

    const initAuth = async () => {
      // supabase.auth.getSession() reads from localStorage — no network call
      const { data: { session } } = await supabase.auth.getSession()
      const savedMode = typeof window !== 'undefined'
        ? localStorage.getItem('Alphatrades_mode')
        : null
      const isDemoMode = savedMode === 'demo' || !session

      if (!session) {
        // No session — allow demo mode, redirect to login only for protected routes
        setIsDemo(true)
        setDemoBalance(10000)
        setInitialized(true)

        const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
        if (!isAuthRoute && savedMode !== 'demo') {
          router.push('/login')
        }
        return
      }

      // Restore authenticated session immediately from local storage
      setUser(session.user)
      setIsDemo(isDemoMode)

      setInitialized(true) // Show UI immediately — don't wait for DB

      // Fetch profile + wallet in background (non-blocking)
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => { if (data) setProfile(data) })

      supabase
        .from('wallets')
        .select('real_balance, demo_balance')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setRealBalance(data.real_balance ?? 0)
            setDemoBalance(data.demo_balance ?? 10000)
          }
        })
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('Alphatrades_mode')
          router.push('/login')
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          setUser(session.user)
          const savedMode = localStorage.getItem('Alphatrades_mode')
          setIsDemo(savedMode === 'demo')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Auth pages never show navbar/tabbar
  const isAuthPage = AUTH_ROUTES.some(r => pathname.startsWith(r))
  if (isAuthPage) return <>{children}</>

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-[10px] bg-primary/20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-[#5A6380]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d1a] flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <TabBar />
    </div>
  )
}