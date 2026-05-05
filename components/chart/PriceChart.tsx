'use client'

import { useEffect, useRef, useMemo } from 'react'
import { usePriceStore } from '@/stores/usePriceStore'

interface Props {
  height?: number
  visibleTicks?: number
}

export default function PriceChart({ height = 220, visibleTicks = 100 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { ticks, currentPrice } = usePriceStore()

  const visible = useMemo(() => {
    return ticks.slice(-visibleTicks)
  }, [ticks, visibleTicks])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = container.offsetWidth
    const h = height

    canvas.width = width * dpr
    canvas.height = h * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, h)

    if (visible.length < 2) {
      ctx.strokeStyle = 'rgba(26, 86, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(width, h / 2)
      ctx.stroke()
      return
    }

    const minPrice = Math.min(...visible) * 0.9999
    const maxPrice = Math.max(...visible) * 1.0001
    const priceRange = maxPrice - minPrice || 1

    const padding = { top: 20, bottom: 30, left: 10, right: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = h - padding.top - padding.bottom

    const toX = (i: number) => padding.left + (i / (visible.length - 1)) * chartWidth
    const toY = (price: number) =>
      padding.top + ((maxPrice - price) / priceRange) * chartHeight

    const points = visible.map((p, i) => ({ x: toX(i), y: toY(p) }))

    // Grid lines — subtler on the darker bg
    ctx.strokeStyle = 'rgba(13, 21, 37, 0.8)'
    ctx.lineWidth = 1
    ctx.setLineDash([])
    const gridLines = 4
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartHeight
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width - padding.right + 8, y)
      ctx.stroke()
      const price = maxPrice - (i / gridLines) * priceRange
      ctx.fillStyle = 'rgba(58, 74, 107, 0.8)'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(price.toFixed(2), width, y + 4)
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h)
    gradient.addColorStop(0, 'rgba(26, 86, 255, 0.15)')
    gradient.addColorStop(0.5, 'rgba(26, 86, 255, 0.04)')
    gradient.addColorStop(1, 'rgba(26, 86, 255, 0)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, h - padding.bottom)
    points.forEach(({ x, y }) => ctx.lineTo(x, y))
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Price line
    ctx.save()
    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(26, 86, 255, 0.5)'
    ctx.strokeStyle = '#1A56FF'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.setLineDash([])
    ctx.beginPath()
    points.forEach(({ x, y }, i) => {
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.restore()

    // Current price dot
    const lastPoint = points[points.length - 1]
    ctx.save()
    ctx.shadowBlur = 14
    ctx.shadowColor = 'rgba(26, 86, 255, 0.7)'
    ctx.beginPath()
    ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#1A56FF'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    // Price bubble
    const bubbleX = lastPoint.x + 10
    const bubbleY = Math.max(lastPoint.y - 10, padding.top + 5)
    const bubbleText = currentPrice.toFixed(2)
    const bubbleWidth = bubbleText.length * 7.5 + 16
    const bubbleHeight = 22

    ctx.fillStyle = '#1A56FF'
    ctx.beginPath()
    ctx.roundRect(bubbleX, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 4)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = '600 11px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(bubbleText, bubbleX + 8, bubbleY + 4)

    // Time labels
    ctx.fillStyle = 'rgba(58, 74, 107, 0.8)'
    ctx.font = '10px DM Sans, sans-serif'
    ctx.textAlign = 'center'
    const timeLabels = 4
    for (let i = 0; i <= timeLabels; i++) {
      const idx = Math.floor((i / timeLabels) * (visible.length - 1))
      const x = toX(idx)
      const secsAgo = visible.length - 1 - idx
      const label = secsAgo === 0 ? 'now' : `-${secsAgo}s`
      ctx.fillText(label, x, h - 8)
    }
  }, [visible, currentPrice, height])

  return (
    <div ref={containerRef} className="w-full relative">
      <canvas ref={canvasRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  )
}