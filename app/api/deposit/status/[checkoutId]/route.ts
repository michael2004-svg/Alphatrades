import { NextRequest, NextResponse } from 'next/server'

const MPESA_BASE_URL = process.env.NEXT_PUBLIC_MPESA_BASE_URL!
const MPEX_SECRET_KEY = process.env.MPESA_SECRET_KEY!

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ checkoutId: string }> }
) {
  const { checkoutId } = await params

  try {
    const res = await fetch(
      `${MPESA_BASE_URL}/api/payments/status/${checkoutId}`,
      {
        headers: { 'X-API-Key': MPEX_SECRET_KEY },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ status: 'pending' })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ status: 'pending', error: e.message })
  }
}
