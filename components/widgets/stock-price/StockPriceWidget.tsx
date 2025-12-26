'use client'

import { Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { useStockPrice } from './useStockPrice'
import type { StockPriceWidgetProps } from './types'
import { NetworkError, RateLimitError, AlphaVantageError } from '@/lib/types/api'

/**
 * Stock Price Widget Component
 * 
 * Fully isolated widget component that displays stock price information.
 * 
 * Features:
 * - Self-contained data fetching via custom hook
 * - Independent error handling
 * - Loading states
 * - Reusable for any stock symbol
 * 
 * @param props - Widget props
 * @param props.symbol - Stock symbol to display (e.g., "AAPL")
 * @param props.title - Optional widget title (defaults to symbol)
 * 
 * @example
 * ```tsx
 * <StockPriceWidget symbol="AAPL" />
 * <StockPriceWidget symbol="MSFT" title="Microsoft Stock" />
 * ```
 */
export default function StockPriceWidget({
  symbol,
  title,
}: StockPriceWidgetProps) {
  const { data, isLoading, error } = useStockPrice(symbol)

  // Format price with 2 decimal places
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  // Format last updated time
  const formatLastUpdated = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Unknown'
    }
  }

  // Get error message based on error type
  const getErrorMessage = (error: Error): string => {
    if (error instanceof RateLimitError) {
      return 'Rate limit exceeded. Please try again later.'
    }
    if (error instanceof NetworkError) {
      return 'Network error. Please check your connection.'
    }
    if (error instanceof AlphaVantageError) {
      return error.message || 'Failed to fetch stock data.'
    }
    return error.message || 'An error occurred.'
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-2 h-5 w-24 animate-pulse rounded bg-gray-800" />
            <div className="h-8 w-32 animate-pulse rounded bg-gray-800" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-800" />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-semibold text-red-400">
              {title || symbol.toUpperCase()}
            </h3>
            <p className="text-xs text-red-300/80">
              {getErrorMessage(error)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Data state
  if (!data) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  // Success state - display stock price
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 transition-colors hover:border-gray-700">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {title || data.symbol}
          </h3>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatPrice(data.price)}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <TrendingUp className="h-5 w-5 text-accent" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Updated {formatLastUpdated(data.lastUpdated)}</span>
      </div>
    </div>
  )
}

