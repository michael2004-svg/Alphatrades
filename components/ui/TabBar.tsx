'use client'

import { useRouter, usePathname } from 'next/navigation'
import { BarChart2, Wallet, Sparkles, TrendingUp } from 'lucide-react'

const tabs = [
  { label: 'Trade',     href: '/trade',             icon: TrendingUp             },
  { label: 'AI Scan',   href: '/trade?scanner=true', icon: Sparkles, isScan: true },
  { label: 'Positions', href: '/positions',          icon: BarChart2              },
  { label: 'Wallet',    href: '/wallet',             icon: Wallet                 },
]

export default function TabBar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[55]">
      <div className="bg-[#070d1a]/97 backdrop-blur-xl border-t border-[#1a2235] px-2 pb-safe">
        <div className="flex items-center h-16 gap-1">
          {tabs.map(({ label, href, icon: Icon, isScan }) => {
            const isActive = pathname === href.split('?')[0]
            return (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2 flex-1 rounded-xl transition-all touch-manipulation active:scale-95
                  ${isScan
                    ? 'bg-primary/15 border border-primary/30 mx-0.5'
                    : ''}
                  ${isActive && !isScan ? 'text-primary' : isScan ? 'text-primary' : 'text-[#5A6380]'}
                `}
              >
                <Icon size={19} strokeWidth={isActive && !isScan ? 2.5 : 1.8} />
                <span className="text-[9px] font-semibold leading-none whitespace-nowrap tracking-wide">{label}</span>
                {isActive && !isScan && (
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