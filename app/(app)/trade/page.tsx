'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDerivWs } from '@/services/derivWs'
import { usePriceStore } from '@/stores/usePriceStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useUserStore } from '@/stores/useUserStore'
import { usePositionStore } from '@/stores/usePositionStore'
import { placeTrade, settleTrade, calculatePayout } from '@/services/tradeApi'
import PriceChart from '@/components/chart/PriceChart'
import DigitBar from '@/components/chart/DigitBar'
import AssetSelector, { ASSETS } from '@/components/trade/AssetSelector'
import StakeInput from '@/components/trade/StakeInput'
import AutoTradePanel from '@/components/trade/AutoTradePanel'
import TradeButton from '@/components/trade/TradeButton'
import DepositModal from '@/components/modals/DepositModal'
import ScannerModal from '@/components/modals/ScannerModal'
import { Wifi, WifiOff, Loader, Sparkles, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const TRADE_TYPES = [
  { id: 'matches_differs', label: 'Matches/Differs' },
  { id: 'even_odd', label: 'Even/Odd' },
  { id: 'over_under', label: 'Over/Under' },
] as const

// Win/Loss overlay component
function TradeResultOverlay({ result, onDone }: { result: { won: boolean; amount: number } | null; onDone: () => void }) {
  useEffect(() => {
    if (result) {
      const t = setTimeout(onDone, 2000)
      return () => clearTimeout(t)
    }
  }, [result, onDone])

  if (!result) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className={`win-overlay text-center px-10 py-8 rounded-2xl border-2 ${
        result.won 
          ? 'bg-win/20 border-win text-win' 
          : 'bg-loss/20 border-loss text-loss'
      }`}>
        <div className="font-display font-bold text-5xl mb-2">
          {result.won ? '🏆' : '💸'}
        </div>
        <div className="font-display font-bold text-3xl">
          {result.won ? 'WIN!' : 'LOST'}
        </div>
        <div className="font-mono text-xl mt-1">
          {result.won ? '+' : ''}{result.amount.toFixed(2)} USD
        </div>
      </div>
    </div>
  )
}

export default function TradePage() {
  const searchParams = useSearchParams()
  const { 
    ticks, currentPrice, lastDigit, connectionStatus, 
    activeAsset, addTick, setConnectionStatus, setActiveAsset, clearTicks 
  } = usePriceStore()
  const { 
    tradeType, direction, stake, selectedDigit, ticks: tradeTicks, 
    mode, setTradeType, setDirection, setMode, isAutoRunning, setIsAutoRunning
  } = useTradeStore()
  const { isDemo, realBalance, demoBalance, updateSessionPL } = useUserStore()
  const { addOpenPosition, closePosition, openPositions, incrementTick } = usePositionStore()
  
  const [showDeposit, setShowDeposit] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [tradeResult, setTradeResult] = useState<{ won: boolean; amount: number } | null>(null)
  const [placingTrade, setPlacingTrade] = useState(false)
  const [priceFLash, setPriceFlash] = useState(false)
  const prevPriceRef = useRef(0)
  const autoTradeRef = useRef<NodeJS.Timeout | null>(null)

  // Open scanner from URL param
  useEffect(() => {
    if (searchParams.get('scanner') === 'true') {
      setShowScanner(true)
    }
  }, [searchParams])

  // Connect to Deriv WS
  useEffect(() => {
    const ws = getDerivWs()

    const unsubTick = ws.onTick((price, digit, epoch) => {
      // Detect price direction for flash
      if (prevPriceRef.current !== 0 && price !== prevPriceRef.current) {
        setPriceFlash(true)
        setTimeout(() => setPriceFlash(false), 250)
      }
      prevPriceRef.current = price
      addTick(price, digit)

      // Increment tick count for open positions
      openPositions.forEach(pos => incrementTick(pos.id))
    })

    const unsubStatus = ws.onStatus((status) => {
      setConnectionStatus(status)
    })

    ws.connect()
    ws.subscribe(activeAsset)

    return () => {
      unsubTick()
      unsubStatus()
    }
  }, [activeAsset])

  // Open position settlement (client-side for demo)
  useEffect(() => {
    const settlePositions = async () => {
      for (const pos of openPositions) {
        if (pos.ticks_elapsed >= pos.ticks_total && currentPrice > 0) {
          const exitDigit = lastDigit
          const exitPrice = currentPrice
          const result = await settleTrade(
            pos.id, exitPrice, exitDigit, 
            pos.user_id || '', pos.is_demo
          )
          
          if (result) {
            closePosition(pos.id, result.won ? 'won' : 'lost', {
              exit_price: exitPrice,
              exit_digit: exitDigit,
              profit_loss: result.profitLoss,
              closed_at: new Date().toISOString(),
            })
            
            updateSessionPL(result.profitLoss, result.won)
            setTradeResult({ won: result.won, amount: result.profitLoss })
            
            if (result.won) {
              toast.success(`+$${result.profitLoss.toFixed(2)} Won!`, { icon: '🏆' })
            } else {
              toast.error(`-$${Math.abs(result.profitLoss).toFixed(2)} Lost`, { icon: '💸' })
            }
          }
        }
      }
    }

    if (openPositions.length > 0) {
      settlePositions()
    }
  }, [ticks.length])

  const handleAssetChange = useCallback((assetId: string) => {
    setActiveAsset(assetId)
    clearTicks()
    const ws = getDerivWs()
    ws.subscribe(assetId)
  }, [])

  const handleScannerLoad = useCallback((assetId: string, dir: string) => {
    handleAssetChange(assetId)
    setDirection(dir)
  }, [handleAssetChange])

  const handleTrade = useCallback(async (dir: string) => {
    if (placingTrade) return
    if (connectionStatus !== 'connected') {
      toast.error('Not connected to price feed')
      return
    }
    if (currentPrice === 0) {
      toast.error('Waiting for price data...')
      return
    }

    const balance = isDemo ? demoBalance : realBalance
    if (stake > balance) {
      toast.error('Insufficient balance')
      setShowDeposit(true)
      return
    }

    setPlacingTrade(true)

    const result = await placeTrade({
      asset: activeAsset,
      tradeType,
      direction: dir,
      stake,
      ticks: tradeTicks,
      selectedDigit: tradeType !== 'even_odd' ? selectedDigit : undefined,
      isDemo,
      entryPrice: currentPrice,
      entryDigit: lastDigit,
    })

    if (result.success && result.positionId) {
      toast.success('Trade placed!', { icon: '⚡' })
      // Add to local store for tracking
      addOpenPosition({
        id: result.positionId,
        asset: activeAsset,
        trade_type: tradeType,
        direction: dir,
        stake,
        payout: calculatePayout(tradeType, dir, stake, selectedDigit),
        status: 'open',
        entry_price: currentPrice,
        entry_digit: lastDigit,
        exit_price: null,
        exit_digit: null,
        profit_loss: null,
        ticks_total: tradeTicks,
        ticks_elapsed: 0,
        selected_digit: selectedDigit,
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        closed_at: null,
      } as any)
    } else {
      toast.error(result.error || 'Trade failed')
    }

    setPlacingTrade(false)
  }, [
    placingTrade, connectionStatus, currentPrice, isDemo, demoBalance, 
    realBalance, stake, activeAsset, tradeType, tradeTicks, selectedDigit, lastDigit
  ])

  // Render trade buttons based on trade type
  const renderTradeButtons = () => {
    const payout = calculatePayout(tradeType, 'even', stake, selectedDigit)
    const payoutDisplay = `$${(stake + payout).toFixed(2)}`
    const payoutPct = `${((payout / stake) * 100).toFixed(1)}%`

    if (tradeType === 'even_odd') {
      return (
        <div className="flex gap-3">
          <TradeButton
            label="Even"
            payout={`$${(stake + calculatePayout(tradeType, 'even', stake)).toFixed(2)}`}
            payoutPct={`${((calculatePayout(tradeType, 'even', stake) / stake) * 100).toFixed(1)}%`}
            direction="up"
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => handleTrade('even')}
          />
          <TradeButton
            label="Odd"
            payout={`$${(stake + calculatePayout(tradeType, 'odd', stake)).toFixed(2)}`}
            payoutPct={`${((calculatePayout(tradeType, 'odd', stake) / stake) * 100).toFixed(1)}%`}
            direction="down"
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => handleTrade('odd')}
          />
        </div>
      )
    }

    if (tradeType === 'over_under') {
      const overPayout = calculatePayout(tradeType, 'over', stake, selectedDigit)
      const underPayout = calculatePayout(tradeType, 'under', stake, selectedDigit)
      return (
        <div className="flex gap-3">
          <TradeButton
            label="Over"
            payout={`$${(stake + overPayout).toFixed(2)}`}
            payoutPct={`${((overPayout / stake) * 100).toFixed(1)}%`}
            direction="up"
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => handleTrade('over')}
          />
          <TradeButton
            label="Under"
            payout={`$${(stake + underPayout).toFixed(2)}`}
            payoutPct={`${((underPayout / stake) * 100).toFixed(1)}%`}
            direction="down"
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => handleTrade('under')}
          />
        </div>
      )
    }

    // Matches/Differs
    const matchPayout = calculatePayout(tradeType, `match_${selectedDigit}`, stake, selectedDigit)
    const differPayout = calculatePayout(tradeType, `differ_${selectedDigit}`, stake, selectedDigit)
    return (
      <div className="flex gap-3">
        <TradeButton
          label={`Matches ${selectedDigit}`}
          payout={`$${(stake + matchPayout).toFixed(2)}`}
          payoutPct={`${((matchPayout / stake) * 100).toFixed(1)}%`}
          direction="up"
          disabled={placingTrade || connectionStatus !== 'connected'}
          onTrade={() => handleTrade(`match_${selectedDigit}`)}
        />
        <TradeButton
          label={`Differs ${selectedDigit}`}
          payout={`$${(stake + differPayout).toFixed(2)}`}
          payoutPct={`${((differPayout / stake) * 100).toFixed(1)}%`}
          direction="down"
          disabled={placingTrade || connectionStatus !== 'connected'}
          onTrade={() => handleTrade(`differ_${selectedDigit}`)}
        />
      </div>
    )
  }

  const assetInfo = ASSETS.find(a => a.id === activeAsset)

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      {/* Left: Chart area */}
      <div className="space-y-4">
        {/* Asset + connection status */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <AssetSelector onAssetChange={handleAssetChange} />
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
            connectionStatus === 'connected' 
              ? 'bg-win/10 text-win border border-win/20'
              : connectionStatus === 'connecting'
              ? 'bg-warning/10 text-warning border border-warning/20'
              : 'bg-loss/10 text-loss border border-loss/20'
          }`}>
            {connectionStatus === 'connected' ? (
              <Wifi size={12} />
            ) : connectionStatus === 'connecting' ? (
              <Loader size={12} className="animate-spin" />
            ) : (
              <WifiOff size={12} />
            )}
            <span className="capitalize">{connectionStatus}</span>
          </div>
          
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">AI Scan</span>
          </button>
        </div>

        {/* Price display */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#5A6380] uppercase tracking-wider">
              {assetInfo?.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5A6380]">{ticks.length} ticks</span>
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-win animate-pulse' : 'bg-[#5A6380]'}`} />
            </div>
          </div>
          
          <div className={`font-mono font-bold text-3xl text-white transition-colors ${priceFLash ? 'text-primary' : ''}`}>
            {currentPrice > 0 ? currentPrice.toFixed(2) : '—'}
          </div>
          
          <div className="mt-4">
            <PriceChart height={180} visibleTicks={100} />
          </div>
        </div>

        {/* Digit distribution */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5A6380] uppercase tracking-wider">
              Last Digit Distribution
            </span>
            <span className="text-xs text-[#5A6380] font-mono">
              Current: <span className="text-white font-bold">{lastDigit}</span>
            </span>
          </div>
          <DigitBar />
        </div>

        {/* Open positions (desktop) */}
        {openPositions.length > 0 && (
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4 hidden lg:block">
            <h3 className="text-xs font-semibold text-[#5A6380] uppercase tracking-wider mb-3">
              Open Positions ({openPositions.length})
            </h3>
            <div className="space-y-2">
              {openPositions.slice(0, 3).map(pos => (
                <div key={pos.id} className="flex items-center justify-between py-2 border-b border-[#1a2235] last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-white">{pos.direction.toUpperCase()}</div>
                    <div className="text-xs text-[#5A6380]">{pos.ticks_elapsed}/{pos.ticks_total} ticks</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">${pos.stake.toFixed(2)}</div>
                    <div className="w-24 h-1 bg-[#1a2235] rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(pos.ticks_elapsed / pos.ticks_total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Trading panel */}
      <div className="space-y-4">
        {/* Trade type tabs */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-1 flex">
          {TRADE_TYPES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTradeType(id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                tradeType === id
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-[#5A6380] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-1 flex">
          <button
            onClick={() => setMode('auto')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'auto' ? 'bg-[#1a2235] text-white' : 'text-[#5A6380]'
            }`}
          >
            AUTO
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'manual' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-[#5A6380]'
            }`}
          >
            MANUAL
          </button>
        </div>

        {/* Stake input */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <StakeInput />
        </div>

        {/* Auto trade panel (if auto mode) */}
        {mode === 'auto' && (
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
            <AutoTradePanel />
          </div>
        )}

        {/* Ticks duration (for over/under and matches) */}
        {tradeType !== 'even_odd' && (
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
            <div className="text-xs font-semibold text-[#5A6380] uppercase tracking-wider mb-3">
              Selected Digit: <span className="text-white">{selectedDigit}</span>
            </div>
            <p className="text-xs text-[#5A6380] mb-2">Tap a digit above to change selection</p>
          </div>
        )}

        {/* Trade buttons */}
        <div className="bg-[#0d1526] border border-[#1a2235] rounded-2xl p-4">
          <div className="text-xs text-[#5A6380] mb-3 text-center">
            Hold button to confirm trade
          </div>
          {renderTradeButtons()}
        </div>

        {/* Demo indicator */}
        {isDemo && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <Zap size={16} className="text-primary" />
            <div>
              <div className="text-xs font-semibold text-primary">Demo Mode</div>
              <div className="text-xs text-[#5A6380]">Using virtual $10,000 balance</div>
            </div>
            <button
              onClick={() => setShowDeposit(true)}
              className="ml-auto text-xs text-primary hover:text-white transition-colors font-semibold"
            >
              Go Real →
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {showScanner && (
        <ScannerModal 
          onClose={() => setShowScanner(false)} 
          onLoad={handleScannerLoad}
        />
      )}
      
      {/* Trade result overlay */}
      <TradeResultOverlay
        result={tradeResult}
        onDone={() => setTradeResult(null)}
      />
    </div>
  )
}
