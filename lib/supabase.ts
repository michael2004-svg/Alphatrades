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
          full_name: string | null
          phone_number: string | null
          referral_code: string | null
          avatar_url: string | null
          kyc_verified: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone_number?: string | null
          referral_code?: string | null
          avatar_url?: string | null
          kyc_verified?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
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
        Insert: {
          user_id: string
          real_balance?: number
          demo_balance?: number
          referral_earnings?: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['wallets']['Insert']>
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
          status: 'open' | 'won' | 'lost' | 'refunded' | 'settling'
          entry_price: number | null
          entry_digit: number | null
          exit_price: number | null
          exit_digit: number | null
          profit_loss: number | null
          ticks_total: number
          ticks_elapsed: number
          selected_digit: number | null
          is_auto: boolean
          is_demo: boolean
          balance_after: number | null
          created_at: string
          closed_at: string | null
        }
        Insert: {
          user_id: string
          asset: string
          trade_type: string
          direction: string
          stake: number
          payout: number
          status?: 'open' | 'won' | 'lost' | 'refunded' | 'settling'
          entry_price?: number | null
          entry_digit?: number | null
          exit_price?: number | null
          exit_digit?: number | null
          profit_loss?: number | null
          ticks_total?: number
          ticks_elapsed?: number
          selected_digit?: number | null
          is_auto?: boolean
          is_demo?: boolean
          balance_after?: number | null
          created_at?: string
          closed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['positions']['Insert']>
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
        Insert: {
          user_id: string
          amount_kes: number
          amount_usd: number
          exchange_rate?: number
          mpesa_receipt?: string | null
          checkout_request_id?: string | null
          status?: 'pending' | 'completed' | 'failed'
          method?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['deposits']['Insert']>
      }
      withdrawals: {
        Row: {
          id: string
          user_id: string
          amount: number
          method: string
          destination: string
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: {
          user_id: string
          amount: number
          method: string
          destination: string
          status?: string
          created_at?: string
          processed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['withdrawals']['Insert']>
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referee_id: string
          created_at: string
        }
        Insert: {
          referrer_id: string
          referee_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>
      }
    }
  }
}