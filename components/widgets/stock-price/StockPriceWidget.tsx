'use client'

import { useMemo, memo, useCallback, useEffect } from 'react'
import { Clock, TrendingUp, AlertCircle, X } from 'lucide-react'
import { useStockPrice } from './useStockPrice'
import type { StockPriceWidgetProps } from './types'
import { NetworkError, RateLimitError } from '@/lib/api/providers/types'
import { FieldSelectionPanel } from '@/components/widgets/FieldSelectionPanel'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { getNestedValue, formatFieldLabel, extractFields } from '@/lib/utils/fieldExtraction'

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
function StockPriceWidget({
  symbol,
  title,
  refreshInterval,
  onRemove,
  widgetId,
}: StockPriceWidgetProps) {
  const { data, isLoading, error, rawResponse } = useStockPrice(symbol, refreshInterval)
  
  // Get widget config and update function from store
  const widget = useDashboardStore((state) => 
    widgetId ? state.getWidget(widgetId) : undefined
  )
  const updateWidget = useDashboardStore((state) => state.updateWidget)
  
  // Get selected fields from config, default to ['price'] if not set
  // Support both 'selectedFields' (new) and 'fields' (legacy) for backward compatibility
  const selectedFields = useMemo(() => {
    if (!widget?.config) {
      return ['price'] // Default to price field
    }
    
    // Prefer selectedFields, fallback to fields (legacy)
    const fields = widget.config.selectedFields || widget.config.fields
    
    if (!fields) {
      return ['price'] // Default to price field
    }
    
    if (Array.isArray(fields) && fields.length > 0) {
      return fields as string[]
    }
    
    return ['price'] // Default to price field
  }, [widget?.config])
  
  // Initialize default selectedFields if not set (only once when widget is first loaded)
  useEffect(() => {
    if (!widgetId || !widget) return
    
    const hasSelectedFields = widget.config.selectedFields || widget.config.fields
    
    if (!hasSelectedFields && rawResponse) {
      // Auto-select 'price' field if available, or first available field
      const availableFields = extractFields(rawResponse)
      const defaultField = availableFields.find(f => 
        f.includes('price') || f.endsWith('.price') || f === 'price'
      ) || availableFields[0] || 'price'
      
      if (defaultField) {
        updateWidget(widgetId, {
          config: {
            ...widget.config,
            selectedFields: [defaultField],
          },
        })
      }
    }
  }, [widgetId, widget, rawResponse, updateWidget])
  
  // Handle field selection change
  const handleFieldsChange = useCallback((fields: string[]) => {
    if (!widgetId) return
    
    updateWidget(widgetId, {
      config: {
        ...widget?.config,
        selectedFields: fields,
      },
    })
  }, [widgetId, widget?.config, updateWidget])

  // Memoize price formatter to avoid recreating Intl.NumberFormat on every render
  // This is a pure function with no dependencies, so it only needs to be created once
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  )

  // Format price with 2 decimal places
  const formatPrice = (price: number): string => {
    return priceFormatter.format(price)
  }

  // Memoize formatted last updated time to avoid recalculating on every render
  // Only recalculates when data.lastUpdated changes
  const formattedLastUpdated = useMemo(() => {
    if (!data?.lastUpdated) return 'Unknown'
    
    try {
      const date = new Date(data.lastUpdated)
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
  }, [data?.lastUpdated])

  // Get user-friendly error message based on error type
  const getErrorMessage = (error: Error): string => {
    if (error instanceof RateLimitError) {
      return 'API limit reached. Please try again in a few minutes.'
    }
    if (error instanceof NetworkError) {
      return 'Network error. Please check your internet connection.'
    }
    // Check for common error messages in generic errors
    const message = error.message.toLowerCase()
    if (message.includes('rate limit') || message.includes('call frequency')) {
      return 'API limit reached. Please try again later.'
    }
    if (message.includes('invalid') || message.includes('not found')) {
      return 'Stock symbol not found. Please check the symbol and try again.'
    }
    if (message.includes('all providers failed')) {
      return 'Unable to fetch data from any provider. Please try again later.'
    }
    // Generic error fallback
    return error.message || 'Unable to load data. Please try again later.'
  }

  // Loading state with improved skeleton
  if (isLoading) {
    return (
      <div className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
            aria-label={`Remove ${title || symbol} widget`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            {/* Title skeleton */}
            <div className="h-4 w-24 animate-pulse rounded bg-gray-800/60" />
            {/* Price skeleton */}
            <div className="h-8 w-32 animate-pulse rounded bg-gray-800/60" />
          </div>
          {/* Icon skeleton */}
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-800/60" />
        </div>
        {/* Footer skeleton */}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded bg-gray-800/60" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-800/60" />
        </div>
      </div>
    )
  }

  // Error state with improved UI
  if (error) {
    return (
      <div className="group relative rounded-lg border border-red-900/50 bg-red-950/20 p-6">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
            aria-label={`Remove ${title || symbol} widget`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-900/20">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="mb-1 text-sm font-semibold text-red-400">
              {title || symbol.toUpperCase()}
            </h3>
            <p className="text-xs text-red-300/80 leading-relaxed">
              {getErrorMessage(error)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // No data state with improved UI
  if (!data) {
    return (
      <div className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
            aria-label={`Remove ${title || symbol} widget`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800/50">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground">
              {title || symbol.toUpperCase()}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              No data available
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render selected fields from raw response or fallback to normalized data
  const renderSelectedFields = useMemo(() => {
    if (!rawResponse && selectedFields.length === 0) {
      // Fallback: show default price if no raw response and no selections
      return (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Price</div>
          <div className="text-2xl font-bold text-foreground">
            {formatPrice(data.price)}
          </div>
        </div>
      )
    }

    // Try to get values from raw response first, fallback to normalized data
    const fieldValues = selectedFields
      .map((field) => {
        let value: unknown = null
        
        // Try raw response first
        if (rawResponse) {
          value = getNestedValue(rawResponse, field)
        }
        
        // Fallback to normalized data if raw response doesn't have it
        if (value === null || value === undefined) {
          // Map common field paths to normalized data
          if (field === 'price' || field.endsWith('.price')) {
            value = data.price
          } else if (field === 'symbol' || field.endsWith('.symbol')) {
            value = data.symbol
          } else if (field === 'open' || field.endsWith('.open')) {
            value = data.open
          } else if (field === 'high' || field.endsWith('.high')) {
            value = data.high
          } else if (field === 'low' || field.endsWith('.low')) {
            value = data.low
          } else if (field === 'previousClose' || field.endsWith('.previousClose') || field.includes('previous close')) {
            value = data.previousClose
          }
        }
        
        return { field, value, label: formatFieldLabel(field) }
      })
      .filter((item) => item.value !== null && item.value !== undefined)

    if (fieldValues.length === 0) {
      // No valid fields, show default price
      return (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Price</div>
          <div className="text-2xl font-bold text-foreground">
            {formatPrice(data.price)}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {fieldValues.map(({ field, value, label }) => {
          // Format numeric values as currency if they look like prices
          let displayValue: string
          if (typeof value === 'number') {
            // Check if it's likely a price (positive number, reasonable range)
            if (value > 0 && value < 1000000 && (field.includes('price') || field.includes('open') || field.includes('high') || field.includes('low') || field.includes('close'))) {
              displayValue = formatPrice(value)
            } else {
              displayValue = value.toLocaleString()
            }
          } else if (value instanceof Date) {
            displayValue = value.toLocaleString()
          } else {
            displayValue = String(value)
          }

          return (
            <div key={field}>
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="text-lg font-semibold text-foreground">{displayValue}</div>
            </div>
          )
        })}
      </div>
    )
  }, [rawResponse, selectedFields, data, formatPrice])

  // Success state - display selected fields
  return (
    <div className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-6 transition-colors hover:border-gray-700">
      {/* Delete button - top-right corner, visible on hover */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
          aria-label={`Remove ${title || symbol} widget`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title || data.symbol}
          </h3>
          {/* Render selected fields */}
          <div className="mt-2">
            {renderSelectedFields}
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <TrendingUp className="h-5 w-5 text-accent" />
        </div>
      </div>

      {/* Field Selection Panel */}
      {rawResponse && (
        <FieldSelectionPanel
          rawResponse={rawResponse}
          selectedFields={selectedFields}
          onFieldsChange={handleFieldsChange}
          widgetId={widgetId}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Updated {formattedLastUpdated}</span>
        </div>
        {/* Provider badge - subtle indicator of which API was used */}
        {data.provider && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-gray-800/50 text-muted-foreground">
            {data.provider === 'alpha-vantage'
              ? 'AV'
              : data.provider === 'finnhub'
              ? 'FH'
              : data.provider === 'indian-api'
              ? 'IN'
              : data.provider}
          </span>
        )}
      </div>
    </div>
  )
}

// Memoize widget to prevent re-renders when parent re-renders but props haven't changed
// Each widget fetches independently via useStockPrice hook, so this only optimizes rendering
// Props comparison ensures widget only re-renders when symbol, title, refreshInterval, or onRemove changes
// Note: onRemove function reference should be stable (memoized in parent) to avoid unnecessary re-renders
export default memo(StockPriceWidget, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.title === nextProps.title &&
    prevProps.refreshInterval === nextProps.refreshInterval &&
    prevProps.onRemove === nextProps.onRemove
  )
})

