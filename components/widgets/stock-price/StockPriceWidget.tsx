'use client'

import EditWidgetModal from '@/components/dashboard/EditWidgetModal'
import { FieldSelectionPanel } from '@/components/widgets/FieldSelectionPanel'
import { NetworkError, RateLimitError } from '@/lib/api/providers/types'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { extractFields, formatFieldLabel, getNestedValue } from '@/lib/utils/fieldExtraction'
import { getProviderLabel } from '@/lib/utils/providerUtils'
import {
  getNormalizedField,
  normalizeApiResponse,
  type NormalizedResponse,
} from '@/lib/utils/responseNormalizer'
import type { FormatType } from '@/lib/utils/valueFormatter'
import { formatValue, getDefaultFormatType } from '@/lib/utils/valueFormatter'
import { AlertCircle, Clock, Pencil, TrendingUp, X } from 'lucide-react'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { StockPriceWidgetProps } from './types'
import { useStockPrice } from './useStockPrice'

function StockPriceWidget({
  symbol,
  title,
  refreshInterval,
  onRemove,
  widgetId,
}: StockPriceWidgetProps) {
  const widget = useDashboardStore((s) =>
    widgetId ? s.getWidget(widgetId) : undefined
  )
  const updateWidget = useDashboardStore((s) => s.updateWidget)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  const provider = useMemo<'alpha-vantage' | 'finnhub'>(() => {
    const p = widget?.config?.provider
    return p === 'finnhub' ? 'finnhub' : 'alpha-vantage'
  }, [widget?.config])

  const realtimeEnabled = Boolean(widget?.config?.realtime)

  const {
    data,
    isLoading,
    error,
    rawResponse,
    provider: actualProvider,
    usedFallback,
    isRealtimeEnabled,
    realtimeConnected,
    realtimeUnavailableReason,
  } = useStockPrice(symbol, refreshInterval, provider, realtimeEnabled)

  // const selectedFields = useMemo<string[]>(() => {
  //   const fields = widget?.config?.selectedFields || widget?.config?.fields
  //   if (!Array.isArray(fields) || fields.length === 0) return ['price']
  //   return fields.filter((f): f is string => typeof f === 'string' && f.trim())
  // }, [widget?.config])
  const selectedFields = useMemo<string[]>(() => {
  const rawFields = widget?.config?.selectedFields ?? widget?.config?.fields

  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    return ['price']
  }

  return rawFields
    .filter((f): f is string => typeof f === 'string')
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
}, [widget?.config])


  useEffect(() => {
    if (!widgetId || !widget) return

    const sf = widget.config?.selectedFields
    if (Array.isArray(sf) && sf.length > 0) return

    updateWidget(widgetId, {
      config: {
        ...widget.config,
        selectedFields: ['price'],
      },
    })
  }, [widgetId, widget, updateWidget])

  const normalizedResponse = useMemo<NormalizedResponse>(() => {
    try {
      return normalizeApiResponse(rawResponse, {
        price: data?.price,
        open: data?.open,
        high: data?.high,
        low: data?.low,
        previousClose: data?.previousClose,
        symbol: data?.symbol,
      })
    } catch {
      return {
        price: data?.price,
        open: data?.open,
        high: data?.high,
        low: data?.low,
        previousClose: data?.previousClose,
        symbol: data?.symbol,
      }
    }
  }, [rawResponse, data])

  const fieldFormats = useMemo<Record<string, FormatType>>(() => {
    const formats = widget?.config?.fieldFormats
    if (formats && typeof formats === 'object' && !Array.isArray(formats)) {
      return formats as Record<string, FormatType>
    }
    return {}
  }, [widget?.config])

  const renderSelectedFields = useMemo<React.ReactNode>(() => {
    const items = selectedFields
      .map((field) => {
        let value: unknown =
          getNormalizedField(normalizedResponse, field) ??
          (rawResponse ? getNestedValue(rawResponse, field) : null)

        if (value === null || value === undefined) return null

        const formatType = fieldFormats[field] || getDefaultFormatType(field)

        return (
          <div key={field}>
            <div className="text-xs text-muted-foreground mb-1">
              {formatFieldLabel(field)}
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatValue(value, formatType)}
            </div>
          </div>
        )
      })
      .filter(Boolean)

    if (items.length === 0 && normalizedResponse.price !== undefined) {
      return (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Price</div>
          <div className="text-2xl font-bold text-foreground">
            {formatValue(normalizedResponse.price, 'currency')}
          </div>
        </div>
      )
    }

    return <div className="space-y-3">{items}</div>
  }, [selectedFields, normalizedResponse, rawResponse, fieldFormats])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        Loading…
      </div>
    )
  }

  if (error) {
    const message =
      error instanceof RateLimitError
        ? 'API rate limit exceeded'
        : error instanceof NetworkError
        ? 'Network unavailable'
        : 'Unable to load data'

    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
        <p className="text-red-300 font-semibold">{message}</p>
        <button
          className="text-xs underline mt-2"
          onClick={() => setShowErrorDetails((s) => !s)}
        >
          {showErrorDetails ? 'Hide details' : 'View details'}
        </button>
        {showErrorDetails && (
          <pre className="mt-2 text-xs">{String(error.message)}</pre>
        )}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        No data available
      </div>
    )
  }

  return (
    <div className="group relative rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {title ?? data.symbol}
        </h3>
        {normalizedResponse.price !== undefined && (
          <div className="text-2xl font-bold text-accent">
            {formatValue(normalizedResponse.price, 'currency')}
          </div>
        )}
      </div>

      {renderSelectedFields}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" /> Updated
        </span>
        <span>
          {getProviderLabel(actualProvider, usedFallback, provider)}
        </span>
      </div>
{/* 
      {rawResponse && (
        <FieldSelectionPanel
          rawResponse={rawResponse}
          selectedFields={selectedFields}
          onFieldsChange={(fields) =>
            widgetId &&
            updateWidget(widgetId, {
              config: { ...widget?.config, selectedFields: fields },
            })
          }
          fieldFormats={fieldFormats}
          onFieldFormatsChange={(formats) =>
            widgetId &&
            updateWidget(widgetId, {
              config: { ...widget?.config, fieldFormats: formats },
            })
          }
          widgetId={widgetId}
        />
      )} */}

      {widget && (
        <EditWidgetModal
          isOpen={isEditModalOpen}
          widget={widget}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  )
}

export default memo(StockPriceWidget)
