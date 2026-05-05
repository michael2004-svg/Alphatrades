'use client'

import { useRouter, usePathname } from 'next/navigation'
import { TrendingUp, BarChart2, Wallet, Sparkles } from 'lucide-react'

const tabs = [
  { label: 'Trade', href: '/trade', icon: TrendingUp },
  { label: 'AI Scan', href: '/trade?scanner=true', icon: Sparkles },
  { label: 'Positions', href: '/positions', icon: BarChart2 },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
]

export default function TabBar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#04060f]/96 backdrop-blur-xl border-t border-[#0d1525] px-3 pb-safe">
        <div className="flex items-center justify-around h-[68px] gap-1">
          {tabs.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href.split('?')[0]
            const isScanner = label === 'AI Scan'
            return (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-all ${
                  isScanner
                    ? 'bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 mx-1'
                    : isActive
                    ? 'text-primary'
                    : 'text-[#3a4a6b]'
                }`}
              >
                <Icon
                  size={isScanner ? 21 : 20}
                  className={isScanner ? 'text-primary' : isActive ? 'text-primary' : ''}
                />
                <span className={`text-[10px] font-semibold tracking-tight leading-none ${
                  isScanner ? 'text-primary' : isActive ? 'text-primary' : ''
                }`}>
                  {label}
                </span>
                {isActive && !isScanner && (
                  <span className="w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}