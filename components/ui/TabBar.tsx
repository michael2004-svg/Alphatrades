'use client'

import { useRouter, usePathname } from 'next/navigation'
import { TrendingUp, BarChart2, Wallet, Sparkles } from 'lucide-react'

const tabs = [
  { label: 'Trade',     href: '/trade',               icon: TrendingUp },
  { label: 'AI Scan',  href: '/trade?scanner=true',   icon: Sparkles,  isScan: true },
  { label: 'Positions', href: '/positions',            icon: BarChart2 },
  { label: 'Wallet',   href: '/wallet',               icon: Wallet },
]

export default function TabBar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#070d1a]/96 backdrop-blur-xl border-t border-[#1a2235] px-2 pb-safe">
        <div className="flex items-center h-[62px] gap-1">
          {tabs.map(({ label, href, icon: Icon, isScan }) => {
            const isActive = pathname === href.split('?')[0]
            return (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all
                  ${isScan
                    ? 'flex-[1.2] max-w-[90px] bg-primary/15 border border-primary/30 mx-0.5'
                    : 'flex-1'}
                  ${isActive && !isScan ? 'text-primary' : isScan ? 'text-primary' : 'text-[#5A6380]'}
                `}
              >
                <Icon size={18} />
                <span className="text-[10px] font-semibold leading-none whitespace-nowrap">{label}</span>
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