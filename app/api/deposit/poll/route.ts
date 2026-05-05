import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MPESA_BASE_URL = process.env.NEXT_PUBLIC_MPESA_BASE_URL!
const MPESA_SECRET_KEY = process.env.MPESA_SECRET_KEY!

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const checkoutRequestId = searchParams.get('checkoutRequestId')
    const userId = searchParams.get('userId')

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 })
    }

    // Check if already completed in our DB first (avoid double-crediting)
    const { data: existingDeposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single()

    if (existingDeposit?.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        alreadyCredited: true,
        amountUsd: existingDeposit.amount_usd,
        amountKes: existingDeposit.amount_kes,
        receipt: existingDeposit.mpesa_receipt,
      })
    }

    if (existingDeposit?.status === 'failed') {
      return NextResponse.json({ status: 'failed' })
    }

    // Poll NexusPay for live status
    const statusRes = await fetch(
      `${MPESA_BASE_URL}/api/payments/status/${checkoutRequestId}`,
      {
        headers: { 'X-API-Key': MPESA_SECRET_KEY },
      }
    )

    if (!statusRes.ok) {
      return NextResponse.json({ status: 'pending' })
    }

    const statusData = await statusRes.json()
    const nexusStatus = statusData.status // 'pending' | 'completed' | 'failed' | 'cancelled'

    if (nexusStatus === 'completed') {
      // Only credit if we haven't already
      if (existingDeposit && existingDeposit.status !== 'completed' && userId) {
        // Mark deposit completed
        await supabase
          .from('deposits')
          .update({
            status: 'completed',
            mpesa_receipt: statusData.mpesaReceiptNumber || null,
          })
          .eq('checkout_request_id', checkoutRequestId)

        // Credit user's real balance atomically
        const { data: wallet } = await supabase
          .from('wallets')
          .select('real_balance')
          .eq('user_id', userId)
          .single()

        if (wallet) {
          const newBalance = parseFloat(wallet.real_balance) + parseFloat(existingDeposit.amount_usd)
          await supabase
            .from('wallets')
            .update({
              real_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
        }
      }

      return NextResponse.json({
        status: 'completed',
        amountUsd: existingDeposit?.amount_usd,
        amountKes: existingDeposit?.amount_kes,
        receipt: statusData.mpesaReceiptNumber,
      })
    }

    if (nexusStatus === 'failed' || nexusStatus === 'cancelled') {
      if (existingDeposit) {
        await supabase
          .from('deposits')
          .update({ status: 'failed' })
          .eq('checkout_request_id', checkoutRequestId)
      }
      return NextResponse.json({ status: nexusStatus })
    }

    // Still pending
    return NextResponse.json({ status: 'pending' })
  } catch (e: any) {
    console.error('Poll error:', e)
    return NextResponse.json({ status: 'pending', error: e.message })
  }
}
