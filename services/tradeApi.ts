import { supabase } from '@/lib/supabase'

export interface PlaceTradeParams {
  asset: string
  tradeType: 'even_odd' | 'matches_differs' | 'over_under'
  direction: string
  stake: number
  ticks: number
  selectedDigit?: number
  isDemo: boolean
  entryPrice: number
  entryDigit: number
}

export interface TradeResult {
  success: boolean
  positionId?: string
  error?: string
}

export const PAYOUT_RATES = {
  even_odd: 0.952,
  matches: 9.5,
  differs: 0.056,
  over_under: {
    over:  [0, 1.375, 1.1, 0.9, 0.8, 0.75, 0.7, 0.65, 0.6, 0],
    under: [0, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1.1, 1.375, 0],
  },
}

export function calculatePayout(
  tradeType: string,
  direction: string,
  stake: number,
  selectedDigit?: number
): number {
  if (tradeType === 'even_odd') return stake * PAYOUT_RATES.even_odd
  if (tradeType === 'matches_differs') {
    if (direction.startsWith('match')) return stake * PAYOUT_RATES.matches
    return stake * PAYOUT_RATES.differs
  }
  if (tradeType === 'over_under' && selectedDigit !== undefined) {
    if (direction === 'over') return stake * (PAYOUT_RATES.over_under.over[selectedDigit] || 0.9)
    return stake * (PAYOUT_RATES.over_under.under[selectedDigit] || 0.9)
  }
  return stake * 0.95
}

export async function placeTrade(params: PlaceTradeParams): Promise<TradeResult> {
  try {
    const payout = calculatePayout(
      params.tradeType, params.direction, params.stake, params.selectedDigit
    )

    // ── DEMO GUEST (no Supabase session) ──────────────────────────────────
    // Check auth without throwing — getUser() is safe even when logged out
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (!params.isDemo) {
        return { success: false, error: 'Please log in to trade with a real account' }
      }
      // Guest demo: generate a local position id, no DB call at all
      const fakeId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      return { success: true, positionId: fakeId }
    }

    // ── AUTHENTICATED USER ────────────────────────────────────────────────
    const balanceField = params.isDemo ? 'demo_balance' : 'real_balance'

    // Fetch wallet
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('id, real_balance, demo_balance')
      .eq('user_id', user.id)
      .single()

    if (walletErr || !wallet) {
      // Wallet row missing — create it on the fly then retry
      await supabase.from('wallets').upsert({
        user_id: user.id,
        real_balance: 0,
        demo_balance: 10000,
        referral_earnings: 0,
        updated_at: new Date().toISOString(),
      })
      // For demo, we can still proceed with local id
      if (params.isDemo) {
        const fakeId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        return { success: true, positionId: fakeId }
      }
      return { success: false, error: 'Wallet not found. Please try again.' }
    }

    const currentBalance: number = wallet[balanceField]
    if (currentBalance < params.stake) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Deduct stake
    const { error: deductErr } = await supabase
      .from('wallets')
      .update({
        [balanceField]: currentBalance - params.stake,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (deductErr) return { success: false, error: 'Balance update failed' }

    // Insert position
    const { data: position, error: posErr } = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        asset: params.asset,
        trade_type: params.tradeType,
        direction: params.direction,
        stake: params.stake,
        payout,
        status: 'open',
        entry_price: params.entryPrice,
        entry_digit: params.entryDigit,
        ticks_total: params.ticks,
        ticks_elapsed: 0,
        selected_digit: params.selectedDigit ?? null,
        is_auto: false,
        is_demo: params.isDemo,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (posErr || !position) {
      // Refund stake
      await supabase
        .from('wallets')
        .update({ [balanceField]: currentBalance, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      return { success: false, error: 'Trade placement failed' }
    }

    return { success: true, positionId: position.id }
  } catch (e: any) {
    console.error('[placeTrade]', e)
    return { success: false, error: e?.message || 'Unexpected error' }
  }
}

// ── Settlement ─────────────────────────────────────────────────────────────
export async function settleTrade(
  positionId: string,
  exitPrice: number,
  exitDigit: number,
  userId: string,
  isDemo: boolean
): Promise<{ won: boolean; profitLoss: number } | null> {
  try {
    // Guest demo positions have a local id — settle purely client-side
    if (positionId.startsWith('demo_')) {
      // Caller owns the position data; return null so caller uses its own state
      return null
    }

    const { data: position, error: fetchErr } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (fetchErr || !position || position.status !== 'open') return null

    const won = checkWin(
      position.trade_type, position.direction,
      exitDigit, position.selected_digit
    )
    const profitLoss = won ? position.payout : -position.stake

    await supabase
      .from('positions')
      .update({
        status: won ? 'won' : 'lost',
        exit_price: exitPrice,
        exit_digit: exitDigit,
        profit_loss: profitLoss,
        closed_at: new Date().toISOString(),
      })
      .eq('id', positionId)

    if (won && userId) {
      const balanceField = isDemo ? 'demo_balance' : 'real_balance'
      const { data: wallet } = await supabase
        .from('wallets')
        .select('real_balance, demo_balance')
        .eq('user_id', userId)
        .single()

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            [balanceField]: wallet[balanceField] + position.stake + position.payout,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      }
    }

    return { won, profitLoss }
  } catch (e) {
    console.error('[settleTrade]', e)
    return null
  }
}

function checkWin(
  tradeType: string,
  direction: string,
  exitDigit: number,
  selectedDigit?: number | null
): boolean {
  switch (tradeType) {
    case 'even_odd':
      if (direction === 'even') return exitDigit % 2 === 0
      if (direction === 'odd')  return exitDigit % 2 !== 0
      return false
    case 'matches_differs':
      if (direction.startsWith('match'))  return exitDigit === selectedDigit
      if (direction.startsWith('differ')) return exitDigit !== selectedDigit
      return false
    case 'over_under':
      if (direction === 'over')  return selectedDigit != null && exitDigit > selectedDigit
      if (direction === 'under') return selectedDigit != null && exitDigit < selectedDigit
      return false
    default:
      return false
  }
}