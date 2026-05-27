'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDerivWs } from '@/services/derivWs'
import { usePriceStore } from '@/stores/usePriceStore'
import { useTradeStore } from '@/stores/useTradeStore'
import { useUserStore } from '@/stores/useUserStore'
import { usePositionStore } from '@/stores/usePositionStore'
import {
  placeTrade, settleTrade, calculatePayout,
  getUserWinControl, fetchWalletBalances, checkWin
} from '@/services/tradeApi'
import { supabase } from '@/lib/supabase'
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
  { id: 'even_odd',        label: 'Even / Odd'      },
  { id: 'over_under',      label: 'Over / Under'    },
] as const

// ── Win/Loss overlay ──────────────────────────────────────────────────────
function TradeResultOverlay({
  result, onDone,
}: { result: { won: boolean; amount: number } | null; onDone: () => void }) {
  useEffect(() => {
    if (result) { const t = setTimeout(onDone, 1800); return () => clearTimeout(t) }
  }, [result, onDone])
  if (!result) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className={`win-overlay text-center px-8 py-6 rounded-2xl border-2 shadow-2xl ${
        result.won ? 'bg-win/20 border-win text-win' : 'bg-loss/20 border-loss text-loss'
      }`}>
        <div className="text-4xl mb-2">{result.won ? '🏆' : '💸'}</div>
        <div className="font-display font-bold text-2xl sm:text-3xl">{result.won ? 'WIN!' : 'LOST'}</div>
        <div className="font-mono text-lg sm:text-xl mt-1">
          {result.won ? '+' : '-'}${Math.abs(result.amount).toFixed(2)} USD
        </div>
      </div>
    </div>
  )
}

// ── Client-side demo settlement for guest (no DB) ────────────────────────
function settleDemoLocal(
  direction: string, tradeType: string,
  exitDigit: number, selectedDigit: number | null,
  stake: number, payout: number
): { won: boolean; profitLoss: number } {
  const won = checkWin(tradeType, direction, exitDigit, selectedDigit)
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
    mode, setTradeType, setDirection, setMode, setSelectedDigit,
    isAutoRunning, setIsAutoRunning,
    autoConfig, recordAutoResult, resetAutoSession,
  } = useTradeStore()
  const {
    isDemo, user, realBalance, demoBalance,
    updateSessionPL, setRealBalance, setDemoBalance,
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
  // Win-rate control cache — refreshed per user login
  const winControlRef = useRef<{ enabled: boolean; autoWinRate: number }>({ enabled: false, autoWinRate: 50 })
  // Track auto consecutive results for win-rate enforcement
  const autoWinCountRef = useRef(0)
  const autoLossCountRef = useRef(0)
  const settlingRef = useRef(false)  // prevent double settlement

  useEffect(() => { openPositionsRef.current = openPositions }, [openPositions])

  // ── Load win control settings for current user ───────────────────────
  useEffect(() => {
    if (!user) return
    getUserWinControl(user.id).then(ctrl => {
      winControlRef.current = ctrl
    })
  }, [user])

  // ── Sync balances from DB on mount & user change ─────────────────────
  // This is the fix for balance reducing on page revisit.
  // We always read from Supabase as the source of truth.
  useEffect(() => {
    if (!user) return
    fetchWalletBalances(user.id).then(w => {
      if (!w) return
      setRealBalance(w.real_balance)
      setDemoBalance(w.demo_balance)
    })
  }, [user])

  // ── Restore open positions from DB on mount ──────────────────────────
  // This fixes trades/positions disappearing on refresh.
  useEffect(() => {
    if (!user) return
    supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .eq('is_demo', isDemo)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        // Re-add them to the store so settlement loop picks them up
        data.forEach(pos => {
          // Only add if not already in store
          const alreadyPresent = openPositionsRef.current.find(p => p.id === pos.id)
          if (!alreadyPresent) {
            addOpenPosition({
              ...pos,
              exit_price: pos.exit_price ?? null,
              exit_digit: pos.exit_digit ?? null,
              profit_loss: pos.profit_loss ?? null,
              balance_after: pos.balance_after ?? null,
            })
          }
        })
      })
  }, [user, isDemo])

  useEffect(() => {
    if (searchParams.get('scanner') === 'true') setShowScanner(true)
  }, [searchParams])

  // ── WS connection ──────────────────────────────────────────────────────
  useEffect(() => {
    const ws = getDerivWs()
    const unsubTick = ws.onTick((price, digit) => {
      if (prevPriceRef.current !== 0 && price !== prevPriceRef.current) {
        setPriceFlash(true)
        setTimeout(() => setPriceFlash(false), 150)
      }
      prevPriceRef.current = price
      addTick(price, digit)
      openPositionsRef.current.forEach(pos => incrementTick(pos.id))
    })
    const unsubStatus = ws.onStatus(setConnectionStatus)
    ws.subscribe(activeAsset)
    return () => { unsubTick(); unsubStatus() }
  }, [activeAsset])

  // ── Determine forced win for auto mode based on admin win-rate ────────
  const decideForcedWin = useCallback((isAutoTrade: boolean): boolean | undefined => {
    const ctrl = winControlRef.current
    if (!ctrl.enabled || !isAutoTrade) return undefined

    const totalAuto = autoWinCountRef.current + autoLossCountRef.current
    if (totalAuto === 0) {
      // First trade: decide based on target
      const shouldWin = Math.random() * 100 < ctrl.autoWinRate
      return shouldWin
    }

    // Current win rate
    const currentWinRate = (autoWinCountRef.current / totalAuto) * 100
    if (currentWinRate < ctrl.autoWinRate) {
      // Below target — force a win
      return true
    } else if (currentWinRate > ctrl.autoWinRate + 10) {
      // Too far above target — force a loss
      return false
    }
    // Within range — random with bias toward target
    return Math.random() * 100 < ctrl.autoWinRate
  }, [])

  // ── Settlement — fires on every tick ──────────────────────────────────
  useEffect(() => {
    if (openPositions.length === 0 || currentPrice === 0) return
    if (settlingRef.current) return

    const toSettle = openPositions.filter(pos => pos.ticks_elapsed >= pos.ticks_total)
    if (toSettle.length === 0) return

    settlingRef.current = true

    const settle = async () => {
      for (const pos of toSettle) {
        const exitDigit = lastDigit
        const exitPrice = currentPrice
        let won = false
        let profitLoss = 0
        let newBalance: number | null = null

        if (pos.id.startsWith('demo_')) {
          // Guest demo — settle locally
          const r = settleDemoLocal(
            pos.direction, pos.trade_type,
            exitDigit, pos.selected_digit,
            pos.stake, pos.payout
          )
          won = r.won
          profitLoss = r.profitLoss
          // Update local store balance
          if (won) {
            setDemoBalance(demoBalance + pos.stake + pos.payout)
          }
        } else {
          // Authenticated user — use DB settlement
          const forcedWin = pos.is_auto ? decideForcedWin(true) : undefined
          const r = await settleTrade(
            pos.id, exitPrice, exitDigit,
            pos.user_id || user?.id || '', pos.is_demo,
            pos.is_auto, forcedWin
          )
          if (!r) {
            // If null returned (already settled or error), skip
            closePosition(pos.id, 'lost', {
              exit_price: exitPrice, exit_digit: exitDigit,
              profit_loss: 0, closed_at: new Date().toISOString(),
            })
            continue
          }
          won = r.won
          profitLoss = r.profitLoss
          newBalance = r.newBalance

          // Sync balance from DB result — no additive drift
          if (pos.is_demo) {
            setDemoBalance(r.newBalance)
          } else {
            setRealBalance(r.newBalance)
          }

          // Track auto win/loss for win-rate control
          if (pos.is_auto) {
            if (won) autoWinCountRef.current++
            else autoLossCountRef.current++
          }
        }

        closePosition(pos.id, won ? 'won' : 'lost', {
          exit_price: exitPrice,
          exit_digit: exitDigit,
          profit_loss: profitLoss,
          balance_after: newBalance,
          closed_at: new Date().toISOString(),
        })
        updateSessionPL(profitLoss, won)
        setTradeResult({ won, amount: won ? profitLoss : pos.stake })

        won
          ? toast.success(`+$${profitLoss.toFixed(2)} Won!`, { icon: '🏆', duration: 2000 })
          : toast.error(`-$${pos.stake.toFixed(2)} Lost`, { icon: '💸', duration: 2000 })

        if (mode === 'auto' && isAutoRunning) {
          recordAutoResult(profitLoss)
          const { autoSessionProfit } = useTradeStore.getState()
          if (autoSessionProfit >= autoConfig.targetProfit || autoSessionProfit <= -autoConfig.stopLoss) {
            stopAutoTrade()
            toast(
              autoSessionProfit >= autoConfig.targetProfit
                ? '🎯 Target profit reached!'
                : '🛑 Stop loss hit!',
              { duration: 3000 }
            )
          }
        }
      }
      settlingRef.current = false
    }

    settle()
  }, [ticks.length])

  // ── Place trade ────────────────────────────────────────────────────────
  const handleTrade = useCallback(async (dir: string, isAutoTrade = false) => {
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
      isAuto: isAutoTrade,
    })

    if (result.success && result.positionId) {
      // Deduct from local store immediately (optimistic) using set not add
      if (isDemo) {
        setDemoBalance(Math.max(0, demoBalance - stake))
      } else {
        setRealBalance(Math.max(0, realBalance - stake))
      }

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
        is_auto: isAutoTrade,
        balance_after: null,
      })
    } else {
      toast.error(result.error || 'Trade failed')
    }
    setPlacingTrade(false)
  }, [
    placingTrade, connectionStatus, currentPrice, isDemo,
    demoBalance, realBalance, stake, activeAsset, tradeType,
    tradeTicks, selectedDigit, lastDigit,
  ])

  // ── Auto trade ──────────────────────────────────────────────────────────
  const startAutoTrade = useCallback((dir: string) => {
    if (isAutoRunning) return
    // Reset auto counters for win-rate tracking
    autoWinCountRef.current = 0
    autoLossCountRef.current = 0
    setIsAutoRunning(true)
    toast('🤖 Auto trading started', { duration: 2000 })
    handleTrade(dir, true)
    // Use tradeTicks * 1000ms + 500ms buffer per tick cycle
    const intervalMs = (tradeTicks + 1) * 1000 + 500
    autoIntervalRef.current = setInterval(() => {
      const { isAutoRunning: running, autoSessionProfit, autoConfig: cfg } = useTradeStore.getState()
      if (!running || autoSessionProfit >= cfg.targetProfit || autoSessionProfit <= -cfg.stopLoss) {
        stopAutoTrade(); return
      }
      // Only place next trade if no open auto positions (prevent stacking)
      const openAuto = openPositionsRef.current.filter(p => p.is_auto)
      if (openAuto.length === 0) {
        handleTrade(dir, true)
      }
    }, intervalMs)
  }, [isAutoRunning, handleTrade, tradeTicks])

  const stopAutoTrade = useCallback(() => {
    setIsAutoRunning(false)
    resetAutoSession()
    if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null }
    toast('Auto trading stopped', { duration: 2000 })
  }, [])

  useEffect(() => {
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [])

  const handleAssetChange = useCallback((assetId: string) => {
    setActiveAsset(assetId); clearTicks(); getDerivWs().subscribe(assetId)
  }, [])

  const handleScannerLoad = useCallback((assetId: string, dir: string) => {
    handleAssetChange(assetId); setDirection(dir)
  }, [handleAssetChange])

  // ── Trade buttons ──────────────────────────────────────────────────────
  const renderTradeButtons = () => {
    const isAuto = mode === 'auto'

    if (tradeType === 'even_odd') {
      const ep = calculatePayout(tradeType, 'even', stake)
      const op = calculatePayout(tradeType, 'odd', stake)
      return (
        <div className="flex gap-2 sm:gap-3">
          <TradeButton label="Even" direction="up"
            payout={`$${(stake + ep).toFixed(2)}`} payoutPct={`${((ep / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('even') : handleTrade('even')}
            isAutoMode={isAuto} isAutoRunning={isAutoRunning} onStopAuto={stopAutoTrade} />
          <TradeButton label="Odd" direction="down"
            payout={`$${(stake + op).toFixed(2)}`} payoutPct={`${((op / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('odd') : handleTrade('odd')}
            isAutoMode={isAuto} isAutoRunning={isAutoRunning} onStopAuto={stopAutoTrade} />
        </div>
      )
    }

    if (tradeType === 'over_under') {
      const ovp = calculatePayout(tradeType, 'over', stake, selectedDigit)
      const udp = calculatePayout(tradeType, 'under', stake, selectedDigit)
      return (
        <div className="flex gap-2 sm:gap-3">
          <TradeButton label={`Over ${selectedDigit}`} direction="up"
            payout={`$${(stake + ovp).toFixed(2)}`} payoutPct={`${((ovp / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('over') : handleTrade('over')}
            isAutoMode={isAuto} isAutoRunning={isAutoRunning} onStopAuto={stopAutoTrade} />
          <TradeButton label={`Under ${selectedDigit}`} direction="down"
            payout={`$${(stake + udp).toFixed(2)}`} payoutPct={`${((udp / stake) * 100).toFixed(1)}%`}
            disabled={placingTrade || connectionStatus !== 'connected'}
            onTrade={() => isAuto ? startAutoTrade('under') : handleTrade('under')}
            isAutoMode={isAuto} isAutoRunning={isAutoRunning} onStopAuto={stopAutoTrade} />
        </div>
      )
    }

    const mp = calculatePayout(tradeType, `match_${selectedDigit}`, stake, selectedDigit)
    const dp = calculatePayout(tradeType, `differ_${selectedDigit}`, stake, selectedDigit)
    return (
      <div className="flex gap-2 sm:gap-3">
        <TradeButton label={`Matches ${selectedDigit}`} direction="up"
          payout={`$${(stake + mp).toFixed(2)}`} payoutPct={`${((mp / stake) * 100).toFixed(1)}%`}
          disabled={placingTrade || connectionStatus !== 'connected'}
          onTrade={() => isAuto ? startAutoTrade(`match_${selectedDigit}`) : handleTrade(`match_${selectedDigit}`)}
          isAutoMode={isAuto} isAutoRunning={isAutoRunning} onStopAuto={stopAutoTrade} />
        <TradeButton label={`Differs ${selectedDigit}`} direction="down"
          payout={`$${(stake + dp).toFixed(2)}`} payoutPct={`${((dp / stake) * 100).toFixed(1)}%`}
          disabled={placingTrade || connectionStatus !== 'connected'}
          onTrade={() => isAuto ? startAutoTrade(`differ_${selectedDigit}`) : handleTrade(`differ_${selectedDigit}`)}
          isAutoMode={isAuto} isAutoRunning={isAutoRunning} onStopAuto={stopAutoTrade} />
      </div>
    )
  }

  const assetInfo = ASSETS.find(a => a.id === activeAsset)

  return (
    <div className="min-h-[calc(100vh-64px)] pb-20 lg:pb-4 flex flex-col">
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-3
        grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-2 sm:gap-3">

        {/* ── LEFT: Chart column ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2 sm:gap-3">

          {/* Asset + status row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AssetSelector onAssetChange={handleAssetChange} />
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-semibold flex-shrink-0 border ${
              connectionStatus === 'connected'
                ? 'bg-win/10 text-win border-win/20'
                : connectionStatus === 'connecting'
                ? 'bg-warning/10 text-warning border-warning/20'
                : 'bg-loss/10 text-loss border-loss/20'
            }`}>
              {connectionStatus === 'connected'
                ? <Wifi size={11} />
                : connectionStatus === 'connecting'
                ? <Loader size={11} className="animate-spin" />
                : <WifiOff size={11} />}
              <span className="capitalize hidden sm:inline ml-1">{connectionStatus}</span>
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1 px-2.5 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-[10px] font-semibold hover:bg-primary/20 transition-all flex-shrink-0 active:scale-95 touch-manipulation"
            >
<Sparkles size={11} />
              <span className="hidden sm:inline">AI Scan</span>
            </button>
          </div>

          {/* Price + chart */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div>
                <span className="text-[9px] font-semibold text-[#5A6380] uppercase tracking-wider block mb-0.5">
                  {assetInfo?.short}
                </span>
                <span className={`font-mono font-bold text-2xl sm:text-3xl text-white block transition-colors duration-150 ${priceFlash ? 'text-primary' : ''}`}>
                  {currentPrice > 0 ? currentPrice.toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-win animate-pulse' : 'bg-[#5A6380]'}`} />
                <span className="text-[10px] text-[#5A6380]">
                  {connectionStatus === 'connected' ? 'Live' : connectionStatus}
                </span>
              </div>
            </div>
            <PriceChart height={160} visibleTicks={100} />
          </div>

          {/* Digit distribution */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-semibold text-[#5A6380] uppercase tracking-wider">
                Digit Distribution
              </span>
              <span className="text-[10px] text-[#5A6380] font-mono">
                Last: <span className="text-white font-bold">{lastDigit}</span>
              </span>
            </div>
            <DigitBar />
          </div>

          {/* Open positions (desktop only) */}
          {openPositions.length > 0 && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 sm:p-4 hidden lg:block">
              <h3 className="text-[9px] font-semibold text-[#5A6380] uppercase tracking-wider mb-3">
                Open Positions ({openPositions.length})
              </h3>
              <div className="space-y-2">
                {openPositions.slice(0, 4).map(pos => (
                  <div key={pos.id} className="flex items-center justify-between py-2 border-b border-[#1a2235] last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-white capitalize">
                        {pos.direction.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-[#5A6380]">
                        Tick {pos.ticks_elapsed}/{pos.ticks_total}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white">${pos.stake.toFixed(2)}</div>
                      <div className="w-24 h-1.5 bg-[#1a2235] rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
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

        {/* ── RIGHT: Trading panel ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2 sm:gap-3">

          {/* Trade type tabs */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-1 flex">
            {TRADE_TYPES.map(({ id, label }) => (
              <button key={id} onClick={() => setTradeType(id)}
                className={`flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all text-center touch-manipulation active:scale-95 ${
                  tradeType === id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-[#5A6380] hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* AUTO / MANUAL */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-1 flex">
            <button onClick={() => { setMode('auto'); if (isAutoRunning) stopAutoTrade() }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all touch-manipulation active:scale-95 ${
                mode === 'auto' ? 'bg-[#1a2235] text-white' : 'text-[#5A6380] hover:text-white'
              }`}>
              AUTO
            </button>
            <button onClick={() => { setMode('manual'); if (isAutoRunning) stopAutoTrade() }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all touch-manipulation active:scale-95 ${
                mode === 'manual' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-[#5A6380] hover:text-white'
              }`}>
              MANUAL
            </button>
          </div>

          {/* Stake + ticks */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 sm:p-4">
            <StakeInput />
          </div>

          {/* Auto config */}
          {mode === 'auto' && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 sm:p-4">
              <AutoTradePanel />
            </div>
          )}

          {/* Digit picker 0–9 (fixed: was 1–9, now includes 0) */}
          {tradeType !== 'even_odd' && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl px-3 py-3 sm:px-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[9px] font-semibold text-[#5A6380] uppercase tracking-wider">
                  Selected Digit
                </span>
                <span className="font-mono font-bold text-primary text-base sm:text-lg">
                  {selectedDigit}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDigit(d)}
                    className={`h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all active:scale-95 touch-manipulation ${
                      selectedDigit === d
                        ? 'bg-primary text-white shadow-md shadow-primary/40 ring-2 ring-primary/30'
                        : 'bg-[#070d1a] border border-[#1a2235] text-[#5a6b8a] hover:border-primary/50 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trade buttons */}
          <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 sm:p-4">
            {renderTradeButtons()}
          </div>

          {/* Open positions — mobile inline */}
          {openPositions.length > 0 && (
            <div className="bg-[#0d1526] border border-[#1a2235] rounded-xl p-3 lg:hidden">
              <h3 className="text-[9px] font-semibold text-[#5A6380] uppercase tracking-wider mb-2">
                Open ({openPositions.length})
              </h3>
              <div className="space-y-2">
                {openPositions.slice(0, 2).map(pos => (
                  <div key={pos.id} className="flex items-center justify-between">
                    <span className="text-xs text-white capitalize">{pos.direction.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#5A6380]">{pos.ticks_elapsed}/{pos.ticks_total}</span>
                      <div className="w-16 h-1.5 bg-[#1a2235] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${(pos.ticks_elapsed / pos.ticks_total) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-white">${pos.stake.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo banner */}
          {isDemo && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <Zap size={14} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-amber-400">Demo Mode</div>
                <div className="text-[10px] text-[#5A6380] truncate">
                  ${demoBalance.toFixed(2)} virtual balance
                </div>
              </div>
              <button
                onClick={() => setShowDeposit(true)}
                className="text-[11px] text-amber-400 hover:text-white font-semibold transition-colors flex-shrink-0 touch-manipulation"
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