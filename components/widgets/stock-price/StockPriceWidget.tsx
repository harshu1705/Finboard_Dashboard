'use client'

import { useMemo, memo, useCallback, useEffect } from 'react'
import { Clock, TrendingUp, AlertCircle, X } from 'lucide-react'
import { useStockPrice } from './useStockPrice'
import type { StockPriceWidgetProps } from './types'
import { NetworkError, RateLimitError } from '@/lib/api/providers/types'
import { FieldSelectionPanel } from '@/components/widgets/FieldSelectionPanel'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { getNestedValue, formatFieldLabel, extractFields } from '@/lib/utils/fieldExtraction'
import { normalizeApiResponse, getNormalizedField, type NormalizedResponse } from '@/lib/utils/responseNormalizer'

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
  
  // Get selected fields from config with safe defaults
  // Always returns a non-empty array with at least ['price']
  const selectedFields = useMemo(() => {
    try {
      if (!widget?.config) {
        return ['price'] // Safe default
      }
      
      // Prefer selectedFields, fallback to fields (legacy)
      const fields = widget.config.selectedFields || widget.config.fields
      
      // Validate and sanitize fields array
      if (!fields) {
        return ['price'] // Safe default
      }
      
      if (!Array.isArray(fields)) {
        return ['price'] // Safe default if not an array
      }
      
      // Filter out invalid entries and ensure non-empty
      const validFields = fields.filter(
        (f): f is string => typeof f === 'string' && f.trim().length > 0
      )
      
      // Always ensure at least price is selected
      if (validFields.length === 0) {
        return ['price'] // Safe default
      }
      
      return validFields
    } catch (error) {
      // Defensive: if anything goes wrong, return safe default
      if (process.env.NODE_ENV === 'development') {
        console.warn('[StockPriceWidget] Error reading selectedFields, using default:', error)
      }
      return ['price'] // Safe default
    }
  }, [widget?.config])
  
  // Initialize default selectedFields if not set (only once when widget is first loaded)
  // Default to price field only - safe initialization
  useEffect(() => {
    try {
      if (!widgetId || !widget) return
      
      const hasSelectedFields = widget.config?.selectedFields || widget.config?.fields
      
      // Only initialize if no fields are selected or if selectedFields is invalid
      const needsInitialization = 
        !hasSelectedFields || 
        !Array.isArray(hasSelectedFields) || 
        hasSelectedFields.length === 0 ||
        !hasSelectedFields.some(f => typeof f === 'string' && f.trim().length > 0)
      
      if (needsInitialization) {
        let defaultField = 'price' // Safe default
        
        if (rawResponse) {
          try {
            // Try to find price field in raw response
            const availableFields = extractFields(rawResponse)
            if (availableFields.length > 0) {
              const priceField = availableFields.find(f => 
                f.toLowerCase().includes('price') || 
                f.endsWith('.price') || 
                f === 'price' ||
                f.includes('05. price') || 
                f.includes('05.price')
              )
              defaultField = priceField || availableFields[0] || 'price'
            }
          } catch (error) {
            // Defensive: if extraction fails, use default
            if (process.env.NODE_ENV === 'development') {
              console.warn('[StockPriceWidget] Failed to extract fields for initialization:', error)
            }
          }
        }
        
        // Always set to at least ['price']
        updateWidget(widgetId, {
          config: {
            ...widget.config,
            selectedFields: [defaultField],
          },
        })
      }
    } catch (error) {
      // Defensive: if initialization fails, log but don't crash
      if (process.env.NODE_ENV === 'development') {
        console.warn('[StockPriceWidget] Error during field initialization:', error)
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

  // Normalize API response for safe field access
  // MUST be called before any early returns (Rules of Hooks)
  const normalizedResponse = useMemo(() => {
    try {
      return normalizeApiResponse(rawResponse, {
        price: data?.price,
        open: data?.open,
        high: data?.high,
        low: data?.low,
        previousClose: data?.previousClose,
        symbol: data?.symbol,
      })
    } catch (error) {
      // Defensive: if normalization fails, use normalized data only
      if (process.env.NODE_ENV === 'development') {
        console.warn('[StockPriceWidget] Failed to normalize response, using fallback:', error)
      }
      return {
        price: data?.price,
        open: data?.open,
        high: data?.high,
        low: data?.low,
        previousClose: data?.previousClose,
        symbol: data?.symbol,
      } as NormalizedResponse
    }
  }, [rawResponse, data])

  // Render selected fields with defensive checks
  // MUST be called before any early returns (Rules of Hooks)
  const renderSelectedFields = useMemo(() => {
    try {
      // Ensure we have at least one field (should always be price due to safe defaults)
      if (!selectedFields || selectedFields.length === 0) {
        // This should never happen due to safe defaults, but handle it defensively
        if (process.env.NODE_ENV === 'development') {
          console.warn('[StockPriceWidget] No fields selected, using default price')
        }
        if (normalizedResponse.price !== undefined) {
          return (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Price</div>
              <div className="text-2xl font-bold text-foreground">
                {formatPrice(normalizedResponse.price)}
              </div>
            </div>
          )
        }
        return (
          <div className="rounded border border-gray-800 bg-gray-900/30 p-3">
            <p className="text-xs text-muted-foreground">
              No data available. Please check the field selection panel.
            </p>
          </div>
        )
      }

      // Process fields in the order they were selected
      const fieldValues = selectedFields
        .map((field) => {
          try {
            let value: unknown = undefined
            
            // Try normalized response first (most reliable)
            value = getNormalizedField(normalizedResponse, field)
            
            // If not found in normalized, try raw response
            if ((value === null || value === undefined) && rawResponse) {
              try {
                value = getNestedValue(rawResponse, field)
              } catch (error) {
                // Silently fail - will show N/A
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[StockPriceWidget] Field "${field}" not found in raw response`)
                }
              }
            }
            
            // Validate value
            if (value === null || value === undefined || value === '') {
              return { field, value: null, label: formatFieldLabel(field), available: false }
            }
            
            // Validate numeric values
            if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`[StockPriceWidget] Invalid numeric value for field "${field}":`, value)
              }
              return { field, value: null, label: formatFieldLabel(field), available: false }
            }
            
            return { field, value, label: formatFieldLabel(field), available: true }
          } catch (error) {
            // Defensive: catch any errors during field extraction
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[StockPriceWidget] Error extracting field "${field}":`, error)
            }
            return { field, value: null, label: formatFieldLabel(field), available: false }
          }
        })

      // Separate available and unavailable fields
      const availableFields = fieldValues.filter(f => f.available && f.value !== null)
      const unavailableFields = fieldValues.filter(f => !f.available || f.value === null)

      // Log missing fields in dev mode
      if (process.env.NODE_ENV === 'development' && unavailableFields.length > 0) {
        console.warn(
          `[StockPriceWidget] Missing fields:`,
          unavailableFields.map(f => f.field).join(', ')
        )
      }

      // If no fields are available, show fallback
      if (availableFields.length === 0) {
        // Always try to show price as last resort
        if (normalizedResponse.price !== undefined) {
          return (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Price (fallback)</div>
                <div className="text-2xl font-bold text-foreground">
                  {formatPrice(normalizedResponse.price)}
                </div>
              </div>
              {unavailableFields.length > 0 && (
                <div className="rounded border border-yellow-900/50 bg-yellow-950/20 p-2">
                  <p className="text-xs text-yellow-300/80">
                    Selected fields not available. Showing price as fallback.
                  </p>
                </div>
              )}
            </div>
          )
        }
        
        return (
          <div className="rounded border border-yellow-900/50 bg-yellow-950/20 p-3">
            <p className="text-xs text-yellow-300/80">
              Selected fields are not available in the current data. Please select different fields.
            </p>
          </div>
        )
      }

      // Render available fields in selection order
      return (
        <div className="space-y-3">
          {availableFields.map(({ field, value, label }) => {
            // Format values safely
            let displayValue: string
            try {
              if (typeof value === 'number') {
                const fieldLower = field.toLowerCase()
                // Format as currency for price-related fields
                if (
                  value > 0 && 
                  value < 1000000 && 
                  (fieldLower.includes('price') || 
                   fieldLower.includes('open') || 
                   fieldLower.includes('high') || 
                   fieldLower.includes('low') || 
                   fieldLower.includes('close'))
                ) {
                  displayValue = formatPrice(value)
                } else {
                  displayValue = value.toLocaleString()
                }
              } else if (value instanceof Date) {
                displayValue = value.toLocaleString()
              } else {
                displayValue = String(value)
              }
            } catch (error) {
              // Defensive fallback
              if (process.env.NODE_ENV === 'development') {
                console.warn(`[StockPriceWidget] Formatting error for field "${field}":`, error)
              }
              displayValue = String(value ?? 'N/A')
            }

            return (
              <div key={field}>
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-lg font-semibold text-foreground">{displayValue}</div>
              </div>
            )
          })}
          
          {/* Show unavailable fields as N/A if any */}
          {unavailableFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-800">
              {unavailableFields.map(({ field, label }) => (
                <div key={field}>
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-lg font-semibold text-muted-foreground">N/A</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    } catch (error) {
      // Last resort error handling - should never reach here
      if (process.env.NODE_ENV === 'development') {
        console.error('[StockPriceWidget] Fatal error in renderSelectedFields:', error)
      }
      
      // Always show price if available
      if (normalizedResponse.price !== undefined) {
        return (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Price</div>
            <div className="text-2xl font-bold text-foreground">
              {formatPrice(normalizedResponse.price)}
            </div>
          </div>
        )
      }
      
      return (
        <div className="rounded border border-red-900/50 bg-red-950/20 p-3">
          <p className="text-xs text-red-300/80">
            Unable to display data. Please refresh the widget.
          </p>
        </div>
      )
    }
  }, [normalizedResponse, selectedFields, rawResponse, formatPrice])

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

