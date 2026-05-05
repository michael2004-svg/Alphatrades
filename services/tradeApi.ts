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

// Payout rates
export const PAYOUT_RATES = {
  even_odd: 0.952,      // 95.2% payout - returns $19.52 on $10
  matches: 9.5,         // 950%
  differs: 0.056,       // 5.6%
  over_under: {
    over: [0, 1.375, 1.1, 0.9, 0.8, 0.75, 0.7, 0.65, 0.6, 0],  // Over 0-9
    under: [0, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1.1, 1.375, 0],  // Under 0-9
  }
}

export function calculatePayout(
  tradeType: string,
  direction: string,
  stake: number,
  selectedDigit?: number
): number {
  if (tradeType === 'even_odd') {
    return stake * PAYOUT_RATES.even_odd
  }
  if (tradeType === 'matches_differs') {
    if (direction.startsWith('match')) return stake * PAYOUT_RATES.matches
    return stake * PAYOUT_RATES.differs
  }
  if (tradeType === 'over_under' && selectedDigit !== undefined) {
    const digit = selectedDigit
    if (direction === 'over') {
      return stake * (PAYOUT_RATES.over_under.over[digit] || 0.9)
    } else {
      return stake * (PAYOUT_RATES.over_under.under[digit] || 0.9)
    }
  }
  return stake * 0.95
}

export function getPayoutDisplay(
  tradeType: string,
  direction: string,
  stake: number,
  selectedDigit?: number
): string {
  const payout = calculatePayout(tradeType, direction, stake, selectedDigit)
  return `$${(stake + payout).toFixed(2)}`
}

export async function placeTrade(params: PlaceTradeParams): Promise<TradeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const payout = calculatePayout(
      params.tradeType,
      params.direction,
      params.stake,
      params.selectedDigit
    )

    // Deduct balance
    const balanceField = params.isDemo ? 'demo_balance' : 'real_balance'
    
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      return { success: false, error: 'Could not fetch wallet' }
    }

    if (wallet[balanceField] < params.stake) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Deduct stake
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        [balanceField]: wallet[balanceField] - params.stake,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (deductError) {
      return { success: false, error: 'Balance deduction failed' }
    }

    // Create position
    const { data: position, error: posError } = await supabase
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
      .select()
      .single()

    if (posError) {
      // Refund on error
      await supabase
        .from('wallets')
        .update({ [balanceField]: wallet[balanceField] })
        .eq('user_id', user.id)
      return { success: false, error: 'Trade placement failed' }
    }

    return { success: true, positionId: position.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function settleTrade(
  positionId: string,
  exitPrice: number,
  exitDigit: number,
  userId: string,
  isDemo: boolean
) {
  try {
    const { data: position } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (!position || position.status !== 'open') return

    const won = checkWin(
      position.trade_type,
      position.direction,
      exitDigit,
      position.selected_digit
    )

    const balanceField = isDemo ? 'demo_balance' : 'real_balance'
    const profitLoss = won ? position.payout : -position.stake

    // Update position
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

    if (won) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            [balanceField]: wallet[balanceField] + position.stake + position.payout,
          })
          .eq('user_id', userId)
      }
    }

    return { won, profitLoss }
  } catch (e) {
    console.error('Settlement error:', e)
  }
}

function checkWin(
  tradeType: string,
  direction: string,
  exitDigit: number,
  selectedDigit?: number
): boolean {
  switch (tradeType) {
    case 'even_odd':
      if (direction === 'even') return exitDigit % 2 === 0
      if (direction === 'odd') return exitDigit % 2 !== 0
      return false
    case 'matches_differs':
      if (direction.startsWith('match')) return exitDigit === selectedDigit
      if (direction.startsWith('differ')) return exitDigit !== selectedDigit
      return false
    case 'over_under':
      if (direction === 'over') return selectedDigit !== undefined && exitDigit > selectedDigit
      if (direction === 'under') return selectedDigit !== undefined && exitDigit < selectedDigit
      return false
    default:
      return false
  }
}
