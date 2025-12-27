import type { ChartPoint } from '@/components/widgets/chart/types'
import type { NormalizedStockData } from '@/lib/api/providers/types'

// Simple seeded demo data generator for reviewer/demo fallback
export function getDemoStock(symbol: string): NormalizedStockData {
  const s = symbol.trim().toUpperCase()
  const now = new Date()
  const base = 250 + (s.charCodeAt(0) % 100)
  return {
    symbol: s,
    price: Number((base + Math.random() * 50).toFixed(2)),
    open: Number((base - 3 + Math.random() * 6).toFixed(2)),
    high: Number((base + 5 + Math.random() * 10).toFixed(2)),
    low: Number((base - 5 + Math.random() * 10).toFixed(2)),
    previousClose: Number((base - 1 + Math.random() * 4).toFixed(2)),
    provider: 'demo',
    lastUpdated: now.toISOString(),
  }
}

// Generate simple time series points for charts (last n days)
export function getDemoChartPoints(symbol: string, days: number = 60): ChartPoint[] {
  const s = symbol.trim().toUpperCase()
  const points: ChartPoint[] = []
  const now = new Date()
  let base = 250 + (s.charCodeAt(0) % 100)
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    // random walk
    base = base + (Math.sin(i / 7) * 2) + (Math.random() - 0.5) * 3
    const close = Number(base.toFixed(2))
    const open = Number((close - (Math.random() - 0.5) * 4).toFixed(2))
    const high = Math.max(open, close) + Number((Math.random() * 2).toFixed(2))
    const low = Math.min(open, close) - Number((Math.random() * 2).toFixed(2))
    const volume = Math.round(100000 + Math.random() * 50000)
    points.push({
      date: date.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
    })
  }
  return points
}
