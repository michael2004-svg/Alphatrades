'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Smartphone, Coins, ArrowRight, Copy, Check, Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface Props { onClose: () => void }

const OKX_USDT_ADDRESS = 'TFViLd13Zz8b5LVW8vy5WrdbAQ44GbSprG'
const OKX_QR_IMAGE = '/images/okx-qr.jpg'

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa',     desc: 'Instant mobile money (KES)',        icon: Smartphone, color: '#00C48C' },
  { id: 'okx',   label: 'OKX / USDT', desc: 'Crypto · scan QR or copy address',  icon: Coins,      color: '#FFB800' },
]

const KES_RATE = 129
const MIN_DEPOSIT_USD = 5

type PollStatus = 'idle' | 'polling' | 'completed' | 'failed'

export default function DepositModal({ onClose }: Props) {
  const [step, setStep]       = useState<'method' | 'mpesa' | 'okx'>('method')
  const [amount, setAmount]   = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [stkSent, setStkSent] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [pollStatus, setPollStatus] = useState<PollStatus>('idle')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const amountNum = parseFloat(amount) || 0
  const kesAmount = amountNum * KES_RATE

  // ── Poll for payment confirmation ──────────────────────────────────────
  useEffect(() => {
    if (!stkSent || !checkoutRequestId) return

    let attempts = 0
    const MAX_ATTEMPTS = 20 // 20 × 5s = 100s

    setPollStatus('polling')

    const poll = async () => {
      try {
        // Get current session token to identify the user server-side
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id

        const res = await fetch(
          `/api/deposit/poll?checkoutRequestId=${checkoutRequestId}&userId=${userId || ''}`,
        )
        const data = await res.json()

        if (data.status === 'completed') {
          setPollStatus('completed')
          toast.success(`Deposit confirmed! +$${data.amountUsd?.toFixed(2) || amountNum.toFixed(2)} added to your balance.`)
          // Trigger a page reload so balance updates
          setTimeout(() => { onClose(); window.location.reload() }, 1500)
          return
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setPollStatus('failed')
          toast.error('Payment failed or was cancelled. Please try again.')
          return
        }

        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          setPollStatus('failed')
          toast.error('Payment timed out. If you paid, contact support.')
          return
        }

        // Still pending — poll again in 5s
        pollRef.current = setTimeout(poll, 5000)
      } catch {
        attempts++
        if (attempts < MAX_ATTEMPTS) pollRef.current = setTimeout(poll, 5000)
      }
    }

    // Start polling after 5s (give M-Pesa time to process)
    pollRef.current = setTimeout(poll, 5000)

    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [stkSent, checkoutRequestId])

  // ── Initiate STK push ──────────────────────────────────────────────────
  const handleMpesaDeposit = async () => {
    if (!amount || !phone) { toast.error('Enter amount and phone number'); return }
    if (amountNum < MIN_DEPOSIT_USD) { toast.error(`Minimum deposit is $${MIN_DEPOSIT_USD}`); return }

    setLoading(true)
    try {
      // Pass the auth token so the server can identify the user
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/deposit/mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: Math.round(kesAmount), phone }),
      })
      const data = await res.json()

      if (data.success) {
        setCheckoutRequestId(data.checkoutRequestId)
        setStkSent(true)
        toast.success('STK Push sent! Check your phone.')
      } else {
        toast.error(data.error || 'Deposit failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(OKX_USDT_ADDRESS)
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1526] border border-[#1a2235] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a2235]">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              {step === 'method' ? 'Deposit Funds' : step === 'mpesa' ? 'M-Pesa' : 'OKX / USDT'}
            </h2>
            <p className="text-xs text-[#5A6380] mt-1">
              {step === 'method' ? 'Choose a payment method' : 'Complete your deposit'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] bg-[#1a2235] hover:bg-[#2a3555] flex items-center justify-center transition-colors flex-shrink-0 ml-4"
          >
            <X size={15} className="text-[#5A6380]" />
          </button>
        </div>

        <div className="px-6 py-5">

          {/* ── Method selection ── */}
          {step === 'method' && (
            <div className="space-y-3">
              {PAYMENT_METHODS.map(({ id, label, desc, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setStep(id as 'mpesa' | 'okx')}
                  className="w-full flex items-center gap-4 p-4 bg-[#070d1a] border border-[#1a2235] rounded-[12px] hover:border-primary/50 hover:bg-[#0a1220] transition-all group"
                >
                  <div className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-white text-sm">{label}</div>
                    <div className="text-xs text-[#5A6380] mt-1">{desc}</div>
                  </div>
                  <ArrowRight size={15} className="text-[#5A6380] group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
              <div className="flex items-center justify-center gap-5 pt-2 text-xs text-[#5A6380]">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-win inline-block" />Secure</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />Instant</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />24/7 Support</span>
              </div>
            </div>
          )}

          {/* ── M-Pesa form ── */}
          {step === 'mpesa' && !stkSent && (
            <div className="space-y-5">
              <button onClick={() => setStep('method')} className="text-xs text-[#5A6380] hover:text-white flex items-center gap-1.5 transition-colors">← Back</button>
              <div>
                <label className="block text-[10px] font-bold text-[#5A6380] uppercase tracking-widest mb-2.5">Amount (USD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min $${MIN_DEPOSIT_USD}`}
                  min={MIN_DEPOSIT_USD}
                  step="1"
                  className="w-full bg-[#070d1a] border border-[#1a2235] rounded-[10px] px-4 py-3.5 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary transition-colors font-mono text-base"
                />
                {amountNum >= MIN_DEPOSIT_USD && (
                  <div className="mt-2 px-1 flex items-center justify-between">
                    <span className="text-[11px] text-[#5A6380]">You pay in KES</span>
                    <span className="text-[11px] font-mono font-semibold text-amber-400">
                      KES {kesAmount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {amountNum > 0 && amountNum < MIN_DEPOSIT_USD && (
                  <p className="mt-1.5 text-[11px] text-loss px-1">Minimum deposit is ${MIN_DEPOSIT_USD} (KES {MIN_DEPOSIT_USD * KES_RATE})</p>
                )}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[5, 10, 50, 100].map((amt) => (
                    <button key={amt} onClick={() => setAmount(amt.toString())}
                      className={`py-2.5 text-xs font-semibold rounded-[10px] transition-all ${
                        amount === amt.toString()
                          ? 'bg-primary text-white'
                          : 'bg-[#070d1a] border border-[#1a2235] text-[#5A6380] hover:border-primary/50 hover:text-white'
                      }`}>
                      ${amt}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#5A6380] mt-2.5 px-1">Rate: 1 USD = {KES_RATE} KES</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#5A6380] uppercase tracking-widest mb-2.5">M-Pesa Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="254712345678"
                  className="w-full bg-[#070d1a] border border-[#1a2235] rounded-[10px] px-4 py-3.5 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>
              <button
                onClick={handleMpesaDeposit}
                disabled={loading || amountNum < MIN_DEPOSIT_USD}
                className="w-full bg-win hover:bg-win/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-[22px] transition-all shadow-lg shadow-win/20"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</span>
                  : amountNum >= MIN_DEPOSIT_USD
                  ? `Send M-Pesa · KES ${kesAmount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
                  : 'Send M-Pesa Request'}
              </button>
            </div>
          )}

          {/* ── M-Pesa waiting / polling ── */}
          {step === 'mpesa' && stkSent && pollStatus !== 'completed' && pollStatus !== 'failed' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-win/15 flex items-center justify-center mx-auto">
                <Loader2 size={30} className="text-win animate-spin" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">STK Push Sent!</h3>
                <p className="text-[#5A6380] text-sm mt-2 leading-relaxed">Check your phone and enter your M-Pesa PIN to complete.</p>
              </div>
              <div className="bg-[#070d1a] border border-win/20 rounded-[12px] p-4 text-sm text-[#5A6380]">
                Waiting for confirmation… Balance updates automatically.
              </div>
              <button onClick={onClose} className="w-full bg-[#1a2235] hover:bg-[#2a3555] text-white font-bold py-4 rounded-[22px] transition-all">Close & wait in background</button>
            </div>
          )}

          {/* ── Payment confirmed ── */}
          {step === 'mpesa' && stkSent && pollStatus === 'completed' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-win/15 flex items-center justify-center mx-auto">
                <Check size={30} className="text-win" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">Payment Confirmed!</h3>
                <p className="text-[#5A6380] text-sm mt-2">Your balance has been updated.</p>
              </div>
            </div>
          )}

          {/* ── Payment failed ── */}
          {step === 'mpesa' && stkSent && pollStatus === 'failed' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                <X size={30} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">Payment Failed</h3>
                <p className="text-[#5A6380] text-sm mt-2">The payment was cancelled or timed out.</p>
              </div>
              <button onClick={() => { setStkSent(false); setPollStatus('idle'); setCheckoutRequestId(null) }}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-[22px] transition-all">
                Try Again
              </button>
            </div>
          )}

          {/* ── OKX / USDT ── */}
          {step === 'okx' && (
            <div className="space-y-5">
              <button onClick={() => setStep('method')} className="text-xs text-[#5A6380] hover:text-white flex items-center gap-1.5 transition-colors">← Back</button>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-bold text-[#5A6380] uppercase tracking-widest self-start">Scan QR Code</p>
                <div className="bg-white p-3 rounded-[12px] w-48 h-48 flex items-center justify-center">
                  <img
                    src={OKX_QR_IMAGE}
                    alt="OKX USDT QR Code"
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <p className="text-xs text-[#5A6380] text-center">Scan with OKX app or any USDT wallet</p>
              </div>
              <div className="bg-[#070d1a] border border-warning/25 rounded-[12px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-warning">USDT Deposit Address</span>
                  <span className="text-[10px] text-[#5A6380] bg-[#1a2235] px-2 py-1 rounded-full">TRC20</span>
                </div>
                <div className="font-mono text-xs text-white break-all leading-relaxed bg-[#0a1020] rounded-[10px] p-3.5 select-all">
                  {OKX_USDT_ADDRESS}
                </div>
                <button onClick={copyAddress} className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy Address'}
                </button>
              </div>
              <div className="text-xs text-[#5A6380] space-y-2 bg-[#070d1a] rounded-[12px] p-4">
                <div className="flex items-center gap-2"><Zap size={11} className="text-warning flex-shrink-0" /> Minimum deposit: <span className="text-white font-semibold">$5 USDT</span></div>
                <div>• Network: TRON (TRC20) only — do not send on other networks</div>
                <div>• Credits within 10–30 min after 1 on-chain confirmation</div>
                <div>• Send screenshot to support if not credited after 30 min</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}