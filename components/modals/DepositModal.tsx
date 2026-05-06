'use client'

import { useState } from 'react'
import { X, Smartphone, CreditCard, Coins, ArrowRight, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { onClose: () => void }

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa',      desc: 'Instant mobile money',    icon: Smartphone, color: '#00C48C' },
  { id: 'usdt',  label: 'USDT (TRC20)',desc: 'Crypto · auto-credited',  icon: Coins,      color: '#FFB800' },
  { id: 'card',  label: 'Card',        desc: 'Visa, Mastercard',        icon: CreditCard, color: '#1A56FF' },
]
const USDT_ADDRESS = 'TQn9Y2khDD95R8uLEJBQ3JBVHaekN5VWHF'

export default function DepositModal({ onClose }: Props) {
  const [step, setStep] = useState<'method' | 'mpesa' | 'usdt' | 'card'>('method')
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stkSent, setStkSent] = useState(false)

  const handleMpesaDeposit = async () => {
    if (!amount || !phone) { toast.error('Enter amount and phone number'); return }
    const amtNum = parseFloat(amount)
    if (amtNum < 100) { toast.error('Minimum deposit is KES 100'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/deposit/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amtNum, phone }),
      })
      const data = await res.json()
      if (data.success) { setStkSent(true); toast.success('STK Push sent! Check your phone.') }
      else toast.error(data.error || 'Deposit failed')
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(USDT_ADDRESS)
    setCopied(true); toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    /* Always centred on screen */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#0d1526] border border-[#1a2235] w-full max-w-md rounded-[14px] overflow-hidden shadow-2xl animate-slide-up"
        style={{ borderRadius: 'var(--radius-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2235]">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              {step === 'method' ? 'Deposit Funds' : step === 'mpesa' ? 'M-Pesa' : step === 'usdt' ? 'USDT (TRC20)' : 'Card Payment'}
            </h2>
            <p className="text-xs text-[#5A6380] mt-0.5">
              {step === 'method' ? 'Choose a payment method' : 'Complete your deposit'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[#1a2235] hover:bg-[#2a3555] flex items-center justify-center transition-colors">
            <X size={15} className="text-[#5A6380]" />
          </button>
        </div>

        <div className="p-5">

          {/* Method selection */}
          {step === 'method' && (
            <div className="space-y-3">
              {PAYMENT_METHODS.map(({ id, label, desc, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setStep(id as any)}
                  className="w-full flex items-center gap-4 p-4 bg-[#070d1a] border border-[#1a2235] rounded-[10px] hover:border-primary/50 hover:bg-[#0a1220] transition-all group"
                >
                  <div className="w-11 h-11 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-white text-sm">{label}</div>
                    <div className="text-xs text-[#5A6380] mt-0.5">{desc}</div>
                  </div>
                  <ArrowRight size={15} className="text-[#5A6380] group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
              <div className="flex items-center justify-center gap-5 pt-2 text-xs text-[#5A6380]">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-win inline-block" />Secure</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />Instant</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />24/7 Support</span>
              </div>
            </div>
          )}

          {/* M-Pesa */}
          {step === 'mpesa' && !stkSent && (
            <div className="space-y-4">
              <button onClick={() => setStep('method')} className="text-xs text-[#5A6380] hover:text-white flex items-center gap-1.5 transition-colors">← Back</button>
              <div>
                <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest mb-2">Amount (KES)</label>
                <input
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500" min="100"
                  className="w-full bg-[#070d1a] border border-[#1a2235] rounded-[8px] px-4 py-3 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary transition-colors font-mono text-base"
                />
                <div className="grid grid-cols-4 gap-2 mt-2.5">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button key={amt} onClick={() => setAmount(amt.toString())}
                      className={`py-2 text-xs font-semibold rounded-[8px] transition-all ${amount === amt.toString() ? 'bg-primary text-white' : 'bg-[#070d1a] border border-[#1a2235] text-[#5A6380] hover:border-primary/50 hover:text-white'}`}>
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5A6380] uppercase tracking-widest mb-2">M-Pesa Phone</label>
                <input
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254712345678"
                  className="w-full bg-[#070d1a] border border-[#1a2235] rounded-[8px] px-4 py-3 text-white placeholder-[#2a3555] focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>
              <button onClick={handleMpesaDeposit} disabled={loading}
                className="w-full bg-win hover:bg-win/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-[22px] transition-all shadow-lg shadow-win/20">
                {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</span> : 'Send M-Pesa Request'}
              </button>
            </div>
          )}

          {step === 'mpesa' && stkSent && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-win/15 flex items-center justify-center mx-auto">
                <Check size={28} className="text-win" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">STK Push Sent!</h3>
                <p className="text-[#5A6380] text-sm mt-1.5 leading-relaxed">Check your phone and enter your M-Pesa PIN to complete.</p>
              </div>
              <div className="bg-[#070d1a] border border-win/20 rounded-[10px] p-3.5 text-sm text-[#5A6380]">
                Balance updates automatically once confirmed.
              </div>
              <button onClick={onClose} className="w-full bg-[#1a2235] hover:bg-[#2a3555] text-white font-bold py-3.5 rounded-[22px] transition-all">Done</button>
            </div>
          )}

          {step === 'usdt' && (
            <div className="space-y-4">
              <button onClick={() => setStep('method')} className="text-xs text-[#5A6380] hover:text-white flex items-center gap-1.5 transition-colors">← Back</button>
              <div className="bg-[#070d1a] border border-warning/25 rounded-[10px] p-4 space-y-3">
                <div className="text-sm font-bold text-warning">TRON (TRC20) Network Only</div>
                <div className="font-mono text-xs text-white break-all leading-relaxed bg-[#0a1020] rounded-[8px] p-3">{USDT_ADDRESS}</div>
                <button onClick={copyAddress} className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy Address'}
                </button>
              </div>
              <div className="text-xs text-[#5A6380] space-y-2 bg-[#070d1a] rounded-[10px] p-4">
                <div>• Minimum deposit: 10 USDT</div>
                <div>• Network: TRON (TRC20) only</div>
                <div>• Credits within 10–30 min after 1 confirmation</div>
              </div>
            </div>
          )}

          {step === 'card' && (
            <div className="space-y-4">
              <button onClick={() => setStep('method')} className="text-xs text-[#5A6380] hover:text-white flex items-center gap-1.5 transition-colors">← Back</button>
              <div className="bg-[#070d1a] border border-primary/20 rounded-[10px] p-8 text-center">
                <CreditCard size={32} className="text-primary mx-auto mb-3" />
                <p className="text-white font-bold">Card payments coming soon</p>
                <p className="text-[#5A6380] text-sm mt-1">Use M-Pesa or USDT for now</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}