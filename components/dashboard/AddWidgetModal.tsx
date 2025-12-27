'use client'

import type { ProviderName } from '@/lib/api/providers/fallback'
import { fetchStockDataRaw } from '@/lib/api/providers/rawResponseFetcher'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { CreateWidgetPayload, WidgetType } from '@/lib/types/widget'
import { AlertCircle, CheckCircle2, Play, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import JsonViewer from './JsonViewer'

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * AddWidgetModal Component
 * 
 * Modal for adding new widgets to the dashboard.
 * Handles form input and widget creation via Zustand store.
 * 
 * Features:
 * - Widget name, type, symbol, and refresh interval configuration
 * - Form validation
 * - Focus trap for accessibility
 * - ESC key to close
 */
export default function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const addWidget = useDashboardStore((state) => state.addWidget)
  
  const [widgetName, setWidgetName] = useState('')
  const [widgetType, setWidgetType] = useState<WidgetType>('price-card')
  const [apiProvider, setApiProvider] = useState('alpha-vantage')
  const [stockSymbol, setStockSymbol] = useState('')
  const [refreshInterval, setRefreshInterval] = useState<string>('60')
  // Table-specific inputs
  const [tablePageSize, setTablePageSize] = useState<string>('5')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Validation state
  const [errors, setErrors] = useState<{
    widgetName?: string
    stockSymbol?: string
    refreshInterval?: string
  }>({})

  // API testing state
  const [isTestingApi, setIsTestingApi] = useState(false)
  const [apiResponse, setApiResponse] = useState<unknown>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  
  // Refs for focus trap
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLInputElement>(null)
  const lastFocusableRef = useRef<HTMLButtonElement>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setWidgetName('')
      setWidgetType('price-card')
      setApiProvider('alpha-vantage')
      setStockSymbol('')
      setRefreshInterval('60')
      setIsSubmitting(false)
      setApiResponse(null)
      setApiError(null)
      setSelectedFields([])
      setIsTestingApi(false)
      setErrors({})
      // Focus first input when modal opens
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 100)
    }
  }, [isOpen])
  
  // Validation functions
  const validateWidgetName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Widget name is required'
    }
    return undefined
  }
  
  const validateStockSymbol = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Stock symbol is required'
    }
    return undefined
  }
  
  const validateRefreshInterval = (value: string): string | undefined => {
    const numValue = parseInt(value, 10)
    if (!value.trim()) {
      return 'Refresh interval is required'
    }
    if (isNaN(numValue) || numValue < 5) {
      return 'Refresh interval must be at least 5 seconds'
    }
    return undefined
  }

  const validateSymbols = (value: string): string | undefined => {
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length === 0) return 'At least one symbol is required (comma-separated)'
    return undefined
  }
  
  // Validate all fields and return if form is valid (type-aware)
  const isFormValid = (): boolean => {
    const nameError = validateWidgetName(widgetName)
    const intervalError = validateRefreshInterval(refreshInterval)

    let symbolError: string | undefined
    if (widgetType === 'price-card' || widgetType === 'chart') {
      symbolError = validateStockSymbol(stockSymbol)
    } else if (widgetType === 'table') {
      symbolError = validateSymbols(stockSymbol)
    } else {
      symbolError = undefined
    }

    setErrors({
      widgetName: nameError,
      stockSymbol: symbolError,
      refreshInterval: intervalError,
    })
    
    return !nameError && !symbolError && !intervalError
  }

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validate all fields
    if (!isFormValid()) {
      return
    }

    setIsSubmitting(true)

    // Parse refresh interval (convert seconds to milliseconds)
    const refreshIntervalMs = parseInt(refreshInterval, 10)
    // Enforce minimum interval of 60 seconds (60000ms) to avoid hitting API rate limits
    const validRefreshInterval = isNaN(refreshIntervalMs) || refreshIntervalMs <= 0
      ? 60000 // Default 60 seconds
      : Math.max(refreshIntervalMs * 1000, 60000) // Convert to ms and enforce minimum 60s

    // Create widget payload matching exact specification (supports price-card and table)
    let widgetPayload: CreateWidgetPayload

    if (widgetType === 'table') {
      const symbols = stockSymbol.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)

      widgetPayload = {
        type: 'table',
        title: widgetName.trim(),
        config: {
          symbols,
          refreshInterval: validRefreshInterval,
          pageSize: Number(tablePageSize) || 5,
          page: 1,
          sortField: 'symbol',
          sortDir: 'asc',
          selectedFields: selectedFields.length > 0 ? selectedFields : ['price'],
        },
      }
    } else if (widgetType === 'chart') {
      widgetPayload = {
        type: 'chart',
        title: widgetName.trim(),
        config: {
          symbol: stockSymbol.trim().toUpperCase(),
          refreshInterval: validRefreshInterval,
          provider: (apiProvider as ProviderName) || 'alpha-vantage',
          chartType: 'line',
          interval: 'daily',
        },
      }
    } else {
      widgetPayload = {
        type: 'price-card',
        title: widgetName.trim(),
        config: {
          symbol: stockSymbol.trim().toUpperCase(),
          refreshInterval: validRefreshInterval,
          provider: (apiProvider as ProviderName) || 'alpha-vantage',
          selectedFields: selectedFields.length > 0 ? selectedFields : [],
          // Keep fields for backward compatibility
          fields: selectedFields.length > 0 ? selectedFields : [],
        },
      }
    }

    // Add widget to store
    addWidget(widgetPayload)

    // Reset form and close modal
    setWidgetName('')
    setWidgetType('price-card')
    setApiProvider('alpha-vantage')
    setStockSymbol('')
    setRefreshInterval('30')
    setTablePageSize('5')
    setApiResponse(null)
    setApiError(null)
    setSelectedFields([])
    setIsSubmitting(false)
    setIsTestingApi(false)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Test API function
  const handleTestApi = async () => {
    // Validate symbol
    const symbol = stockSymbol.trim().toUpperCase()
    if (!symbol) {
      setApiError('Please enter a stock symbol')
      setApiResponse(null)
      return
    }

    setIsTestingApi(true)
    setApiError(null)
    setApiResponse(null)

    try {
      // Use the selected provider to test API
      const selectedProvider = (apiProvider as ProviderName) || 'alpha-vantage'
      
      // Fetch raw response from the selected provider
      const rawResponse = await fetchStockDataRaw(selectedProvider, symbol)
      
      setApiResponse(rawResponse)
      setApiError(null)
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while testing the API'
      
      setApiError(errorMessage)
      setApiResponse(null)
    } finally {
      setIsTestingApi(false)
    }
  }

  // Handle field selection
  const handleFieldSelect = (path: string) => {
    setSelectedFields((prev) => {
      if (prev.includes(path)) {
        // Remove if already selected
        return prev.filter((p) => p !== path)
      } else {
        // Add if not selected (prevent duplicates)
        return [...prev, path]
      }
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal container - larger for API testing */}
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-lg border border-gray-800 bg-gray-900 shadow-xl flex flex-col"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 id="modal-title" className="text-xl font-semibold text-foreground">
            Add New Widget
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-gray-800 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal body - scrollable */}
        <form onSubmit={handleSubmit} className="px-6 py-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Widget Name Input */}
            <div>
              <label
                htmlFor="widget-name"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Widget Name <span className="text-red-400">*</span>
              </label>
              <input
                ref={firstFocusableRef}
                id="widget-name"
                type="text"
                value={widgetName}
                onChange={(e) => {
                  setWidgetName(e.target.value)
                  // Clear error when user starts typing
                  if (errors.widgetName) {
                    setErrors((prev) => ({ ...prev, widgetName: undefined }))
                  }
                }}
                onBlur={() => {
                  // Validate on blur
                  const error = validateWidgetName(widgetName)
                  setErrors((prev) => ({ ...prev, widgetName: error }))
                }}
                placeholder="e.g., Apple Stock"
                className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  errors.widgetName
                    ? 'border-red-500 bg-gray-950 focus:border-red-500'
                    : 'border-gray-800 bg-gray-950 focus:border-accent'
                }`}
                required
                autoFocus
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!errors.widgetName}
                aria-describedby={errors.widgetName ? 'widget-name-error' : undefined}
              />
              {errors.widgetName && (
                <p id="widget-name-error" className="mt-1 text-xs text-red-400">
                  {errors.widgetName}
                </p>
              )}
            </div>

            {/* Widget Type Select */}
            <div>
              <label
                htmlFor="widget-type"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Widget Type
              </label>
              <select
                id="widget-type"
                value={widgetType}
                onChange={(e) => setWidgetType(e.target.value as WidgetType)}
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                disabled={isSubmitting}
              >
                <option value="price-card">Price Card</option>
                <option value="table">Table</option>
                <option value="chart">Chart</option>
              </select>
            </div>

            {/* API Provider Select */}
            <div>
              <label
                htmlFor="api-provider"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                API Provider
              </label>
              <select
                id="api-provider"
                value={apiProvider}
                onChange={(e) => setApiProvider(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                disabled={isSubmitting || isTestingApi}
              >
                <option value="alpha-vantage">Alpha Vantage</option>
                <option value="finnhub">Finnhub</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                If the selected provider fails, the system will automatically fallback to the alternate provider.
              </p>
            </div>

            {/* Stock Symbol Input */}
            <div>
              <label
                htmlFor="stock-symbol"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Stock Symbol <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="stock-symbol"
                  type="text"
                  value={stockSymbol}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setStockSymbol(value)
                    // Clear error when user starts typing
                    if (errors.stockSymbol) {
                      setErrors((prev) => ({ ...prev, stockSymbol: undefined }))
                    }
                    // Clear API response when symbol changes
                    if (apiResponse || apiError) {
                      setApiResponse(null)
                      setApiError(null)
                      setSelectedFields([])
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur
                    const error = validateStockSymbol(stockSymbol)
                    setErrors((prev) => ({ ...prev, stockSymbol: error }))
                  }}
                  placeholder="e.g., AAPL"
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 uppercase ${
                    errors.stockSymbol
                      ? 'border-red-500 bg-gray-950 focus:border-red-500'
                      : 'border-gray-800 bg-gray-950 focus:border-accent'
                  }`}
                  required
                  disabled={isSubmitting || isTestingApi}
                  aria-required="true"
                  aria-invalid={!!errors.stockSymbol}
                  aria-describedby={errors.stockSymbol ? 'stock-symbol-error' : undefined}
                  maxLength={10}
                />
                <button
                  type="button"
                  onClick={handleTestApi}
                  disabled={!stockSymbol.trim() || isTestingApi || isSubmitting}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTestingApi ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Test API</span>
                    </>
                  )}
                </button>
              </div>
              {errors.stockSymbol && (
                <p id="stock-symbol-error" className="mt-1 text-xs text-red-400">
                  {errors.stockSymbol}
                </p>
              )}
              {!errors.stockSymbol && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter stock ticker symbol (e.g., AAPL, MSFT, GOOGL)
                </p>
              )}
            </div>

            {/* API Response Section */}
            {(apiResponse !== null || apiError !== null) && (
              <div className="space-y-4">
                {/* Error Display */}
                {apiError !== null && (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-400 mb-1">
                          API Error
                        </h3>
                        <p className="text-xs text-red-300/80">{apiError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Display */}
                {apiResponse !== null && apiError === null && (
                  <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-green-400 mb-1">
                          API Response Received
                        </h3>
                        <p className="text-xs text-green-300/80">
                          Click on fields below to select which data to display
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* JSON Viewer */}
                {apiResponse !== null ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* JSON Viewer Panel */}
                    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        JSON Response
                      </h3>
                      <div className="max-h-96 overflow-y-auto">
                        <JsonViewer
                          data={apiResponse}
                          selectedFields={selectedFields}
                          onFieldSelect={handleFieldSelect}
                        />
                      </div>
                    </div>

                    {/* Selected Fields Panel */}
                    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        Selected Fields ({selectedFields.length})
                      </h3>
                      {selectedFields.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4">
                          No fields selected. Click on values in the JSON viewer to select fields.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {selectedFields.map((field) => (
                            <div
                              key={field}
                              className="flex items-center justify-between rounded-lg border border-accent/50 bg-accent/10 px-3 py-2"
                            >
                              <span className="font-mono text-xs text-accent">
                                {field}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleFieldSelect(field)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={`Remove ${field}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Refresh Interval Input */}
            <div>
              <label
                htmlFor="refresh-interval"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Refresh Interval (seconds)
              </label>
              <input
                id="refresh-interval"
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                placeholder="30"
                min="5"
                max="3600"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                How often to refresh data (default: 30 seconds, min: 5 seconds)
              </p>
            </div>
          </div>

          {/* Modal footer */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-800 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              ref={lastFocusableRef}
              type="submit"
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !widgetName.trim() || !stockSymbol.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Widget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


