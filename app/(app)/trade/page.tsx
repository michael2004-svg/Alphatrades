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
import { Wifi, WifiOff, Loader, Sparkles, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'

const TRADE_TYPES = [
  { id: 'matches_differs', label: 'Matches/Differs' },
  { id: 'even_odd',        label: 'Even / Odd'      },
  { id: 'over_under',      label: 'Over / Under'    },
] as const

// ── Win/Loss overlay ──────────────────────────────────────────────────────
function TradeResultOverlay({
  result, onDone,
}: { result: { won: boolean; amount: number } | null; onDone: () => void }) {
  useEffect(() => {
    if (result) { const t = setTimeout(onDone, 2000); return () => clearTimeout(t) }
  }, [result, onDone])
  if (!result) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className={`win-overlay text-center px-10 py-8 rounded-[14px] border-2 shadow-2xl ${
        result.won ? 'bg-win/20 border-win text-win' : 'bg-loss/20 border-loss text-loss'
      }`}>
        <div className="text-5xl mb-2">{result.won ? '🏆' : '💸'}</div>
        <div className="font-display font-bold text-3xl">{result.won ? 'WIN!' : 'LOST'}</div>
        <div className="font-mono text-xl mt-1">
          {result.won ? '+' : ''}{result.amount.toFixed(2)} USD
        </div>
      </div>
    </div>
  )
}

// ── Client-side demo settlement ──────────────────────────────────────────
function settleDemoLocal(
  direction: string, tradeType: string,
  exitDigit: number, selectedDigit: number | null,
  stake: number, payout: number
): { won: boolean; profitLoss: number } {
  let won = false
  if (tradeType === 'even_odd') {
    won = direction === 'even' ? exitDigit % 2 === 0 : exitDigit % 2 !== 0
  } else if (tradeType === 'matches_differs') {
    won = direction.startsWith('match')
      ? exitDigit === selectedDigit
      : exitDigit !== selectedDigit
  } else if (tradeType === 'over_under') {
    won = direction === 'over'
      ? selectedDigit != null && exitDigit > selectedDigit
      : selectedDigit != null && exitDigit < selectedDigit
  }
  return { won, profitLoss: won ? payout : -stake }
}

export default function TradePage() {
  const searchParams = useSearchParams()
  const {
    ticks, currentPrice, lastDigit, connectionStatus,
    activeAsset, addTick, setConnectionStatus, setActiveAsset, clearTicks,
  } = usePriceStore()
  const {
    tradeType, stake, selectedDigit, ticks: tradeTicks,
    mode, setTradeType, setDirection, setMode,
    isAutoRunning, setIsAutoRunning,
    autoConfig, recordAutoResult, resetAutoSession,
  } = useTradeStore()
  const {
    isDemo, realBalance, demoBalance,
    updateSessionPL, setDemoBalance,
  } = useUserStore()
  const {
    addOpenPosition, closePosition,
    openPositions, incrementTick,
  } = usePositionStore()

  const [showDeposit, setShowDeposit] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [tradeResult, setTradeResult] = useState<{ won: boolean; amount: number } | null>(null)
  const [placingTrade, setPlacingTrade] = useState(false)
  const [priceFlash, setPriceFlash] = useState(false)
  const prevPriceRef = useRef(0)
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const openPositionsRef = useRef(openPositions)

  // Keep ref in sync so settlement closure sees latest positions
  useEffect(() => { openPositionsRef.current = openPositions }, [openPositions])

  // Scanner URL param
  useEffect(() => {
    if (searchParams.get('scanner') === 'true') setShowScanner(true)
  }, [searchParams])

  // ── WS connection ────────────────────────────────────────────────────
  useEffect(() => {
    const ws = getDerivWs()

    const unsubTick = ws.onTick((price, digit) => {
      if (prevPriceRef.current !== 0 && price !== prevPriceRef.current) {
        setPriceFlash(true)
        setTimeout(() => setPriceFlash(false), 200)
      }
      prevPriceRef.current = price
      addTick(price, digit)
      // Increment all open positions on every live tick
      openPositionsRef.current.forEach(pos => incrementTick(pos.id))
    })

    const unsubStatus = ws.onStatus(setConnectionStatus)
    ws.subscribe(activeAsset)

    return () => { unsubTick(); unsubStatus() }
  }, [activeAsset])

  // ── Real-time settlement — runs on every tick ─────────────────────────
  useEffect(() => {
    if (openPositions.length === 0 || currentPrice === 0) return

    const toSettle = openPositions.filter(
      pos => pos.ticks_elapsed >= pos.ticks_total
    )
    if (toSettle.length === 0) return

    const settle = async () => {
      for (const pos of toSettle) {
        const exitDigit = lastDigit
        const exitPrice = currentPrice

        let won = false
        let profitLoss = 0

        if (pos.id.startsWith('demo_')) {
          // Guest demo — pure client-side
          const r = settleDemoLocal(
            pos.direction, pos.trade_type,
            exitDigit, pos.selected_digit,
            pos.stake, pos.payout
          )
          won = r.won
          profitLoss = r.profitLoss
          if (won) setDemoBalance(demoBalance + pos.stake + pos.payout)
        } else {
          // Authenticated — Supabase settlement
          const r = await settleTrade(
            pos.id, exitPrice, exitDigit,
            pos.user_id || '', pos.is_demo
          )
          if (!r) continue
          won = r.won
          profitLoss = r.profitLoss
        }

        closePosition(pos.id, won ? 'won' : 'lost', {
          exit_price: exitPrice,
          exit_digit: exitDigit,
          profit_loss: profitLoss,
          closed_at: new Date().toISOString(),
        })
        updateSessionPL(profitLoss, won)
        setTradeResult({ won, amount: profitLoss })

        won
          ? toast.success(`+$${profitLoss.toFixed(2)} Won!`, { icon: '🏆' })
          : toast.error(`-$${Math.abs(profitLoss).toFixed(2)} Lost`, { icon: '💸' })

        // Auto mode: record result and check stop conditions
        if (mode === 'auto' && isAutoRunning) {
          recordAutoResult(profitLoss)
          // Check target profit / stop loss
          const { autoSessionProfit } = useTradeStore.getState()
          if (
            autoSessionProfit >= autoConfig.targetProfit ||
            autoSessionProfit <= -autoConfig.stopLoss
          ) {
            stopAutoTrade()
            toast(
              autoSessionProfit >= autoConfig.targetProfit
                ? '🎯 Target profit reached! Auto stopped.'
                : '🛑 Stop loss hit! Auto stopped.',
              { duration: 4000 }
            )
          }
        }
      }
    }

    settle()
  }, [ticks.length]) // fires on every new tick — real-time

  // ── Place single trade ───────────────────────────────────────────────
  const handleTrade = useCallback(async (dir: string) => {
    if (placingTrade) return
    if (connectionStatus !== 'connected') { toast.error('Not connected'); return }
    if (currentPrice === 0) { toast.error('Waiting for price...'); return }

    const balance = isDemo ? demoBalance : realBalance
    if (stake > balance) {
      toast.error('Insufficient balance')
      if (!isDemo) setShowDeposit(true)
      return
    }

    setPlacingTrade(true)
    const result = await placeTrade({
      asset: activeAsset, tradeType, direction: dir, stake,
      ticks: tradeTicks,
      selectedDigit: tradeType !== 'even_odd' ? selectedDigit : undefined,
      isDemo, entryPrice: currentPrice, entryDigit: lastDigit,
    })

    if (result.success && result.positionId) {
      // Deduct demo balance immediately
      if (isDemo) setDemoBalance(Math.max(0, demoBalance - stake))

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
        is_auto: mode === 'auto',
        balance_after: null,
      })
    } else {
      toast.error(result.error || 'Trade failed')
    }
    setPlacingTrade(false)
  }, [
    placingTrade, connectionStatus, currentPrice, isDemo,
    demoBalance, realBalance, stake, activeAsset, tradeType,
    tradeTicks, selectedDigit, lastDigit, mode,
  ])

  // ── Auto trade ───────────────────────────────────────────────────────
  const startAutoTrade = useCallback((dir: string) => {
    if (isAutoRunning) return
    setIsAutoRunning(true)
    toast('🤖 Auto trading started', { duration: 2000 })

    // Place first trade immediately
    handleTrade(dir)

    // Place subsequent trades every N ticks (tradeTicks + 1 buffer)
    const intervalMs = (tradeTicks + 1) * 1000
    autoIntervalRef.current = setInterval(() => {
      const { isAutoRunning: running, autoSessionProfit, autoConfig: cfg } =
        useTradeStore.getState()
      if (
        !running ||
        autoSessionProfit >= cfg.targetProfit ||
        autoSessionProfit <= -cfg.stopLoss
      ) {
        stopAutoTrade()
        return
      }
      handleTrade(dir)
    }, intervalMs)
  }, [isAutoRunning, handleTrade, tradeTicks])

  const stopAutoTrade = useCallback(() => {
    setIsAutoRunning(false)
    resetAutoSession()
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current)
      autoIntervalRef.current = null
    }
    toast('Auto trading stopped', { duration: 2000 })
  }, [])

  // Clean up auto on unmount
  useEffect(() => {
    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current)
    }
  }, [])

  const handleAssetChange = useCallback((assetId: string) => {
    setActiveAsset(assetId)
    clearTicks()
    getDerivWs().subscribe(assetId)
  }, [])

  const handleScannerLoad = useCallback((assetId: string, dir: string) => {
    handleAssetChange(assetId)
    setDirection(dir)
  }, [handleAssetChange])

  // ── Render trade buttons ─────────────────────────────────────────────
  const renderTradeButtons = () => {
    const isAuto = mode === 'auto'

    if (tradeType === 'even_odd') {
      const ep = calculatePayout(tradeType, 'even', stake)
      const op = calculatePayout(tradeType, 'odd',  stake)
      return (
        <div className="flex gap-3">
          <TradeButton
            label="Even" direction="up"
            payout={`$${(stake + ep).toFixed(2)}`}
            payoutPct={`${((ep / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('even') : handleTrade('even')}
            isAutoMode={isAuto}
            isAutoRunning={isAutoRunning}
            onStopAuto={stopAutoTrade}
          />
          <TradeButton
            label="Odd" direction="down"
            payout={`$${(stake + op).toFixed(2)}`}
            payoutPct={`${((op / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('odd') : handleTrade('odd')}
            isAutoMode={isAuto}
            isAutoRunning={isAutoRunning}
            onStopAuto={stopAutoTrade}
          />
        </div>
      )
    }

    if (tradeType === 'over_under') {
      const ovp = calculatePayout(tradeType, 'over',  stake, selectedDigit)
      const udp = calculatePayout(tradeType, 'under', stake, selectedDigit)
      return (
        <div className="flex gap-3">
          <TradeButton
            label={`Over ${selectedDigit}`} direction="up"
            payout={`$${(stake + ovp).toFixed(2)}`}
            payoutPct={`${((ovp / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('over') : handleTrade('over')}
            isAutoMode={isAuto}
            isAutoRunning={isAutoRunning}
            onStopAuto={stopAutoTrade}
          />
          <TradeButton
            label={`Under ${selectedDigit}`} direction="down"
            payout={`$${(stake + udp).toFixed(2)}`}
            payoutPct={`${((udp / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('under') : handleTrade('under')}
            isAutoMode={isAuto}
            isAutoRunning={isAutoRunning}
            onStopAuto={stopAutoTrade}
          />
        </div>
      )
    }

    const mp = calculatePayout(tradeType, `match_${selectedDigit}`,  stake, selectedDigit)
    const dp = calculatePayout(tradeType, `differ_${selectedDigit}`, stake, selectedDigit)
    return (
      <div className="flex gap-3">
        <TradeButton
          label={`Matches ${selectedDigit}`} direction="up"
          payout={`$${(stake + mp).toFixed(2)}`}
          payoutPct={`${((mp / stake) * 100).toFixed(1)}%`}
          disabled={placingTrade || connectionStatus !== 'connected'}
          onTrade={() => isAuto ? startAutoTrade(`match_${selectedDigit}`) : handleTrade(`match_${selectedDigit}`)}
          isAutoMode={isAuto}
          isAutoRunning={isAutoRunning}
          onStopAuto={stopAutoTrade}
        />
        <TradeButton
          label={`Differs ${selectedDigit}`} direction="down"
          payout={`$${(stake + dp).toFixed(2)}`}
          payoutPct={`${((dp / stake) * 100).toFixed(1)}%`}
          disabled={placingTrade || connectionStatus !== 'connected'}
          onTrade={() => isAuto ? startAutoTrade(`differ_${selectedDigit}`) : handleTrade(`differ_${selectedDigit}`)}
          isAutoMode={isAuto}
          isAutoRunning={isAutoRunning}
          onStopAuto={stopAutoTrade}
        />
      </div>
    )
  }

  const assetInfo = ASSETS.find(a => a.id === activeAsset)

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-3 sm:px-4 py-3
        grid grid-cols-1 lg:grid-cols-[1fr_370px] gap-3">

        {/* ── LEFT: Chart column ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Asset selector row */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AssetSelector onAssetChange={handleAssetChange} />
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold flex-shrink-0 border ${
              connectionStatus === 'connected'
                ? 'bg-win/10 text-win border-win/20'
                : connectionStatus === 'connecting'
                ? 'bg-warning/10 text-warning border-warning/20'
                : 'bg-loss/10 text-loss border-loss/20'
            }`}>
              {connectionStatus === 'connected'
                ? <Wifi size={12} />
                : connectionStatus === 'connecting'
                ? <Loader size={12} className="animate-spin" />
                : <WifiOff size={12} />}
              <span className="capitalize hidden sm:inline">{connectionStatus}</span>
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/30 rounded-[8px] text-primary text-xs font-semibold hover:bg-primary/20 transition-all flex-shrink-0"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">AI Scan</span>
            </button>
          </div>

          {/* Price + chart card */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-semibold text-[#5A6380] uppercase tracking-wider block mb-0.5">
                  {assetInfo?.short}
                </span>
                <span className={`font-mono font-bold text-3xl text-white block transition-colors duration-150 ${priceFlash ? 'text-primary' : ''}`}>
                  {currentPrice > 0 ? currentPrice.toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-win animate-pulse' : 'bg-[#5A6380]'}`} />
                <span className="text-xs text-[#5A6380]">
                  {connectionStatus === 'connected' ? 'Live' : connectionStatus}
                </span>
              </div>
            </div>
            <PriceChart height={180} visibleTicks={100} />
          </div>

          {/* Digit distribution — same gap as all other cards (gap-3) */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-[#5A6380] uppercase tracking-wider">
                Last Digit Distribution
              </span>
              <span className="text-xs text-[#5A6380] font-mono">
                Last: <span className="text-white font-bold">{lastDigit}</span>
              </span>
            </div>
            <DigitBar />
          </div>

          {/* Open positions (desktop) */}
          {openPositions.length > 0 && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4 hidden lg:block">
              <h3 className="text-[10px] font-semibold text-[#5A6380] uppercase tracking-wider mb-3">
                Open Positions ({openPositions.length})
              </h3>
              <div className="space-y-2">
                {openPositions.slice(0, 3).map(pos => (
                  <div key={pos.id} className="flex items-center justify-between py-2 border-b border-[#1a2235] last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-white capitalize">
                        {pos.direction.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-[#5A6380]">{pos.ticks_elapsed}/{pos.ticks_total}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white">${pos.stake.toFixed(2)}</div>
                      <div className="w-20 h-1 bg-[#1a2235] rounded-full overflow-hidden mt-1">
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

        {/* ── RIGHT: Trading panel ─────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Trade type tabs */}
          <div className="bg-white/5 rounded-full p-1 flex">
            {TRADE_TYPES.map(({ id, label }) => (
              <button key={id} onClick={() => setTradeType(id)}
                className={`flex-1 py-2 px-2 rounded-full text-[11px] font-semibold transition-all text-center ${
                  tradeType === id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-[#5A6380] hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* AUTO / MANUAL */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-1 flex">
            <button onClick={() => { setMode('auto'); if (isAutoRunning) stopAutoTrade() }}
              className={`flex-1 py-2.5 rounded-[8px] text-sm font-semibold transition-all ${
                mode === 'auto' ? 'bg-[#1a2235] text-white' : 'text-[#5A6380] hover:text-white'
              }`}>
              AUTO
            </button>
            <button onClick={() => { setMode('manual'); if (isAutoRunning) stopAutoTrade() }}
              className={`flex-1 py-2.5 rounded-[8px] text-sm font-semibold transition-all ${
                mode === 'manual' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-[#5A6380] hover:text-white'
              }`}>
              MANUAL
            </button>
          </div>

          {/* Stake */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4">
            <StakeInput />
          </div>

          {/* Auto config */}
          {mode === 'auto' && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4">
              <AutoTradePanel />
            </div>
          )}

          {/* Selected digit pill (non even_odd) */}
          {tradeType !== 'even_odd' && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A6380] uppercase tracking-wider">
                Selected Digit
              </span>
              <span className="font-mono font-bold text-white text-lg">{selectedDigit}</span>
            </div>
          )}

          {/* Trade buttons — no hint text */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-[10px] p-4">
            {renderTradeButtons()}
          </div>

          {/* Demo banner */}
          {isDemo && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-[10px] px-4 py-3 flex items-center gap-3">
              <Zap size={15} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-400">Demo Mode</div>
                <div className="text-xs text-[#5A6380] truncate">
                  ${demoBalance.toFixed(2)} virtual balance
                </div>
              </div>
              <button
                onClick={() => setShowDeposit(true)}
                className="text-xs text-amber-400 hover:text-white font-semibold transition-colors flex-shrink-0"
              >
                Go Real →
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {showScanner && (
        <ScannerModal onClose={() => setShowScanner(false)} onLoad={handleScannerLoad} />
      )}
      <TradeResultOverlay result={tradeResult} onDone={() => setTradeResult(null)} />
    </div>
  )
}