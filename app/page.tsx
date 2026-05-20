'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  TrendingUp, Zap, Shield, Brain,
  ArrowRight, Star, Activity,
  BarChart2, Globe, Users, DollarSign, Check,
  FlaskConical, Play, Menu, X
} from 'lucide-react'

/* ─── Animated counter hook ─────────────────────────────── */
function useCounter(target: number, duration = 2000, started = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!started) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.floor(p * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, started])
  return val
}

/* ─── Candlestick data generator ────────────────────────── */
function genCandles(n: number) {
  let price = 1.2850
  return Array.from({ length: n }, () => {
    const open = price
    const change = (Math.random() - 0.45) * 0.004
    const close = open + change
    const high = Math.max(open, close) + Math.random() * 0.002
    const low = Math.min(open, close) - Math.random() * 0.002
    price = close
    return { open, close, high, low, up: close >= open }
  })
}

/* ─── Floating particle system ──────────────────────────── */
function Particles({ count = 60 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.015 + 0.005,
      opacity: Math.random() * 0.4 + 0.1,
      drift: (Math.random() - 0.5) * 0.008,
    }))
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.current.forEach(p => {
        p.y -= p.speed
        p.x += p.drift
        if (p.y < -1) p.y = 101
        if (p.x < 0) p.x = 100
        if (p.x > 100) p.x = 0
        const x = (p.x / 100) * canvas.width
        const y = (p.y / 100) * canvas.height
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(59,130,246,${p.opacity})`
        ctx.fill()
      })
      animId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

/* ─── Live candlestick chart ────────────────────────────── */
function CandleChart({ height = 120, width = 300 }: { height?: number; width?: number }) {
  const [candles, setCandles] = useState(() => genCandles(28))
  useEffect(() => {
    const t = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1]
        const open = last.close
        const change = (Math.random() - 0.45) * 0.004
        const close = open + change
        return [...prev.slice(1), {
          open, close,
          high: Math.max(open, close) + Math.random() * 0.002,
          low: Math.min(open, close) - Math.random() * 0.002,
          up: close >= open
        }]
      })
    }, 1200)
    return () => clearInterval(t)
  }, [])

  const prices = candles.flatMap(c => [c.high, c.low])
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 0.001
  const toY = (v: number) => height - ((v - min) / range) * (height - 8) - 4
  const cw = width / candles.length
  const bw = Math.max(cw * 0.55, 2)

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="50%" stopColor="#00C48C" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {candles.map((c, i) => {
        const x = i * cw + cw / 2
        const openY = toY(c.open)
        const closeY = toY(c.close)
        const highY = toY(c.high)
        const lowY = toY(c.low)
        const color = c.up ? '#00C48C' : '#FF4757'
        const bodyTop = Math.min(openY, closeY)
        const bodyH = Math.max(Math.abs(closeY - openY), 1)
        return (
          <g key={i} filter="url(#glow)">
            <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="0.8" strokeOpacity="0.7" />
            <rect x={x - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} fillOpacity="0.85" rx="0.5" />
          </g>
        )
      })}
      <polyline
        points={candles.map((c, i) => `${i * cw + cw / 2},${toY(c.close)}`).join(' ')}
        fill="none" stroke="url(#lineGlow)" strokeWidth="1.5" filter="url(#glow)" opacity="0.6"
      />
    </svg>
  )
}

/* ─── Animated line sparkline ───────────────────────────── */
function Sparkline({ color = '#00C48C', up = true }: { color?: string; up?: boolean }) {
  const [pts, setPts] = useState(() => Array.from({ length: 20 }, () => 50 + (Math.random() - 0.5) * 30))
  useEffect(() => {
    const t = setInterval(() => {
      setPts(prev => {
        const last = prev[prev.length - 1]
        const next = Math.max(10, Math.min(90, last + (Math.random() - (up ? 0.4 : 0.6)) * 8))
        return [...prev.slice(1), next]
      })
    }, 600)
    return () => clearInterval(t)
  }, [up])
  const w = 80, h = 30
  const points = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - (v / 100) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points + ` ${w},${h} 0,${h}`} fill={`url(#sg${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Forex ticker ──────────────────────────────────────── */
const PAIRS = [
  { pair: 'EUR/USD', base: 1.0847, color: '#00C48C' },
  { pair: 'GBP/USD', base: 1.2634, color: '#00C48C' },
  { pair: 'USD/JPY', base: 149.82, color: '#FF4757' },
  { pair: 'AUD/USD', base: 0.6521, color: '#00C48C' },
  { pair: 'USD/CHF', base: 0.8934, color: '#FF4757' },
  { pair: 'NZD/USD', base: 0.5987, color: '#00C48C' },
  { pair: 'USD/CAD', base: 1.3621, color: '#FF4757' },
  { pair: 'XAU/USD', base: 2318.4, color: '#00C48C' },
]

function useLivePairs() {
  const [pairs, setPairs] = useState(PAIRS.map(p => ({ ...p, price: p.base, change: 0 })))
  useEffect(() => {
    const t = setInterval(() => {
      setPairs(prev => prev.map(p => {
        const delta = (Math.random() - 0.48) * p.base * 0.0003
        const price = p.price + delta
        return { ...p, price, change: ((price - p.base) / p.base) * 100 }
      }))
    }, 800)
    return () => clearInterval(t)
  }, [])
  return pairs
}

/* ─── MAIN PAGE ─────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const pairs = useLivePairs()

  const [heroPrice, setHeroPrice] = useState(1.0847)
  useEffect(() => {
    const t = setInterval(() => setHeroPrice(p => p + (Math.random() - 0.48) * 0.0003), 900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true) }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const traders = useCounter(247893, 2200, statsVisible)
  const volume = useCounter(4820, 2000, statsVisible)
  const winRate = useCounter(87, 1600, statsVisible)
  const countries = useCounter(42, 1400, statsVisible)

  const testimonials = [
    { name: 'James K.', role: 'Full-time Trader · Nairobi', profit: '+$12,840', text: 'Alphatrades changed how I see markets. The AI signals are genuinely accurate. I quit my 9-5 in 4 months.', stars: 5, avatar: 'JK' },
    { name: 'Amina W.', role: 'Part-time Trader · Mombasa', profit: '+$6,200', text: 'Started with the demo, learned fast. M-Pesa deposits make it so easy. Best platform for Kenyan traders.', stars: 5, avatar: 'AW' },
    { name: 'Brian M.', role: 'Prop Trader · Kampala', profit: '+$31,500', text: 'The volatility index trading is unmatched. Instant settlements, great UI. Nothing else comes close.', stars: 5, avatar: 'BM' },
  ]

  const features = [
    { icon: Brain, title: 'AI Signal Engine', desc: 'Our proprietary AI scans 200+ market indicators in real-time, delivering high-probability entry signals with confidence scores.', color: 'text-blue-400', glow: 'shadow-blue-500/20' },
    { icon: Zap, title: 'Instant Settlements', desc: 'Binary options settle in seconds. No waiting, no delays. Your profits hit your account the moment the trade closes.', color: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    { icon: Shield, title: 'M-Pesa Integration', desc: 'Deposit and withdraw in Kenyan Shillings via M-Pesa. Built specifically for East African traders.', color: 'text-green-400', glow: 'shadow-green-500/20' },
    { icon: BarChart2, title: 'Volatility Indices', desc: 'Trade synthetic indices 24/7 — markets never close. Deriv-powered, mathematically fair, always liquid.', color: 'text-purple-400', glow: 'shadow-purple-500/20' },
    { icon: Activity, title: 'Live Market Depth', desc: 'See real buy/sell pressure with our institutional-grade market depth visualizer. Trade with an edge.', color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    { icon: Globe, title: 'Multi-Asset Trading', desc: 'Forex, commodities, crypto, and synthetic indices — all in one dashboard with unified risk management.', color: 'text-rose-400', glow: 'shadow-rose-500/20' },
  ]

  return (
    <div className="min-h-screen bg-[#070d1a] text-white" style={{ overflowX: 'hidden' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0px) rotate(1deg)} 50%{transform:translateY(-8px) rotate(-1deg)} }
        @keyframes pulse-glow { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
        @keyframes shimmerAnim { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes rotatePhone { 0%,100%{transform:perspective(1200px) rotateY(-8deg) rotateX(3deg)} 50%{transform:perspective(1200px) rotateY(8deg) rotateX(-3deg)} }
        @keyframes lightStreak { 0%{transform:translateX(-200%) rotate(35deg);opacity:0} 50%{opacity:0.6} 100%{transform:translateX(300%) rotate(35deg);opacity:0} }
        @keyframes orbit { 0%{transform:rotate(0deg) translateX(120px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
        .float { animation: float 4s ease-in-out infinite }
        .float2 { animation: float2 5s ease-in-out infinite }
        .float3 { animation: float 6s ease-in-out infinite 1s }
        .pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite }
        .shimmer-text { background: linear-gradient(90deg, #fff 0%, #00C48C 30%, #3b82f6 60%, #fff 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmerAnim 4s linear infinite }
        .scan-line { animation: scan 3s linear infinite; background: linear-gradient(transparent, rgba(0,196,140,0.15), transparent); height:60px; width:100%; position:absolute; pointer-events:none }
        .ticker-inner { animation: ticker 35s linear infinite }
        .light-streak { animation: lightStreak 6s ease-in-out infinite }
        .light-streak-2 { animation: lightStreak 9s ease-in-out infinite 3s }
        .phone-float { animation: rotatePhone 8s ease-in-out infinite }
        .glow-green { box-shadow: 0 0 20px rgba(0,196,140,0.3), 0 0 60px rgba(0,196,140,0.1) }
        .glow-blue { box-shadow: 0 0 20px rgba(59,130,246,0.3), 0 0 60px rgba(59,130,246,0.1) }
        .glass { background: rgba(13,21,38,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.07) }
        .glass-light { background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08) }
        .grid-bg { background-image: linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px); background-size: 60px 60px }
        /* FIX: fade-up no longer sets opacity:0 inline — animation handles it fully */
        .fade-up { animation: fadeUp 0.8s ease forwards }
        .blink { animation: blink 1.4s ease-in-out infinite }
        .orbit-dot { animation: orbit 12s linear infinite }
        ::-webkit-scrollbar { width: 6px } ::-webkit-scrollbar-track { background: #070d1a } ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 3px }
        .card { background: #0d1526; border: 1px solid #1a2235; border-radius: 12px; }
        .card-hover:hover { border-color: rgba(26,86,255,0.4); transform: translateY(-2px); transition: all 0.2s ease; }
        .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background-color: #1A56FF; color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 9999px; font-size: 15px; transition: background 0.2s, box-shadow 0.2s; white-space: nowrap; }
        .btn-primary:hover { background-color: #3b6eff; }
        .btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(13,21,38,0.7); border: 1px solid rgba(255,255,255,0.07); color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 9999px; font-size: 15px; transition: background 0.2s; white-space: nowrap; backdrop-filter: blur(20px); }
        .btn-ghost:hover { background: rgba(255,255,255,0.05); }
        .btn-sm { padding: 10px 20px; font-size: 13px; }
        /* Mobile menu */
        .mobile-menu { display: none; }
        .mobile-menu.open { display: flex; }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass border-b border-white/5 py-3' : 'py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Image src="/logo.png" alt="Alphatrades" width={36} height={36} className="rounded-[9px]" />
            <span className="font-display font-bold text-lg tracking-tight">Alphatrades</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Markets', 'Pricing', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-[#5A6380] hover:text-white transition-colors font-medium">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/login" className="hidden sm:block text-sm text-[#5A6380] hover:text-white transition-colors font-semibold px-4 py-2">
              Sign In
            </Link>
            <Link href="/register" className="hidden sm:inline-flex btn-primary btn-sm glow-blue">
              Start Trading <ArrowRight size={14} />
            </Link>
            {/* FIX: Hamburger button for mobile */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-[#5A6380] hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* FIX: Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-4 flex flex-col gap-1">
            {['Features', 'Markets', 'Pricing', 'About'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="text-sm text-[#5A6380] hover:text-white transition-colors font-medium px-2 py-3 border-b border-white/5 last:border-b-0"
              >
                {item}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-3">
              <Link href="/login" className="btn-ghost justify-center" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              <Link href="/register" className="btn-primary glow-blue justify-center" onClick={() => setMenuOpen(false)}>
                Start Trading <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 grid-bg">
        <Particles count={70} />

        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-green-500/6 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="light-streak absolute top-1/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
        <div className="light-streak-2 absolute top-2/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />

        {/* Live badge */}
        {/* Live badge */}
        <div className="flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 fade-up">
          <span className="blink w-2 h-2 rounded-full" style={{ backgroundColor: '#00C48C' }} />
          <span className="text-xs font-mono font-semibold tracking-wider" style={{ color: '#00C48C' }}>LIVE MARKETS · 247,893 TRADERS ACTIVE</span>
        </div>

        {/* FIX: Removed inline opacity:0 — fade-up animation handles visibility */}
        <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-center leading-[1.0] sm:leading-[0.92] tracking-tight px-6 mb-6 fade-up" style={{ animationDelay: '0.1s' }}>
          <span className="shimmer-text">Trade Volatility.</span>
          <br />
          <span className="text-white">Win Consistently.</span>
        </h1>

        <p className="text-center text-lg sm:text-xl max-w-xl px-6 mb-10 leading-relaxed fade-up" style={{ animationDelay: '0.2s', color: '#5A6380' }}>
          Binary options & Forex trading built for East Africa. AI-powered signals, M-Pesa deposits, instant settlements.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 px-6 w-full max-w-sm sm:max-w-none sm:w-auto fade-up" style={{ animationDelay: '0.3s' }}>
          <Link href="/register" className="btn-primary glow-blue w-full sm:w-auto justify-center">
            Start Trading Free <ArrowRight size={16} />
          </Link>
          <Link href="/login?demo=true" className="btn-ghost w-full sm:w-auto justify-center">
            <FlaskConical size={16} className="text-yellow-400" /> Try $10K Demo
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs font-mono px-6 fade-up" style={{ animationDelay: '0.4s', color: '#5A6380' }}>
          {['✓ No deposit required', '✓ M-Pesa supported', '✓ Instant settlements', '✓ 87% avg win rate'].map(b => (
            <span key={b}>{b}</span>
          ))}
        </div>

        {/* Floating trading dashboard */}
        {/* FIX: overflow-hidden added to clip floating widgets safely */}
        <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 mt-16 fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="float glass rounded-2xl overflow-hidden border border-white/10" style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.15)' }}>
            {/* Dashboard header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.7)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(234,179,8,0.7)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(34,197,94,0.7)' }} />
                <span className="ml-3 text-xs font-mono hidden sm:block" style={{ color: '#5A6380' }}>alphatrades.app/trade</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="blink text-xs font-mono" style={{ color: '#00C48C' }}>● LIVE</span>
                <div className="text-xs font-mono" style={{ color: '#5A6380' }}>EUR/USD · {heroPrice.toFixed(5)}</div>
              </div>
            </div>

            {/* Chart area */}
            <div className="relative p-4" style={{ background: '#060c18' }}>
              <div className="scan-line" />
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-mono" style={{ color: '#5A6380' }}>EUR/USD · 1m · Binary Options</div>
                  <div className="text-2xl font-mono font-bold text-white">{heroPrice.toFixed(5)}</div>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 rounded font-mono font-bold" style={{ background: 'rgba(0,196,140,0.2)', color: '#00C48C' }}>CALL +82%</span>
                  <span className="text-xs px-2 py-1 rounded font-mono font-bold" style={{ background: 'rgba(255,71,87,0.2)', color: '#FF4757' }}>PUT +78%</span>
                </div>
              </div>
              <CandleChart height={140} width={800} />

              {/* AI Signal */}
              <div className="absolute top-4 right-4 glass px-3 py-2 rounded-xl" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
                <div className="text-xs font-mono font-bold text-blue-400">AI SIGNAL</div>
                <div className="font-bold text-sm" style={{ color: '#00C48C' }}>CALL ↑</div>
                <div className="text-xs" style={{ color: '#5A6380' }}>Confidence 91%</div>
              </div>
            </div>

            {/* FIX: Bottom stats — grid-cols-2 on mobile, grid-cols-4 on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/5">
              {[
                { label: 'Balance', val: '$24,850.00', color: '#ffffff' },
                { label: 'Today P&L', val: '+$1,240', color: '#00C48C' },
                { label: 'Win Rate', val: '89%', color: '#00C48C' },
                { label: 'Open Trades', val: '3', color: '#60a5fa' },
              ].map(({ label, val, color }) => (
                <div key={label} className="p-3 border-r border-white/5 last:border-r-0 border-b sm:border-b-0">
                  <div className="text-xs font-mono" style={{ color: '#5A6380' }}>{label}</div>
                  <div className="font-bold text-sm font-mono" style={{ color }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating widgets — desktop only, kept inside bounds */}
          <div className="float2 absolute -left-2 top-8 glass-light rounded-xl p-3 hidden lg:block" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-mono mb-1" style={{ color: '#5A6380' }}>BTC/USD</div>
            <div className="font-mono font-bold text-sm" style={{ color: '#00C48C' }}>$67,420</div>
            <Sparkline color="#00C48C" up={true} />
          </div>

          <div className="float3 absolute -right-2 top-12 glass-light rounded-xl p-3 hidden lg:block" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-mono mb-1" style={{ color: '#5A6380' }}>XAU/USD</div>
            <div className="font-mono font-bold text-sm text-yellow-400">$2,318</div>
            <Sparkline color="#f59e0b" up={true} />
          </div>
        </div>
      </section>

      {/* ── LIVE TICKER ────────────────────────────────────── */}
      <div className="border-y py-3 overflow-hidden" style={{ borderColor: '#1a2235', background: '#0d1526' }}>
        <div className="ticker-inner flex gap-12 whitespace-nowrap">
          {[...pairs, ...pairs].map((p, i) => (
            <div key={i} className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs font-mono font-bold text-white">{p.pair}</span>
              <span className="text-xs font-mono font-bold" style={{ color: p.change >= 0 ? '#00C48C' : '#FF4757' }}>
                {p.price.toFixed(p.pair === 'USD/JPY' ? 2 : p.pair === 'XAU/USD' ? 1 : 4)}
              </span>
              <span className="text-xs font-mono" style={{ color: p.change >= 0 ? '#00C48C' : '#FF4757' }}>
                {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(3)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section ref={statsRef} className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Active Traders', val: traders.toLocaleString(), suffix: '+', icon: Users },
            { label: 'Daily Volume', val: `$${volume.toLocaleString()}`, suffix: 'K+', icon: DollarSign },
            { label: 'Avg Win Rate', val: winRate, suffix: '%', icon: TrendingUp },
            { label: 'Countries', val: countries, suffix: '+', icon: Globe },
          ].map(({ label, val, suffix, icon: Icon }) => (
            <div key={label} className="card card-hover p-5 sm:p-6 text-center">
              <Icon size={20} className="text-blue-400 mx-auto mb-3" />
              <div className="font-display font-extrabold text-3xl sm:text-4xl text-white mb-1">
                {val}<span style={{ color: '#00C48C' }}>{suffix}</span>
              </div>
              <div className="text-xs font-mono" style={{ color: '#5A6380' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(13,21,38,0.5), transparent)' }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 text-xs font-mono text-blue-400">
              <Zap size={12} /> PLATFORM FEATURES
            </div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mb-4">
              Everything You Need to <span className="shimmer-text">Win.</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: '#5A6380' }}>
              Built from scratch for East African traders. No compromises, no watered-down features.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card card-hover p-6 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(26,86,255,0.1)' }}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5A6380' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARKETS TICKER ─────────────────────────────────── */}
      <section id="markets" className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display font-bold text-3xl text-white mb-2">Live Markets</h2>
            <p className="text-sm font-mono" style={{ color: '#5A6380' }}>Real-time prices — trade any pair instantly</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {pairs.map(p => (
              <div key={p.pair} className="card card-hover p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-white text-sm">{p.pair}</div>
                  <div className="text-xs font-mono" style={{ color: '#5A6380' }}>Binary · Forex</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm" style={{ color: p.change >= 0 ? '#00C48C' : '#FF4757' }}>
                    {p.price.toFixed(p.pair === 'USD/JPY' ? 2 : p.pair === 'XAU/USD' ? 1 : 4)}
                  </div>
                  <div className="text-xs font-mono" style={{ color: p.change >= 0 ? '#00C48C' : '#FF4757' }}>
                    {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(3)}%
                  </div>
                </div>
                <Sparkline color={p.change >= 0 ? '#00C48C' : '#FF4757'} up={p.change >= 0} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(26,86,255,0.03), transparent)' }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 text-xs font-mono" style={{ color: '#f59e0b' }}>
              <Star size={12} /> TRADER STORIES
            </div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mb-4">
              Real Traders. <span className="shimmer-text">Real Profits.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map(({ name, role, profit, text, stars, avatar }) => (
              <div key={name} className="card card-hover p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'rgba(26,86,255,0.2)', color: '#60a5fa' }}>
                      {avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm">{name}</div>
                      <div className="text-xs truncate" style={{ color: '#5A6380' }}>{role}</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm flex-shrink-0 ml-2" style={{ color: '#00C48C' }}>{profit}</div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={12} fill="#f59e0b" stroke="none" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#5A6380' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 text-xs font-mono text-blue-400">
              <DollarSign size={12} /> PRICING
            </div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mb-4">
              Simple, <span className="shimmer-text">Transparent Pricing.</span>
            </h2>
            <p className="text-lg" style={{ color: '#5A6380' }}>Start free. Scale as you grow.</p>
          </div>

          {/* FIX: grid-cols-1 on mobile, grid-cols-3 on md+ (not sm) */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 items-start">
            {[
              {
                name: 'Starter', price: 'Free', period: 'forever',
                features: ['$10,000 demo account', 'Basic AI signals', '5 markets', 'M-Pesa deposits', 'Email support'],
                cta: 'Get Started', highlight: false,
              },
              {
                name: 'Pro', price: 'KES 999', period: '/month',
                features: ['Everything in Starter', 'Advanced AI signals', 'All markets', 'Priority withdrawals', 'Live chat support', 'Copy trading'],
                cta: 'Start Pro', highlight: true,
              },
              {
                name: 'Elite', price: 'KES 2,499', period: '/month',
                features: ['Everything in Pro', 'Dedicated account manager', 'API access', 'Custom signals', 'VIP withdrawals', 'Risk management suite'],
                cta: 'Go Elite', highlight: false,
              },
            ].map(({ name, price, period, features, cta, highlight }) => (
              <div
                key={name}
                className={`card p-6 relative ${highlight ? 'ring-2 ring-[#1A56FF]' : ''}`}
                style={highlight ? { boxShadow: '0 0 40px rgba(26,86,255,0.2)', borderColor: 'rgba(26,86,255,0.5)' } : {}}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-mono font-bold px-4 py-1 rounded-full" style={{ background: '#1A56FF', color: '#fff' }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <div className="font-display font-bold text-white text-xl mb-1">{name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-extrabold text-4xl text-white">{price}</span>
                    <span className="text-sm" style={{ color: '#5A6380' }}>{period}</span>
                  </div>
                </div>
                <div className="space-y-3 mb-8">
                  {features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,196,140,0.2)' }}>
                        <Check size={10} style={{ color: '#00C48C' }} />
                      </div>
                      <span className="text-sm" style={{ color: '#5A6380' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className={highlight ? 'btn-primary glow-blue w-full justify-center' : 'btn-ghost w-full justify-center'}
                >
                  {cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE SECTION ─────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(13,21,38,0.3), transparent)' }} />
        {/* FIX: gap reduced from gap-16 to gap-8 sm:gap-16; overflow-hidden on parent */}
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 text-xs font-mono text-blue-400">
              <Play size={12} /> TRADE ANYWHERE
            </div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white mb-6">
              Your Trading Desk.<br /><span className="shimmer-text">In Your Pocket.</span>
            </h2>
            <p className="text-lg mb-8 leading-relaxed" style={{ color: '#5A6380' }}>
              Full-featured trading from any device. Responsive web app optimized for mobile — deposit via M-Pesa, trade volatility indices, withdraw profits, all in seconds.
            </p>
            <div className="space-y-4 mb-8">
              {[
                'Real-time push notifications for AI signals',
                'One-tap M-Pesa deposits and withdrawals',
                'Full chart suite on any screen size',
                'Biometric authentication for security',
              ].map(f => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,196,140,0.2)' }}>
                    <Check size={10} style={{ color: '#00C48C' }} />
                  </div>
                  <span className="text-sm" style={{ color: '#5A6380' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/register" className="btn-primary glow-blue">
              Open Web App <ArrowRight size={16} />
            </Link>
          </div>

          {/* Phone mockup — FIX: constrained width, overflow-hidden, badge repositioned */}
          <div className="flex justify-center">
            <div className="phone-float relative" style={{ width: 260, maxWidth: '100%' }}>
              <div className="relative rounded-[36px] overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.1)', background: '#060c18', boxShadow: '0 60px 120px rgba(0,0,0,0.9), 0 0 40px rgba(59,130,246,0.2)', height: 520 }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10" style={{ background: '#060c18' }} />
                <div className="absolute inset-0 p-4 pt-10 overflow-hidden">
                  <div className="text-center mb-3">
                    <div className="text-xs font-mono" style={{ fontSize: 10, color: '#5A6380' }}>EUR/USD · BINARY</div>
                    <div className="text-2xl font-mono font-bold text-white">{heroPrice.toFixed(5)}</div>
                    <div className="text-xs font-mono" style={{ color: '#00C48C' }}>▲ +0.024%</div>
                  </div>
                  <CandleChart height={100} width={220} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="font-bold py-3 rounded-xl text-xs" style={{ background: 'rgba(0,196,140,0.2)', border: '1px solid rgba(0,196,140,0.4)', color: '#00C48C' }}>
                      CALL ↑<br /><span style={{ fontSize: 10, opacity: 0.7 }}>Payout 82%</span>
                    </button>
                    <button className="font-bold py-3 rounded-xl text-xs" style={{ background: 'rgba(255,71,87,0.2)', border: '1px solid rgba(255,71,87,0.4)', color: '#FF4757' }}>
                      PUT ↓<br /><span style={{ fontSize: 10, opacity: 0.7 }}>Payout 78%</span>
                    </button>
                  </div>
                  <div className="mt-3 glass rounded-xl p-2">
                    <div className="font-mono mb-1" style={{ fontSize: 10, color: '#5A6380' }}>BALANCE</div>
                    <div className="font-mono font-bold text-white">$24,850.00</div>
                    <div className="font-mono" style={{ fontSize: 10, color: '#00C48C' }}>+$1,240 today</div>
                  </div>
                </div>
                <div className="scan-line opacity-30" />
                <div className="absolute top-0 left-0 right-0 h-40 rounded-t-[34px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), transparent)' }} />
              </div>

              {/* FIX: badge repositioned to -right-4 (was -right-8) and clamped within overflow-visible parent */}
              <div className="float2 absolute -right-4 top-16 glass-light rounded-xl p-3 w-36 glow-green" style={{ border: '1px solid rgba(0,196,140,0.3)' }}>
                <div className="font-mono font-bold" style={{ fontSize: 10, color: '#00C48C' }}>TRADE WON!</div>
                <div className="text-white font-bold text-sm">+$240</div>
                <div className="text-xs" style={{ color: '#5A6380' }}>EUR/USD · CALL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(26,86,255,0.08), transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[150px]" style={{ background: 'rgba(59,130,246,0.08)' }} />

        <div className="light-streak absolute top-1/4 w-full h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(96,165,250,0.5), transparent)' }} />
        <div className="light-streak-2 absolute bottom-1/3 w-full h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(0,196,140,0.4), transparent)' }} />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 text-xs font-mono" style={{ color: '#00C48C' }}>
            <DollarSign size={12} /> 247,893 TRADERS ALREADY WINNING
          </div>

          <h2 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-white mb-6 leading-tight">
            Your Next Trade<br />
            <span className="shimmer-text">Starts Right Now.</span>
          </h2>

          <p className="text-xl mb-12 max-w-xl mx-auto leading-relaxed" style={{ color: '#5A6380' }}>
            Join East Africa's most powerful trading platform. Start with $10,000 demo — no risk, no deposit required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 px-6">
            <Link
              href="/register"
              className="btn-primary glow-blue w-full sm:w-auto justify-center"
              style={{ boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 20px 40px rgba(0,0,0,0.5)', fontSize: 17, padding: '16px 36px' }}
            >
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="btn-ghost w-full sm:w-auto justify-center"
              style={{ fontSize: 17, padding: '16px 36px' }}
            >
              Sign Into Account
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: Shield, label: 'Funds Protected', color: 'text-blue-400' },
              { icon: Zap, label: 'Instant Withdrawals', color: 'text-yellow-400' },
              { icon: FlaskConical, label: '$10K Demo Free', color: 'text-green-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 text-sm" style={{ color: '#5A6380' }}>
                <Icon size={14} className={color} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="py-12 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo.png" alt="Alphatrades" width={32} height={32} className="rounded-[8px]" />
                <span className="font-display font-bold text-base">Alphatrades</span>
              </div>
              {/* FIX: was #2a3555 (near-invisible). Updated to #5A6380 for legibility */}
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#5A6380' }}>
                Binary options & Forex trading built for East Africa. Trade volatility indices with precision.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Trade', 'Markets', 'AI Signals', 'Mobile App'] },
              { title: 'Account', links: ['Sign In', 'Register', 'Demo Account', 'Referral Program'] },
              { title: 'Legal', links: ['Terms of Service', 'Privacy Policy', 'Risk Disclosure', 'Contact'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: '#5A6380' }}>{title}</div>
                <div className="space-y-3">
                  {/* FIX: was #2a3555. Updated to #8A95AA for legibility */}
                  {links.map(link => (
                    <a key={link} href="#" className="block text-sm hover:text-white transition-colors" style={{ color: '#8A95AA' }}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* FIX: copyright text was #2a3555. Updated to #5A6380 */}
            <div className="text-xs font-mono text-center sm:text-left" style={{ color: '#5A6380' }}>© 2026 Alphatrades. All rights reserved. Trading involves risk.</div>
            <div className="flex items-center gap-2">
              <span className="blink w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00C48C' }} />
              <span className="text-xs font-mono" style={{ color: '#5A6380' }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
