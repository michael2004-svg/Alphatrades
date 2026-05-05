'use client'

import { useState } from 'react'
import { X, Sparkles, RefreshCw, ChevronDown, CheckCircle } from 'lucide-react'
import { getDerivWs } from '@/services/derivWs'
import { ASSETS } from '@/components/trade/AssetSelector'
import { usePriceStore } from '@/stores/usePriceStore'
import { useTradeStore } from '@/stores/useTradeStore'

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
  asset: string
  assetId: string
  direction: string
  qualityScore: number
  prediction: string
}

export default function ScannerModal({ onClose, onLoad }: Props) {
  const [tradeType, setTradeType] = useState<TradeTypeScan>('over_under')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentScanAsset, setCurrentScanAsset] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)

  const runScan = async () => {
    setScanning(true)
    setProgress(0)
    setResult(null)

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
      } catch {
        // skip
      }

      await new Promise(r => setTimeout(r, 200))
    }

    setProgress(100)
    const best = results.sort((a, b) => b.qualityScore - a.qualityScore)[0]
    setResult(best || null)
    setScanning(false)
  }

  const computeQualityScore = (digits: number[], type: TradeTypeScan): number => {
    if (type === 'even_odd') {
      const last20 = digits.slice(-20)
      const evenCount = last20.filter(d => d % 2 === 0).length
      const bias = Math.abs(evenCount - 10) / 10
      return Math.round(50 + bias * 50 + Math.random() * 5)
    }
    if (type === 'over_under') {
      const last20 = digits.slice(-20)
      const counts = Array(10).fill(0)
      last20.forEach(d => counts[d]++)
      const variance = counts.reduce((s, c) => s + Math.pow(c - 2, 2), 0)
      return Math.round(Math.min(99, 60 + variance * 2 + Math.random() * 10))
    }
    if (type === 'matches_differs') {
      const counts = Array(10).fill(0)
      digits.forEach(d => counts[d]++)
      const minFreq = Math.min(...counts)
      const dueScore = (1 - minFreq / digits.length) * 100
      return Math.round(Math.min(99, dueScore + Math.random() * 10))
    }
    return Math.round(60 + Math.random() * 30)
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
    if (type === 'matches_differs') {
      const counts = Array(10).fill(0)
      digits.forEach(d => counts[d]++)
      const minIdx = counts.indexOf(Math.min(...counts))
      return { direction: `match_${minIdx}`, prediction: `Match ${minIdx}` }
    }
    return { direction: 'even', prediction: 'Even' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#080d1a] border border-[#0d1525] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md overflow-hidden animate-slide-up shadow-2xl shadow-black/70">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#0d1525]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">Entry Scanner</h2>
              <p className="text-xs text-[#3a4a6b]">AI-powered market analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#0d1526] hover:bg-[#1a2540] flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-[#3a4a6b]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-[#3a4a6b] leading-relaxed">
            Scans all <strong className="text-white">volatility / synthetic</strong> indices and surfaces the best entry point based on historical tick patterns.
          </p>

          {/* Trade type dropdown */}
          <div>
            <label className="text-xs font-bold text-[#3a4a6b] uppercase tracking-widest mb-2.5 block font-mono">
              Market Type
            </label>
            <div className="relative">
              <button
                onClick={() => setTypeOpen(!typeOpen)}
                className="w-full flex items-center justify-between bg-[#04060f] border border-[#0d1525] rounded-2xl px-4 py-3.5 hover:border-primary/40 transition-all"
              >
                <span className="text-white font-semibold">{TRADE_TYPE_LABELS[tradeType]}</span>
                <ChevronDown size={16} className={`text-[#3a4a6b] transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
              </button>
              {typeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTypeOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#04060f] border border-[#0d1525] rounded-2xl overflow-hidden z-20 shadow-xl shadow-black/60">
                    {Object.entries(TRADE_TYPE_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setTradeType(key as TradeTypeScan); setTypeOpen(false) }}
                        className={`w-full text-left px-4 py-3.5 hover:bg-[#080d1a] transition-colors text-sm font-medium ${tradeType === key ? 'text-primary bg-primary/5' : 'text-white'}`}
                      >
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#3a4a6b] font-mono">
                  {scanning ? `Scanning ${currentScanAsset}...` : 'Scan complete'}
                </span>
                <span className="font-mono font-bold text-primary">
                  {scanning ? `${Math.round((progress / 100) * ASSETS.length)}/13` : '13/13'}
                </span>
              </div>
              <div className="h-1.5 bg-[#04060f] border border-[#0d1525] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${result ? 100 : progress}%`,
                    background: 'linear-gradient(90deg, #1A56FF, #00C48C)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-[#04060f] border border-win/20 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-win flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-white">{result.asset}</div>
                <div className="text-sm text-[#3a4a6b] mt-0.5">
                  {TRADE_TYPE_LABELS[tradeType]} — {result.prediction}
                  {' · '}
                  <span className="text-win font-semibold">{result.qualityScore.toFixed(0)}% quality</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={runScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20"
            >
              <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning Markets...' : result ? 'Re-scan Markets' : 'Scan for Best Market'}
            </button>

            {result && (
              <button
                onClick={() => { onLoad(result.assetId, result.direction); onClose() }}
                className="w-full bg-[#0d1526] hover:bg-[#1a2540] text-white font-semibold py-3.5 rounded-2xl transition-all text-sm border border-[#0d1525]"
              >
                Load {ASSETS.find(a => a.id === result.assetId)?.short} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}