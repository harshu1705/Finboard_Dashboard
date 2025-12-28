'use client'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { Widget } from '@/lib/types/widget'
import { X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

interface EditWidgetModalProps {
  isOpen: boolean
  widget: Widget | null
  onClose: () => void
}

/**
 * EditWidgetModal Component
 * 
 * Modal for editing widget title and description.
 * 
 * Features:
 * - Edit widget title (required)
 * - Edit widget description (optional)
 * - Form validation
 * - Focus trap for accessibility
 * - ESC key to close
 */
export default function EditWidgetModal({ isOpen, widget, onClose }: EditWidgetModalProps) {
  const updateWidget = useDashboardStore((state) => state.updateWidget)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for focus trap
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLInputElement>(null)
  const lastFocusableRef = useRef<HTMLButtonElement>(null)

  // Reset form when modal opens/closes or widget changes
  useEffect(() => {
    if (isOpen && widget) {
      setTitle(widget.title || '')
      setDescription(widget.description || '')
      setIsSubmitting(false)
      setError(null)
      // Focus first input when modal opens
      setTimeout(() => {
        firstFocusableRef.current?.focus()
      }, 100)
    }
  }, [isOpen, widget])
  
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
    
    // Validate title
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Widget title is required')
      return
    }

    if (!widget) {
      setError('Widget not found')
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Update widget in store
    updateWidget(widget.id, {
      title: trimmedTitle,
      description: description.trim() || undefined, // Remove empty strings
    })

    // Close modal
    setIsSubmitting(false)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCancel = () => {
    // Reset to original values
    if (widget) {
      setTitle(widget.title || '')
      setDescription(widget.description || '')
    }
    setError(null)
    onClose()
  }

  if (!isOpen || !widget) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal container */}
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 shadow-xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 id="edit-modal-title" className="text-xl font-semibold text-foreground">
            Edit Widget
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-gray-800 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Widget Title Input */}
            <div>
              <label
                htmlFor="edit-widget-title"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Widget Title <span className="text-red-400">*</span>
              </label>
              <input
                ref={firstFocusableRef}
                id="edit-widget-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="e.g., Apple Stock"
                className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  error
                    ? 'border-red-500 bg-gray-950 focus:border-red-500'
                    : 'border-gray-800 bg-gray-950 focus:border-accent'
                }`}
                required
                autoFocus
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? 'edit-title-error' : undefined}
              />
              {error && (
                <p id="edit-title-error" className="mt-1 text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>

            {/* Widget Description Input */}
            <div>
              <label
                htmlFor="edit-widget-description"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Widget Description <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="edit-widget-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Live AAPL price (updated every 30s)"
                rows={3}
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 resize-none"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Add a brief description or subtitle for this widget
              </p>
            </div>

            {/* Price-card realtime toggle */}
            {widget.type === 'price-card' && (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <input
                    id="edit-widget-realtime"
                    type="checkbox"
                    checked={!!(widget.config && (widget.config as any).realtime)}
                    onChange={() => {
                      const current = !!(widget.config && (widget.config as any).realtime)
                      updateWidget(widget.id, { config: { ...widget.config, realtime: !current } })
                    }}
                    className="h-4 w-4"
                    disabled={isSubmitting || ((widget.config as any)?.provider !== 'finnhub')}
                  />
                  <label htmlFor="edit-widget-realtime" className="text-sm text-muted-foreground">Enable realtime updates (Finnhub WebSocket)</label>
                </div>
                {((widget.config as any)?.provider !== 'finnhub') && (
                  <p className="mt-1 text-xs text-muted-foreground">Realtime is only available when the widget uses the Finnhub provider.</p>
                )}
              </div>
            )}

            {/* Table-specific settings */}
            {widget.type === 'table' && (
              <div>
                <label htmlFor="edit-widget-symbols" className="mb-2 block text-sm font-medium text-foreground">Symbols (comma-separated)</label>
                <textarea
                  id="edit-widget-symbols"
                  value={(((widget.config as any)?.symbols) || []).join(', ')}
                  onChange={(e) => {
                    try {
                      const raw = e.target.value
                      const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
                      // Immediate update the local widget config so user sees persisted change on Save
                      // We'll persist on submit as well
                      setError(null)
                      // No local state here: updateWidget directly is fine
                      // But avoid saving while submitting - store will persist to localStorage
                      if (parts.length > 0) {
                        updateWidget(widget.id, { config: { ...widget.config, symbols: parts } })
                      } else {
                        updateWidget(widget.id, { config: { ...widget.config, symbols: [] } })
                      }
                    } catch (err) {
                      // Ignore
                    }
                  }}
                  placeholder="AAPL, MSFT, GOOGL"
                  rows={2}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 resize-none"
                  disabled={isSubmitting}
                />

                <label htmlFor="edit-widget-refresh" className="mt-3 mb-2 block text-sm font-medium text-foreground">Refresh interval (ms)</label>
                <input
                  id="edit-widget-refresh"
                  type="number"
                  min={0}
                  value={(widget.config as any)?.refreshInterval ?? ''}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isFinite(v) || v < 0) return
                    updateWidget(widget.id, { config: { ...widget.config, refreshInterval: v } })
                  }}
                  className="w-32 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-muted-foreground">Set the symbols and refresh interval for the table widget</p>
              </div>
            )}

            {/* Chart-specific settings */}
            {widget.type === 'chart' && (
              <div>
                <label htmlFor="edit-chart-symbol" className="mb-2 block text-sm font-medium text-foreground">Symbol</label>
                <input
                  id="edit-chart-symbol"
                  type="text"
                  value={(widget.config as any)?.symbol ?? ''}
                  onChange={(e) => updateWidget(widget.id, { config: { ...widget.config, symbol: e.target.value.toUpperCase() } })}
                  placeholder="AAPL"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 uppercase"
                  disabled={isSubmitting}
                />

                <div className="mt-3 flex items-center gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Chart Type</label>
                    <select value={(widget.config as any)?.chartType ?? 'line'} onChange={(e) => updateWidget(widget.id, { config: { ...widget.config, chartType: e.target.value } })} className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-foreground">
                      <option value="line">Line</option>
                      <option value="candle">Candle</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Interval</label>
                    <select value={(widget.config as any)?.interval ?? 'daily'} onChange={(e) => updateWidget(widget.id, { config: { ...widget.config, interval: e.target.value } })} className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-foreground">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Refresh (ms)</label>
                    <input type="number" value={(widget.config as any)?.refreshInterval ?? ''} onChange={(e) => { const v = Number(e.target.value); if (!Number.isFinite(v) || v < 0) return; updateWidget(widget.id, { config: { ...widget.config, refreshInterval: v } }) }} className="w-32 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-foreground" />
                  </div>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">Configure chart symbol, type and interval (Daily/Weekly/Monthly)</p>
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-gray-800 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              ref={lastFocusableRef}
              type="submit"
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

