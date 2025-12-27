'use client'

import { useMemo, useState } from 'react'
import type { ChartPoint } from './types'

export default function CandleChartView({ data }: { data: ChartPoint[] }) {
  // Simple custom SVG candlestick chart to avoid extra heavy deps.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const points = useMemo(() => data.slice(-60), [data]) // show last 60 points max

  const padding = { left: 10, right: 10, top: 10, bottom: 20 }
  const width = 800
  const height = 240

  const values = points.flatMap((p) => [p.open ?? p.close ?? 0, p.high ?? 0, p.low ?? 0, p.close ?? p.open ?? 0])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  const xStep = points.length > 1 ? (width - padding.left - padding.right) / (points.length - 1) : 0

  function yPos(v?: number) {
    if (v === undefined || v === null) return 0
    const pct = (v - min) / range
    return height - padding.bottom - pct * (height - padding.top - padding.bottom)
  }

  return (
    <div className="w-full overflow-auto">
      <div style={{ minWidth: Math.max(600, points.length * 12) }}>
        <svg width={Math.max(600, points.length * 12)} height={height}>
          <rect x={0} y={0} width="100%" height="100%" fill="transparent" />
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line key={g} x1={padding.left} x2={Math.max(600, points.length * 12) - padding.right} y1={padding.top + g * (height - padding.top - padding.bottom)} y2={padding.top + g * (height - padding.top - padding.bottom)} stroke="rgba(255,255,255,0.03)" />
          ))}

          {points.map((p, i) => {
            const cx = padding.left + i * xStep
            const open = p.open ?? p.close
            const close = p.close ?? p.open
            const high = p.high ?? Math.max(open ?? 0, close ?? 0)
            const low = p.low ?? Math.min(open ?? 0, close ?? 0)

            const yOpen = yPos(open)
            const yClose = yPos(close)
            const yHigh = yPos(high)
            const yLow = yPos(low)

            const candleColor = (close ?? 0) >= (open ?? 0) ? '#34D399' : '#FB7185'
            const candleWidth = 8

            return (
              <g key={p.date} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                {/* High-low line */}
                <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={candleColor} strokeWidth={1} />
                {/* Open-close rectangle */}
                <rect x={cx - candleWidth / 2} y={Math.min(yOpen, yClose)} width={candleWidth} height={Math.max(1, Math.abs(yClose - yOpen))} fill={candleColor} stroke="rgba(0,0,0,0.2)" />

                {/* Hover indicator */}
                {hoverIndex === i && (
                  <g>
                    <rect x={0} y={0} width={Math.max(600, points.length * 12)} height={20} fill="rgba(7,18,35,0.8)" />
                    <text x={10} y={14} fontSize={12} fill="#9CA3AF">{p.date} — O: {p.open ?? '—'} H: {p.high ?? '—'} L: {p.low ?? '—'} C: {p.close ?? '—'}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
