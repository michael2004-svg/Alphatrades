import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone_number: string | null
          referral_code: string
          avatar_url: string | null
          kyc_verified: boolean
          created_at: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          real_balance: number
          demo_balance: number
          referral_earnings: number
          updated_at: string
        }
      }
      positions: {
        Row: {
          id: string
          user_id: string
          asset: string
          trade_type: string
          direction: string
          stake: number
          payout: number
          status: 'open' | 'won' | 'lost' | 'refunded'
          entry_price: number
          entry_digit: number
          exit_price: number | null
          exit_digit: number | null
          profit_loss: number | null
          ticks_total: number
          ticks_elapsed: number
          is_auto: boolean
          is_demo: boolean
          created_at: string
          closed_at: string | null
        }
      }
      deposits: {
        Row: {
          id: string
          user_id: string
          amount_kes: number
          amount_usd: number
          exchange_rate: number
          mpesa_receipt: string | null
          checkout_request_id: string | null
          status: 'pending' | 'completed' | 'failed'
          method: string
          created_at: string
        }
      }
    }
  }
}
