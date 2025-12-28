'use client'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { dashboardTemplates, type DashboardTemplate } from '@/lib/templates/dashboardTemplates'
import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Template Modal Component
 * 
 * Modal for selecting and loading dashboard templates.
 * 
 * Features:
 * - Display available templates
 * - Preview template widgets
 * - Confirmation before loading
 * - One-click template loading
 */
export default function TemplateModal({ isOpen, onClose }: TemplateModalProps) {
  const importWidgets = useDashboardStore((state) => state.importWidgets)
  const widgets = useDashboardStore((state) => state.widgets)
  const templates = useDashboardStore((state) => state.templates)
  const saveTemplate = useDashboardStore((state) => state.saveTemplate)
  const removeTemplate = useDashboardStore((state) => state.removeTemplate)
  
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saveFormOpen, setSaveFormOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const saveNameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (saveFormOpen && saveNameRef.current) {
      saveNameRef.current.focus()
    }
  }, [saveFormOpen])
  
  const modalRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null)
      setShowConfirmation(false)
      setSaveFormOpen(false)
      setSaveName('')
      setSaveDescription('')
    }
  }, [isOpen])

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmation) {
          setShowConfirmation(false)
          setSelectedTemplate(null)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, showConfirmation])

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

  const handleTemplateSelect = (template: DashboardTemplate) => {
    setSelectedTemplate(template)
    setShowConfirmation(true)
  }

  const handleConfirmLoad = () => {
    if (!selectedTemplate) return

    // Import widgets from template
    // Convert CreateWidgetPayload[] to Widget[] by adding id, createdAt, updatedAt
    const now = Date.now()
    const widgetsToImport = selectedTemplate.widgets.map((widgetPayload, index) => {
      // Generate unique ID for each widget
      const widgetId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `widget-${now}-${index}-${Math.random().toString(36).substring(2, 11)}`
      
      return {
        ...widgetPayload,
        id: widgetId,
        createdAt: now + index, // Slight offset to ensure unique timestamps
        updatedAt: now + index,
      }
    })

    importWidgets(widgetsToImport)
    setShowConfirmation(false)
    setSelectedTemplate(null)
    onClose()
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setSelectedTemplate(null)
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (showConfirmation) {
        handleCancel()
      } else {
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal container */}
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-lg border border-gray-800 bg-gray-900 shadow-xl flex flex-col"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 id="template-modal-title" className="text-xl font-semibold text-foreground">
            {showConfirmation ? 'Confirm Template Load' : 'Dashboard Templates'}
          </h2>
          <button
            type="button"
            onClick={showConfirmation ? handleCancel : onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-gray-800 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal body - scrollable */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {showConfirmation && selectedTemplate ? (
            // Confirmation view
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4">
                <p className="text-sm text-yellow-400 font-medium mb-2">
                  ⚠️ This will replace your current dashboard
                </p>
                <p className="text-xs text-yellow-300/80">
                  Loading this template will remove all {widgets.length} current widget(s) and replace them with {selectedTemplate.widgets.length} widget(s) from the template.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Template: {selectedTemplate.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
                
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-foreground mb-2">
                    Widgets ({selectedTemplate.widgets.length}):
                  </h4>
                  <div className="space-y-2">
                    {selectedTemplate.widgets.map((widget, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded-lg border border-gray-800 bg-gray-950/50 p-3"
                      >
                        <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {widget.title}
                          </p>
                          {widget.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {widget.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Symbol: {(widget.config.symbol as string) || 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-lg border border-gray-800 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLoad}
                  className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Load Template
                </button>
              </div>
            </div>
          ) : (
            // Template selection view
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Choose a template to quickly set up your dashboard with pre-configured widgets.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveFormOpen(!saveFormOpen)}
                    className="rounded-lg border border-gray-800 bg-transparent px-3 py-1 text-sm text-foreground hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    Save current layout
                  </button>
                </div>
              </div>

              {/* Save form */}
              {saveFormOpen && (
                <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
                  <label className="text-sm text-muted-foreground">Name</label>
                  <input ref={(r) => { saveNameRef.current = r }} value={saveName} onChange={(e) => setSaveName(e.target.value)} className="mt-2 w-full rounded-md border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground" />
                  <label className="text-sm text-muted-foreground mt-3">Description (optional)</label>
                  <input value={saveDescription} onChange={(e) => setSaveDescription(e.target.value)} className="mt-2 w-full rounded-md border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground" />
                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => { setSaveName(''); setSaveDescription(''); setSaveFormOpen(false) }} className="rounded-lg border border-gray-800 bg-transparent px-4 py-2 text-sm">Cancel</button>
                    <button type="button" onClick={() => { if (saveName.trim().length === 0) { alert('Please provide a name for the template') } else { saveTemplate(saveName.trim(), saveDescription.trim()); setSaveFormOpen(false); } }} className="rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground">Save</button>
                  </div>
                </div>
              )}

              {/* Saved templates (user) */}
              {templates && templates.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Your Templates</h4>
                  <div className="space-y-3 mt-2">
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-foreground">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleTemplateSelect(t)} className="rounded-lg border border-gray-800 px-3 py-1 text-sm">Load</button>
                          <button onClick={() => { if (confirm('Delete saved template?')) removeTemplate(t.id) }} className="rounded-lg border border-red-800 px-3 py-1 text-sm text-red-400">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {dashboardTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className="text-left rounded-lg border border-gray-800 bg-gray-950/50 p-4 transition-all hover:border-accent hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{template.widgets.length} widget(s)</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <div className="rounded-full bg-accent/10 p-2">
                          <Check className="h-4 w-4 text-accent" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

