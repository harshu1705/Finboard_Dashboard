'use client'

import EditWidgetModal from '@/components/dashboard/EditWidgetModal'
import { InvalidApiKeyError, NetworkError, RateLimitError } from '@/lib/api/providers/types'
import type { Widget } from '@/lib/types/widget'
import { Pencil, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import CandleChartView from './CandleChartView'
import { fetchTimeSeries } from './chartUtils'
import LineChartView from './LineChartView'
import type { ChartInterval, ChartPoint } from './types'

export default function ChartWidget({ widget, onRemove }: { widget: Widget, onRemove: () => void }) {
  const cfg = widget.config || {}
  const symbol = String(cfg.symbol || '')
  const chartType: 'line' | 'candle' = (cfg.chartType as any) || 'line'
  const interval: ChartInterval = (cfg.interval as any) || 'daily'
  const refreshInterval = typeof cfg.refreshInterval === 'number' ? cfg.refreshInterval : 60000

  const [data, setData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!symbol) return
    setIsLoading(true)
    setError(null)
    setShowErrorDetails(false)
    try {
      const pts = await fetchTimeSeries(symbol, interval, cfg.provider as string | undefined)
      setData(pts)
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [symbol, interval, cfg.provider])

  useEffect(() => {
    // initial fetch
    fetchData()
    // refresh on interval (enforce minimum 60s to avoid rate limits)
    const effectiveRefresh = Math.max(refreshInterval, 60000)
    const id = setInterval(() => {
      fetchData()
    }, effectiveRefresh)
    return () => clearInterval(id)
  }, [fetchData, refreshInterval])

  // derive minimal UI text values
  const title = widget.title || (symbol ? `${symbol} ${chartType === 'candle' ? 'Candles' : 'Price'}` : 'Chart')

  return (
    <div className="group relative rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-sm min-h-[220px] transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{symbol || 'No symbol configured'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} title="Refresh" onPointerDown={(e) => e.stopPropagation()} className="rounded-md p-1 hover:bg-gray-800">
            <RefreshCw className="h-4 w-4" />
          </button>

          <button type="button" onClick={() => setIsEditModalOpen(true)} title="Edit" onPointerDown={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:bg-gray-800">
            <Pencil className="h-4 w-4" />
          </button>

          <button onClick={onRemove} title="Remove widget" onPointerDown={(e) => e.stopPropagation()} className="rounded-md p-1 hover:bg-red-900/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading && (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
        )}

        {error && (
          <div className="h-48 flex items-center justify-center text-sm text-red-400 flex-col">
            <div className="font-medium">{error instanceof RateLimitError ? 'API rate limit exceeded. Please wait.' : error instanceof InvalidApiKeyError ? 'Invalid API key' : error instanceof NetworkError ? 'Network unavailable' : 'Unable to load chart data'}</div>
            <div className="mt-2 text-xs">
              <button onClick={() => setShowErrorDetails((s) => !s)} className="underline text-red-300">{showErrorDetails ? 'Hide details' : 'View details'}</button>
            </div>
            {showErrorDetails && (
              <pre className="mt-2 text-xs text-red-200 whitespace-pre-wrap break-words bg-red-900/10 p-2 rounded">{error.message}</pre>
            )}
          </div>
        )}

        {!isLoading && !error && data.length === 0 && (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No time series data available</div>
        )}

        {!isLoading && !error && data.length > 0 && (
          <div>
            {chartType === 'line' ? (
              <LineChartView data={data} />
            ) : (
              <CandleChartView data={data} />
            )}

            <div className="mt-3 text-xs text-muted-foreground">Last updated: <span className="text-foreground font-medium">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</span></div>
          </div>
        )}
      </div>
      <EditWidgetModal isOpen={isEditModalOpen} widget={widget} onClose={() => setIsEditModalOpen(false)} />
    </div>
  )
}
