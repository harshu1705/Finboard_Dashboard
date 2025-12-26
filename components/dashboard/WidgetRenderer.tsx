'use client'

import { memo, useCallback } from 'react'
import { X } from 'lucide-react'
import type { Widget } from '@/lib/types/widget'
import StockPriceWidget from '@/components/widgets/stock-price/StockPriceWidget'
import { WidgetErrorBoundary } from '@/components/widgets/WidgetErrorBoundary'
import { useDashboardStore } from '@/lib/stores/dashboardStore'

/**
 * Widget Renderer Component
 * 
 * Dynamically renders widgets based on their type.
 * Acts as a router/dispatcher for widget components.
 * 
 * Features:
 * - Type-based widget rendering
 * - Configuration extraction and passing
 * - Graceful handling of unknown widget types
 * - Scalable architecture for adding new widget types
 * 
 * Memoized to prevent unnecessary re-renders when widget props haven't changed.
 * Each widget fetches independently via its own hook, so re-renders are isolated.
 * 
 * @param widget - Widget configuration from Zustand store
 * @returns Rendered widget component or error fallback
 */
function WidgetRenderer({ widget }: { widget: Widget }) {
  // Extract common configuration
  const { type, title, config, id } = widget
  
  // Get remove function from store (Zustand selectors return stable references)
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  
  // Memoize remove handler to prevent unnecessary re-renders of memoized widget
  // This ensures the onRemove prop reference stays stable unless widget ID changes
  const handleRemove = useCallback(() => {
    removeWidget(id)
  }, [id, removeWidget])

  // Render widget based on type
  switch (type) {
    case 'price-card':
    case 'stock-price': {
      // Extract symbol from config
      const symbol = (config.symbol as string) || ''
      
      // Extract refresh interval (default: 30 seconds)
      const refreshInterval = 
        typeof config.refreshInterval === 'number' 
          ? config.refreshInterval 
          : undefined

      if (!symbol) {
        // UX hint component for unconfigured widgets
        // Wrap in error boundary for consistency
        return (
          <WidgetErrorBoundary widgetTitle={title || 'Unconfigured Widget'}>
            <div className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-6">
              {/* Delete button - top-right corner */}
              <button
                type="button"
                onClick={handleRemove}
                className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
                aria-label={`Remove ${title || 'widget'}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <span className="text-accent">⚙️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground">
                    {title || 'Unconfigured Widget'}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This widget needs configuration. Please add a stock symbol to display data.
                  </p>
                </div>
              </div>
            </div>
          </WidgetErrorBoundary>
        )
      }

      // Wrap widget in error boundary to prevent crashes
      return (
        <WidgetErrorBoundary widgetTitle={title || symbol}>
          <StockPriceWidget 
            symbol={symbol} 
            title={title}
            refreshInterval={refreshInterval}
            onRemove={handleRemove}
          />
        </WidgetErrorBoundary>
      )
    }

    case 'table':
    case 'chart':
    case 'portfolio-summary':
    case 'market-news':
    case 'price-chart':
    case 'custom':
    default: {
      // Unknown or not-yet-implemented widget types
      // Wrap in error boundary for consistency
      return (
        <WidgetErrorBoundary widgetTitle={title || 'Unknown Widget'}>
          <div className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-6">
            {/* Delete button - top-right corner */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
              aria-label={`Remove ${title || 'widget'}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800">
                <span className="text-lg">?</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">
                  {title || 'Unknown Widget'}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Widget type &quot;{type}&quot; is not yet implemented
                </p>
              </div>
            </div>
          </div>
        </WidgetErrorBoundary>
      )
    }
  }
}

// Memoize to prevent re-renders when widget object reference changes but content is the same
// This is important because Zustand may create new object references even when data is unchanged
// Each widget still fetches independently via its own hook, so this only optimizes rendering
export default memo(WidgetRenderer, (prevProps, nextProps) => {
  // Custom comparison: only re-render if widget ID or relevant config changes
  // Returns true if props are equal (skip re-render), false if different (re-render)
  // This prevents re-renders when unrelated store updates occur
  
  if (prevProps.widget.id !== nextProps.widget.id) return false
  if (prevProps.widget.type !== nextProps.widget.type) return false
  if (prevProps.widget.title !== nextProps.widget.title) return false
  
  // Deep compare config for price-card widgets (most common case)
  // Only compare relevant config properties to avoid unnecessary re-renders
  if (prevProps.widget.type === 'price-card' || prevProps.widget.type === 'stock-price') {
    const prevConfig = prevProps.widget.config || {}
    const nextConfig = nextProps.widget.config || {}
    
    // Compare only the config properties that affect rendering
    if (prevConfig.symbol !== nextConfig.symbol) return false
    if (prevConfig.refreshInterval !== nextConfig.refreshInterval) return false
  }
  
  // Props are equal, skip re-render
  return true
})

