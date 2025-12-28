'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChartPoint } from './types'

export default function LineChartView({ data }: { data: ChartPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null)
  const height = 160

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      setWidth(containerRef.current?.clientWidth || 600)
    })
    ro.observe(containerRef.current)
    setWidth(containerRef.current.clientWidth)
    return () => ro.disconnect()
  }, [])

  const points = data.slice(-100) // limit for performance
  if (points.length === 0) return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data</div>

  const values = points.map((p) => (p.close ?? p.open ?? 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  const padding = { left: 32, right: 12, top: 12, bottom: 24 }
  const plotWidth = Math.max(200, width - padding.left - padding.right)
  const plotHeight = height - padding.top - padding.bottom

  function x(i: number) {
    if (points.length === 1) return padding.left + plotWidth / 2
    return padding.left + (i / (points.length - 1)) * plotWidth
  }
  function y(v: number) {
    const pct = (v - min) / range
    return padding.top + (1 - pct) * plotHeight
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.close ?? p.open ?? 0)}`).join(' ')

  // ...existing code...

  return (
    <div ref={containerRef} className="w-full" style={{ height }}>
      <svg width={width} height={height}>
        <rect x={0} y={0} width={width} height={height} fill="transparent" />

        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padding.left} x2={padding.left + plotWidth} y1={padding.top + g * plotHeight} y2={padding.top + g * plotHeight} stroke="rgba(255,255,255,0.03)" />
        ))}

        {/* y axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
          const val = (max - g * (max - min))
          return (
            <text key={i} x={6} y={padding.top + g * plotHeight + 4} fontSize={11} fill="#9CA3AF">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val)}</text>
          )
        })}

        {/* line path */}
        <path d={path} fill="none" stroke="#34D399" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* hover circles & interaction */}
        {points.map((p, i) => {
          const cx = x(i)
          const cy = y(p.close ?? p.open ?? 0)
          return (
            <g key={p.date} onMouseEnter={() => setHover({ idx: i, x: cx, y: cy })} onMouseLeave={() => setHover(null)}>
              <circle cx={cx} cy={cy} r={hover?.idx === i ? 4 : 0} fill="#34D399" />
              {/* invisible hit area for easier hover */}
              <rect x={Math.max(padding.left + (i - 0.5) * (plotWidth / points.length), padding.left)} y={padding.top} width={Math.max(6, plotWidth / Math.max(1, points.length))} height={plotHeight} fill="transparent" />
            </g>
          )
        })}

        {/* tooltip */}
        {hover && (
          <g>
            <rect x={hover.x + 8} y={8} width={200} height={48} rx={6} fill="#071223" stroke="#1F2937" />
            <text x={hover.x + 16} y={28} fontSize={12} fill="#9CA3AF">{points[hover.idx].date}</text>
            <text x={hover.x + 16} y={44} fontSize={12} fill="#fff">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(points[hover.idx].close ?? points[hover.idx].open ?? 0)}</text>
          </g>
        )}
      </svg>
    </div>
  )
}
