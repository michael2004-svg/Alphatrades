import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MPESA_BASE_URL = process.env.NEXT_PUBLIC_MPESA_BASE_URL!
const MPESA_SECRET_KEY = process.env.MPESA_SECRET_KEY!

export async function POST(req: NextRequest) {
  try {
    const { amount, phone } = await req.json()

    if (!amount || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (amount < 100) {
      return NextResponse.json({ error: 'Minimum deposit is KES 100' }, { status: 400 })
    }

    // Get auth token from request
    const authHeader = req.headers.get('authorization')
    let userId = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Trigger STK Push via NexusPay
    const stkRes = await fetch(`${MPESA_BASE_URL}/api/payments/stkpush`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': MPESA_SECRET_KEY,
      },
      body: JSON.stringify({
        phoneNumber: phone,
        amount,
        accountReference: `DEP-${userId?.slice(0, 8) || 'guest'}`,
        transactionDesc: 'TagOption Deposit',
      }),
    })

    const stkData = await stkRes.json()

    if (!stkRes.ok || stkData.error) {
      return NextResponse.json({ 
        error: stkData.error || 'STK Push failed',
        success: false
      }, { status: 400 })
    }

    // Record pending deposit in Supabase
    if (userId) {
      const USD_RATE = 130 // KES to USD rate
      await supabase.from('deposits').insert({
        user_id: userId,
        amount_kes: amount,
        amount_usd: amount / USD_RATE,
        exchange_rate: USD_RATE,
        checkout_request_id: stkData.checkoutRequestId,
        status: 'pending',
        method: 'mpesa',
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId: stkData.checkoutRequestId,
      message: 'STK Push sent successfully',
    })
  } catch (e: any) {
    console.error('STK Push error:', e)
    return NextResponse.json({ error: e.message, success: false }, { status: 500 })
  }
}
