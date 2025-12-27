import { InvalidApiKeyError, NetworkError, RateLimitError } from '@/lib/api/providers/types'
import type { ChartInterval, ChartPoint } from './types'

const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
const BASE_URL = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co/query'

function isRateLimitNotice(data: any): boolean {
  if (!data) return false
  if (typeof data !== 'object') return false
  return !!(data.Note || data.Information || (data['Error Message'] && String(data['Error Message']).toLowerCase().includes('call frequency')))
}

function findTimeSeriesKey(data: any): string | null {
  if (!data || typeof data !== 'object') return null
  return Object.keys(data).find((k) => /time series/i.test(k)) || null
}

function parseSeriesToPoints(seriesObj: Record<string, any>): ChartPoint[] {
  const points: ChartPoint[] = Object.entries(seriesObj).map(([date, vals]) => {
    const o = vals['1. open'] ?? vals['open'] ?? vals['Open']
    const h = vals['2. high'] ?? vals['high'] ?? vals['High']
    const l = vals['3. low'] ?? vals['low'] ?? vals['Low']
    const c = vals['4. close'] ?? vals['close'] ?? vals['Close']
    const v = vals['5. volume'] ?? vals['volume'] ?? vals['Volume']
    return {
      date,
      open: o !== undefined ? Number(String(o).replace(/[^0-9.-]+/g, '')) : undefined,
      high: h !== undefined ? Number(String(h).replace(/[^0-9.-]+/g, '')) : undefined,
      low: l !== undefined ? Number(String(l).replace(/[^0-9.-]+/g, '')) : undefined,
      close: c !== undefined ? Number(String(c).replace(/[^0-9.-]+/g, '')) : undefined,
      volume: v !== undefined ? Number(String(v).replace(/[^0-9.-]+/g, '')) : undefined,
    }
  })

  // sort ascending by date
  points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return points
}

/**
 * Fetch time series data from Alpha Vantage for the given symbol & interval
 * Returns an array of ChartPoint sorted ascending by date
 */
export async function fetchTimeSeriesAlphaVantage(symbol: string, interval: ChartInterval, outputsize: 'compact' | 'full' = 'compact'): Promise<ChartPoint[]> {
  if (!API_KEY) throw new Error('Alpha Vantage API key is missing')
  const fn = interval === 'daily' ? 'TIME_SERIES_DAILY' : interval === 'weekly' ? 'TIME_SERIES_WEEKLY' : 'TIME_SERIES_MONTHLY'
  const url = new URL(BASE_URL)
  url.searchParams.set('function', fn)
  url.searchParams.set('symbol', symbol.trim().toUpperCase())
  url.searchParams.set('apikey', API_KEY)
  url.searchParams.set('outputsize', outputsize)

  const res = await fetch(url.toString(), { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 429) throw new RateLimitError('API rate limit exceeded. Please wait.')
    if (res.status === 401 || res.status === 403) throw new InvalidApiKeyError('Invalid API key')
    throw new NetworkError(`HTTP error: ${res.status}`)
  }
  const data = await res.json()

  if (isRateLimitNotice(data)) {
    throw new RateLimitError('API rate limit exceeded. Please wait.')
  }

  const key = findTimeSeriesKey(data)
  if (!key) throw new Error('Time series data missing from provider response')

  const seriesObj = data[key]
  if (!seriesObj || Object.keys(seriesObj).length === 0) throw new Error('Empty time series')

  const points = parseSeriesToPoints(seriesObj)
  return points
}

/** Generic fetch wrapper - currently only supports alpha-vantage; can be extended */
export async function fetchTimeSeries(symbol: string, interval: ChartInterval, provider?: string) {
  const prov = provider || 'alpha-vantage'
  if (prov === 'alpha-vantage') {
    try {
      return await fetchTimeSeriesAlphaVantage(symbol, interval)
    } catch (err) {
      const demoEnabled = process.env.NEXT_PUBLIC_DISABLE_DEMO_FALLBACK !== 'true'
      if (demoEnabled) {
        const { getDemoChartPoints } = await import('@/lib/demo/demoData')
        // return seeded demo points (use compact size ~60)
        return getDemoChartPoints(symbol, 60)
      }
      throw err
    }
  }
  throw new Error(`Provider ${prov} does not support time series for charts`)
}
