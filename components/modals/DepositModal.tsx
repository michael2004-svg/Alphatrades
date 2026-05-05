'use client'

import { useState } from 'react'
import { X, Smartphone, CreditCard, Coins, ArrowRight, Copy, Check } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
}

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', desc: 'Instant mobile money', icon: Smartphone, color: '#00C48C' },
  { id: 'usdt', label: 'USDT (TRC20)', desc: 'Crypto · auto-credited', icon: Coins, color: '#FFB800' },
  { id: 'card', label: 'Card', desc: 'Visa, Mastercard', icon: CreditCard, color: '#1A56FF' },
]

const USDT_ADDRESS = 'TQn9Y2khDD95R8uLEJBQ3JBVHaekN5VWHF'

export default function DepositModal({ onClose }: Props) {
  const { user } = useUserStore()
  const [step, setStep] = useState<'method' | 'mpesa' | 'usdt' | 'card'>('method')
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stkSent, setStkSent] = useState(false)

  const handleMpesaDeposit = async () => {
    if (!amount || !phone) {
      toast.error('Enter amount and phone number')
      return
    }
    const amtNum = parseFloat(amount)
    if (amtNum < 100) {
      toast.error('Minimum deposit is KES 100')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/deposit/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amtNum, phone }),
      })
      const data = await res.json()
      if (data.success) {
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
    navigator.clipboard.writeText(USDT_ADDRESS)
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#080d1a] border border-[#0d1525] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md overflow-hidden animate-slide-up shadow-2xl shadow-black/70">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#0d1525]">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              {step === 'method' ? 'Deposit Funds' : step === 'mpesa' ? 'M-Pesa' : step === 'usdt' ? 'USDT (TRC20)' : 'Card Payment'}
            </h2>
            <p className="text-sm text-[#3a4a6b] mt-0.5">
              {step === 'method' ? 'Choose a payment method' : 'Complete your deposit'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#0d1526] hover:bg-[#1a2540] flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-[#3a4a6b]" />
          </button>
        </div>

        <div className="p-6">

          {step === 'method' && (
            <div className="space-y-3">
              {PAYMENT_METHODS.map(({ id, label, desc, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setStep(id as any)}
                  className="w-full flex items-center gap-4 p-4 bg-[#04060f] border border-[#0d1525] rounded-2xl hover:border-primary/40 hover:bg-[#080d1a] transition-all group"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={22} style={{ color }} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-white">{label}</div>
                    <div className="text-sm text-[#3a4a6b] mt-0.5">{desc}</div>
                  </div>
                  <ArrowRight size={16} className="text-[#3a4a6b] group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}

              <div className="flex items-center justify-center gap-5 pt-3 text-xs text-[#3a4a6b]">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-win inline-block" />Secure</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />Instant</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />24/7 Support</span>
              </div>
            </div>
          )}

          {step === 'mpesa' && !stkSent && (
            <div className="space-y-5">
              <button onClick={() => setStep('method')} className="text-sm text-[#3a4a6b] hover:text-white flex items-center gap-1.5 transition-colors">
                ← Back
              </button>

              <div>
                <label className="block text-sm font-semibold text-[#3a4a6b] mb-2.5">Amount (KES)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500"
                  min="100"
                  className="w-full bg-[#04060f] border border-[#0d1525] rounded-2xl px-4 py-3.5 text-white placeholder-[#1a2540] focus:outline-none focus:border-primary/50 transition-colors font-mono text-lg"
                />
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className={`py-2 text-xs font-semibold rounded-xl font-mono transition-all ${
                        amount === amt.toString()
                          ? 'bg-primary text-white shadow-lg shadow-primary/25'
                          : 'bg-[#04060f] border border-[#0d1525] text-[#3a4a6b] hover:border-primary/40 hover:text-white'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3a4a6b] mb-2.5">M-Pesa Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="254712345678"
                  className="w-full bg-[#04060f] border border-[#0d1525] rounded-2xl px-4 py-3.5 text-white placeholder-[#1a2540] focus:outline-none focus:border-primary/50 transition-colors font-mono"
                />
              </div>

              <button
                onClick={handleMpesaDeposit}
                disabled={loading}
                className="w-full bg-win hover:bg-win/90 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-win/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending STK Push...
                  </span>
                ) : 'Send M-Pesa Request'}
              </button>
            </div>
          )}

          {step === 'mpesa' && stkSent && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-win/10 flex items-center justify-center mx-auto ring-1 ring-win/20">
                <Check size={32} className="text-win" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white">STK Push Sent!</h3>
                <p className="text-[#3a4a6b] text-sm mt-2 leading-relaxed">Check your phone and enter your M-Pesa PIN to complete the deposit.</p>
              </div>
              <div className="bg-[#04060f] border border-win/15 rounded-2xl p-4 text-sm text-[#3a4a6b]">
                Your balance will update automatically once confirmed.
              </div>
              <button
                onClick={onClose}
                className="w-full bg-[#0d1526] hover:bg-[#1a2540] text-white font-bold py-3.5 rounded-2xl transition-all"
              >
                Done
              </button>
            </div>
          )}

          {step === 'usdt' && (
            <div className="space-y-5">
              <button onClick={() => setStep('method')} className="text-sm text-[#3a4a6b] hover:text-white flex items-center gap-1.5 transition-colors">
                ← Back
              </button>
              <div className="bg-[#04060f] border border-warning/20 rounded-2xl p-5 space-y-3">
                <div className="text-sm font-bold text-warning">TRON (TRC20) Network Only</div>
                <div className="font-mono text-xs text-white break-all leading-relaxed bg-[#080d1a] rounded-xl p-3">
                  {USDT_ADDRESS}
                </div>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Address'}
                </button>
              </div>
              <div className="text-xs text-[#3a4a6b] space-y-2 bg-[#04060f] border border-[#0d1525] rounded-2xl p-4">
                <div className="flex items-center gap-2"><span className="text-warning">•</span> Minimum deposit: 10 USDT</div>
                <div className="flex items-center gap-2"><span className="text-warning">•</span> Network: TRON (TRC20) only</div>
                <div className="flex items-center gap-2"><span className="text-warning">•</span> Credits within 10–30 min after 1 confirmation</div>
              </div>
            </div>
          )}

          {step === 'card' && (
            <div className="space-y-5">
              <button onClick={() => setStep('method')} className="text-sm text-[#3a4a6b] hover:text-white flex items-center gap-1.5 transition-colors">
                ← Back
              </button>
              <div className="bg-[#04060f] border border-primary/15 rounded-2xl p-8 text-center">
                <CreditCard size={36} className="text-primary mx-auto mb-4 opacity-70" />
                <p className="text-white font-bold">Card payments coming soon</p>
                <p className="text-[#3a4a6b] text-sm mt-2">Use M-Pesa or USDT for now</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}