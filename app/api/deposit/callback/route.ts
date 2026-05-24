import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const callback = body?.Body?.stkCallback

    if (!callback) {
      return NextResponse.json({ error: 'Invalid callback' }, { status: 400 })
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback

    // Find the deposit
    const { data: deposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single()

    if (!deposit) {
      return NextResponse.json({ ok: true }) // Unknown deposit — ignore
    }

    // Prevent double-crediting if poll_route already handled it
    if (deposit.status === 'completed') {
      return NextResponse.json({ ok: true })
    }

    if (ResultCode === 0 && CallbackMetadata) {
      const items = CallbackMetadata.Item || []
      const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value

      // Mark deposit completed
      await supabase
        .from('deposits')
        .update({
          status: 'completed',
          mpesa_receipt: receipt || null,
        })
        .eq('checkout_request_id', CheckoutRequestID)

      // Credit user balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('real_balance')
        .eq('user_id', deposit.user_id)
        .single()

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            real_balance: parseFloat(wallet.real_balance) + parseFloat(deposit.amount_usd),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', deposit.user_id)
      }
    } else {
      await supabase
        .from('deposits')
        .update({ status: 'failed' })
        .eq('checkout_request_id', CheckoutRequestID)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Callback error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}