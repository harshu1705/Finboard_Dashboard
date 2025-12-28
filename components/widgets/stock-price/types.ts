/**
 * Stock Price Widget Types
 * 
 * Type definitions specific to the Stock Price widget.
 * Widget-specific types that extend the base widget types.
 */

import type { StockQuote } from '@/lib/types/api'

/**
 * Stock Price Widget Props
 */
export interface StockPriceWidgetProps {
  /** Stock symbol to display (e.g., "AAPL", "MSFT") */
  symbol: string
  
  /** Optional widget title (defaults to symbol if not provided) */
  title?: string
  
  /** Optional refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number | null
  
  /** Optional callback function to handle widget removal */
  onRemove?: () => void
  
  /** Widget ID for config persistence */
  widgetId?: string
}

/**
 * Stock Price Hook State
 */
export interface StockPriceState {
  /** Stock quote data */
  data: StockQuote | null
  
  /** Raw API response for field extraction */
  rawResponse: unknown | null
  
  /** Loading state */
  isLoading: boolean
  
  /** Error state */
  error: Error | null
  
  /** Whether data has been fetched at least once */
  hasFetched: boolean
  
  /** Provider that successfully returned data */
  provider: 'alpha-vantage' | 'finnhub' | 'demo' | null
  
  /** Whether fallback occurred (data came from alternate provider) */
  usedFallback: boolean

  /** Whether realtime mode is enabled for this hook (requested) */
  isRealtimeEnabled?: boolean

  /** Whether a realtime WebSocket connection is currently active */
  realtimeConnected?: boolean

  /** Optional message when realtime is unavailable */
  realtimeUnavailableReason?: string | null
}

