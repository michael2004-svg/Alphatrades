'use client'

import { useState } from 'react'
import { ChevronDown, Activity } from 'lucide-react'
import { usePriceStore } from '@/stores/usePriceStore'

export const ASSETS = [
  { id: '1HZ10V',  label: 'Volatility 10 (1s) Index',  short: 'Vol 10 (1s)'  },
  { id: 'R_10',    label: 'Volatility 10 Index',        short: 'Vol 10'       },
  { id: '1HZ25V',  label: 'Volatility 25 (1s) Index',  short: 'Vol 25 (1s)'  },
  { id: 'R_25',    label: 'Volatility 25 Index',        short: 'Vol 25'       },
  { id: '1HZ50V',  label: 'Volatility 50 (1s) Index',  short: 'Vol 50 (1s)'  },
  { id: 'R_50',    label: 'Volatility 50 Index',        short: 'Vol 50'       },
  { id: '1HZ75V',  label: 'Volatility 75 (1s) Index',  short: 'Vol 75 (1s)'  },
  { id: 'R_75',    label: 'Volatility 75 Index',        short: 'Vol 75'       },
  { id: '1HZ90V',  label: 'Volatility 90 (1s) Index',  short: 'Vol 90 (1s)'  },
  { id: '1HZ100V', label: 'Volatility 100 (1s) Index', short: 'Vol 100 (1s)' },
  { id: 'R_100',   label: 'Volatility 100 Index',       short: 'Vol 100'      },
  { id: '1HZ30V',  label: 'Volatility 30 (1s) Index',  short: 'Vol 30 (1s)'  },
  { id: '1HZ15V',  label: 'Volatility 15 (1s) Index',  short: 'Vol 15 (1s)'  },
]

interface Props {
  onAssetChange: (assetId: string) => void
}

export default function AssetSelector({ onAssetChange }: Props) {
  const { activeAsset, currentPrice } = usePriceStore()
  const [open, setOpen] = useState(false)

  const currentAsset = ASSETS.find(a => a.id === activeAsset) || ASSETS[0]

  const handleSelect = (assetId: string) => {
    onAssetChange(assetId)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 bg-[#080d1a] hover:bg-[#0d1526] border border-[#0d1525] hover:border-primary/35 rounded-2xl px-4 py-3 transition-all w-full"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary/10 rounded-xl flex items-center justify-center">
            <Activity size={14} className="text-primary" />
          </div>
          <span className="font-bold text-white text-sm">{currentAsset.short}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-xs text-[#3a4a6b] tabular-nums">
            {currentPrice > 0 ? currentPrice.toFixed(2) : '—'}
          </span>
          <ChevronDown
            size={15}
            className={`text-[#3a4a6b] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-72 bg-[#080d1a] border border-[#0d1525] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 max-h-72 overflow-y-auto animate-slide-up">
            <div className="px-4 py-2.5 border-b border-[#0d1525]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3a4a6b]">Select Market</p>
            </div>
            {ASSETS.map((asset) => (
              <button
                key={asset.id}
                onClick={() => handleSelect(asset.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0d1526] transition-colors text-left ${
                  activeAsset === asset.id ? 'bg-primary/8 text-primary' : 'text-white'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${activeAsset === asset.id ? 'bg-primary' : 'bg-[#1a2540]'}`} />
                <span className="text-sm flex-1">{asset.label}</span>
                {activeAsset === asset.id && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">LIVE</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}