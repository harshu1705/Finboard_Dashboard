'use client'

import type { Widget } from '@/lib/types/widget'
import StockPriceWidget from '@/components/widgets/stock-price/StockPriceWidget'

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
 * @param widget - Widget configuration from Zustand store
 * @returns Rendered widget component or error fallback
 */
export default function WidgetRenderer({ widget }: { widget: Widget }) {
  // Extract common configuration
  const { type, title, config } = widget

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
        return (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
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
        )
      }

      return (
        <StockPriceWidget 
          symbol={symbol} 
          title={title}
          refreshInterval={refreshInterval}
        />
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
      return (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
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
      )
    }
  }
}

