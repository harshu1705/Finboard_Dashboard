'use client'

import { useState, useEffect, FormEvent, useRef } from 'react'
import { X, Play, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { WidgetType, CreateWidgetPayload } from '@/lib/types/widget'
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
  const [refreshInterval, setRefreshInterval] = useState<string>('30')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setRefreshInterval('30')
      setIsSubmitting(false)
      setApiResponse(null)
      setApiError(null)
      setSelectedFields([])
      setIsTestingApi(false)
      // Focus first input when modal opens
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

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
    
    // Validate required fields
    if (!widgetName.trim()) {
      return
    }

    if (!stockSymbol.trim()) {
      return
    }

    setIsSubmitting(true)

    // Parse refresh interval (convert seconds to milliseconds)
    const refreshIntervalMs = parseInt(refreshInterval, 10)
    const validRefreshInterval = isNaN(refreshIntervalMs) || refreshIntervalMs <= 0 
      ? 30000 // Default 30 seconds
      : refreshIntervalMs * 1000 // Convert to milliseconds

    // Create widget payload matching exact specification
    const widgetPayload: CreateWidgetPayload = {
      type: 'price-card', // Only price-card for now
      title: widgetName.trim(),
      config: {
        symbol: stockSymbol.trim().toUpperCase(),
        refreshInterval: validRefreshInterval,
        provider: 'alpha-vantage',
        fields: selectedFields.length > 0 ? selectedFields : [],
      },
    }

    // Add widget to store
    addWidget(widgetPayload)

    // Reset form and close modal
    setWidgetName('')
    setWidgetType('price-card')
    setApiProvider('alpha-vantage')
    setStockSymbol('')
    setRefreshInterval('30')
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
      const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
      if (!apiKey) {
        throw new Error('API key is missing. Please set NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY')
      }

      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Check for API errors
      if (data['Error Message']) {
        throw new Error(data['Error Message'])
      }

      if (data.Note) {
        const note = data.Note.toLowerCase()
        if (note.includes('call frequency') || note.includes('rate limit')) {
          throw new Error('API rate limit exceeded. Please try again later.')
        }
        throw new Error(data.Note)
      }

      if (data.Information) {
        const info = data.Information.toLowerCase()
        if (info.includes('call frequency')) {
          throw new Error('API rate limit exceeded. Please try again later.')
        }
      }

      // Success - set response
      setApiResponse(data)
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
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="e.g., Apple Stock"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                required
                autoFocus
                disabled={isSubmitting}
                aria-required="true"
              />
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
              </select>
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
                    // Clear API response when symbol changes
                    if (apiResponse || apiError) {
                      setApiResponse(null)
                      setApiError(null)
                      setSelectedFields([])
                    }
                  }}
                  placeholder="e.g., AAPL"
                  className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 uppercase"
                  required
                  disabled={isSubmitting || isTestingApi}
                  aria-required="true"
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
              {!stockSymbol.trim() && (
                <p className="mt-1 text-xs text-red-400">
                  Stock symbol is required to test the API
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Enter stock ticker symbol (e.g., AAPL, MSFT, GOOGL)
              </p>
            </div>

            {/* API Response Section */}
            {(apiResponse || apiError) && (
              <div className="space-y-4">
                {/* Error Display */}
                {apiError && (
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
                {apiResponse && !apiError && (
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
                {apiResponse && (
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
                )}
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


