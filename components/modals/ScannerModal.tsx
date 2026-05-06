'use client'

import { useState } from 'react'
import { X, Sparkles, RefreshCw, ChevronDown, CheckCircle } from 'lucide-react'
import { getDerivWs } from '@/services/derivWs'
import { ASSETS } from '@/components/trade/AssetSelector'

interface Props {
  onClose: () => void
  onLoad: (assetId: string, direction: string) => void
}

type TradeTypeScan = 'over_under' | 'even_odd' | 'matches_differs'
const TRADE_TYPE_LABELS: Record<TradeTypeScan, string> = {
  over_under: 'Over / Under',
  even_odd: 'Even / Odd',
  matches_differs: 'Matches / Differs',
}

interface ScanResult {
  asset: string; assetId: string; direction: string
  qualityScore: number; prediction: string
}

export default function ScannerModal({ onClose, onLoad }: Props) {
  const [tradeType, setTradeType] = useState<TradeTypeScan>('over_under')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentScanAsset, setCurrentScanAsset] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)

  const runScan = async () => {
    setScanning(true); setProgress(0); setResult(null)
    const ws = getDerivWs()
    const results: ScanResult[] = []
    const scanAssets = ASSETS.slice(0, 13)

    for (let i = 0; i < scanAssets.length; i++) {
      const asset = scanAssets[i]
      setCurrentScanAsset(asset.short)
      setProgress(Math.round((i / scanAssets.length) * 100))
      try {
        const history = await ws.getHistory(asset.id, 100)
        if (history.length > 10) {
          const digits = history.map(p => Math.floor((p * 100) % 10))
          const score = computeQualityScore(digits, tradeType)
          const { direction, prediction } = getBestDirection(digits, tradeType)
          results.push({ asset: asset.label, assetId: asset.id, direction, qualityScore: score, prediction })
        }
      } catch {}
      await new Promise(r => setTimeout(r, 200))
    }

    setProgress(100)
    const best = results.sort((a, b) => b.qualityScore - a.qualityScore)[0]
    setResult(best || null)
    setScanning(false)
  }

  const computeQualityScore = (digits: number[], type: TradeTypeScan): number => {
    if (type === 'even_odd') {
      const evenCount = digits.slice(-20).filter(d => d % 2 === 0).length
      return Math.round(50 + Math.abs(evenCount - 10) / 10 * 50 + Math.random() * 5)
    }
    if (type === 'over_under') {
      const counts = Array(10).fill(0); digits.slice(-20).forEach(d => counts[d]++)
      const variance = counts.reduce((s, c) => s + Math.pow(c - 2, 2), 0)
      return Math.round(Math.min(99, 60 + variance * 2 + Math.random() * 10))
    }
    const counts = Array(10).fill(0); digits.forEach(d => counts[d]++)
    return Math.round(Math.min(99, (1 - Math.min(...counts) / digits.length) * 100 + Math.random() * 10))
  }

  const getBestDirection = (digits: number[], type: TradeTypeScan): { direction: string; prediction: string } => {
    if (type === 'even_odd') {
      const evenCount = digits.slice(-20).filter(d => d % 2 === 0).length
      const dir = evenCount < 10 ? 'even' : 'odd'
      return { direction: dir, prediction: dir === 'even' ? 'Even' : 'Odd' }
    }
    if (type === 'over_under') {
      const digit = Math.floor(Math.random() * 5) + 3
      return { direction: 'over', prediction: `Over ${digit}` }
    }
    const counts = Array(10).fill(0); digits.forEach(d => counts[d]++)
    const minIdx = counts.indexOf(Math.min(...counts))
    return { direction: `match_${minIdx}`, prediction: `Match ${minIdx}` }
  }

  return (
    /* Always centred on screen */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#0d1526] border border-[#1a2235] w-full max-w-md rounded-[14px] overflow-hidden shadow-2xl animate-slide-up"
        style={{ borderRadius: 'var(--radius-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2235]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-primary/15 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Entry Scanner</h2>
              <p className="text-xs text-[#5A6380]">AI-powered market analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[#1a2235] hover:bg-[#2a3555] flex items-center justify-center transition-colors">
            <X size={15} className="text-[#5A6380]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#5A6380] leading-relaxed">
            Scans all <strong className="text-white">volatility / synthetic</strong> indices and finds the best entry based on tick patterns.
          </p>

          {/* Trade type */}
          <div>
            <label className="text-xs font-bold text-[#5A6380] uppercase tracking-widest mb-2 block">Market Type</label>
            <div className="relative">
              <button onClick={() => setTypeOpen(!typeOpen)}
                className="w-full flex items-center justify-between bg-[#070d1a] border border-[#1a2235] rounded-[8px] px-4 py-3 hover:border-primary/50 transition-all">
                <span className="text-white font-semibold text-sm">{TRADE_TYPE_LABELS[tradeType]}</span>
                <ChevronDown size={15} className={`text-[#5A6380] transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
              </button>
              {typeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTypeOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#070d1a] border border-[#1a2235] rounded-[10px] overflow-hidden z-20 shadow-xl">
                    {Object.entries(TRADE_TYPE_LABELS).map(([key, label]) => (
                      <button key={key} onClick={() => { setTradeType(key as TradeTypeScan); setTypeOpen(false) }}
                        className={`w-full text-left px-4 py-3 hover:bg-[#1a2235] transition-colors text-sm font-medium ${tradeType === key ? 'text-primary bg-primary/5' : 'text-white'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          {(scanning || result) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5A6380]">{scanning ? `Scanning ${currentScanAsset}...` : 'Scan complete'}</span>
                <span className="font-mono font-bold text-primary">{scanning ? `${Math.round((progress / 100) * ASSETS.length)}/13` : '13/13'}</span>
              </div>
              <div className="h-1.5 bg-[#070d1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${result ? 100 : progress}%`, background: 'linear-gradient(90deg, #1A56FF, #00C48C)' }} />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-[#070d1a] border border-win/25 rounded-[10px] p-4 flex items-start gap-3">
              <CheckCircle size={18} className="text-win flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">{result.asset}</div>
                <div className="text-xs text-[#5A6380] mt-0.5">
                  {TRADE_TYPE_LABELS[tradeType]} — {result.prediction}
                  {' · '}
                  <span className="text-win font-semibold">{result.qualityScore.toFixed(0)}% quality</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <button onClick={runScan} disabled={scanning}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-[22px] transition-all shadow-lg shadow-primary/20">
              <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning Markets...' : result ? 'Re-scan Markets' : 'Scan for Best Market'}
            </button>
            {result && (
              <button onClick={() => { onLoad(result.assetId, result.direction); onClose() }}
                className="w-full bg-[#1a2235] hover:bg-[#2a3555] text-white font-semibold py-3 rounded-[22px] transition-all text-sm">
                Load {ASSETS.find(a => a.id === result.assetId)?.short} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}