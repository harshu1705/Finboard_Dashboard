'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { WidgetType, CreateWidgetPayload } from '@/lib/types/widget'
import { WIDGET_TYPE_LABELS } from '@/lib/types/widget'

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * AddWidgetModal Component
 * 
 * Modal for adding new widgets to the dashboard.
 * Handles form input and widget creation via Zustand store.
 */
export default function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const addWidget = useDashboardStore((state) => state.addWidget)
  
  const [widgetName, setWidgetName] = useState('')
  const [widgetType, setWidgetType] = useState<WidgetType>('price-card')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setWidgetName('')
      setWidgetType('price-card')
      setIsSubmitting(false)
    }
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
    
    if (!widgetName.trim()) {
      return
    }

    setIsSubmitting(true)

    // Create widget payload
    const widgetPayload: CreateWidgetPayload = {
      type: widgetType,
      title: widgetName.trim(),
      config: {},
    }

    // Add widget to store
    addWidget(widgetPayload)

    // Reset form and close modal
    setWidgetName('')
    setWidgetType('price-card')
    setIsSubmitting(false)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
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

      {/* Modal container */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 shadow-xl">
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

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-6">
            {/* Widget Name Input */}
            <div>
              <label
                htmlFor="widget-name"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Widget Name
              </label>
              <input
                id="widget-name"
                type="text"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="Enter widget name"
                className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                required
                autoFocus
                disabled={isSubmitting}
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
                {Object.entries(WIDGET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
              type="submit"
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !widgetName.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Widget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

