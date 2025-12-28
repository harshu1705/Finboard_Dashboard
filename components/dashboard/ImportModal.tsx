'use client'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { CreateWidgetPayload, Widget } from '@/lib/types/widget'
import { importDashboard } from '@/lib/utils/dashboardExport'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
}

function isLikelyWidgetArray(obj: unknown): obj is unknown[] {
  return Array.isArray(obj)
}

function normalizeToWidgets(parsed: unknown): Widget[] {
  // Accept either { widgets: [...] } or [...] or direct widget objects
  let arr: unknown[] = []
  if (!parsed) return []

  if (typeof parsed === 'object' && parsed !== null && 'widgets' in (parsed as Record<string, unknown>)) {
    const w = (parsed as Record<string, unknown>).widgets
    if (Array.isArray(w)) arr = w
  } else if (Array.isArray(parsed)) {
    arr = parsed
  } else {
    return []
  }

  const now = Date.now()
  // Convert minimal CreateWidgetPayloads to full Widgets if needed
  return arr
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null
      const rec = item as Record<string, unknown>

      // If it already looks like a full Widget with id/createdAt/updatedAt, keep as-is
      if (typeof rec.id === 'string' && typeof rec.createdAt === 'number' && typeof rec.updatedAt === 'number') {
        // Cast via unknown to satisfy the type checker
        return rec as unknown as Widget
      }

      // Otherwise try to extract the CreateWidgetPayload shape
      if (typeof rec.type !== 'string' || typeof rec.title !== 'string') return null
      const payload = rec as CreateWidgetPayload

      return {
        ...payload,
        id: typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `widget-${now}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now + idx,
        updatedAt: now + idx,
      } as Widget
    })
    .filter(Boolean) as Widget[]
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const importWidgets = useDashboardStore((s) => s.importWidgets)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedWidgets, setParsedWidgets] = useState<Widget[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Focus textarea when modal opens for quick keyboard access
  if (typeof window !== 'undefined') {
    // Delay focus slightly so modal animation completes in tests/runtime
  }
  // Use effect to focus textarea when modal mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  if (!isOpen) return null

  const handlePasteParse = () => {
    setParseError(null)
    setParsedWidgets(null)
    try {
      const parsed = JSON.parse(pasteText)
      const widgets = normalizeToWidgets(parsed)
      if (!widgets || widgets.length === 0) {
        setParseError('No valid widgets found in pasted JSON')
        return
      }
      setParsedWidgets(widgets)
    } catch (err: any) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const handleFile = async (file?: File | null) => {
    if (!file) return
    setParseError(null)
    setParsedWidgets(null)
    setIsProcessing(true)
    try {
      const widgets = await importDashboard(file)
      // importDashboard already validates and returns Widget[]
      setParsedWidgets(widgets)
    } catch (err: any) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmImport = () => {
    if (!parsedWidgets || parsedWidgets.length === 0) return

    const shouldReplace = window.confirm(
      `Import ${parsedWidgets.length} widget(s)? This will replace your current dashboard.`
    )

    if (!shouldReplace) return

    importWidgets(parsedWidgets)
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleFile(file)
    // reset input so same file can be selected again later
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] rounded-lg border border-gray-800 bg-gray-900 shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Import Dashboard</h2>
          <button type="button" onClick={() => onClose()} className="rounded-md p-1 text-muted-foreground hover:bg-gray-800/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="text-xs text-muted-foreground">Paste JSON here</label>
            <textarea ref={textareaRef} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder='Paste exported dashboard JSON or an array of widgets' className="w-full min-h-[120px] rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground" />
            <div className="flex gap-2">
              <button type="button" onClick={handlePasteParse} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90">Parse</button>
              <label className="rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground cursor-pointer">
                Upload file
                <input ref={(r) => { fileRef.current = r }} onChange={handleFileChange} type="file" accept=".json,application/json" className="hidden" />
              </label>
              <button type="button" onClick={() => { setPasteText(''); setParsedWidgets(null); setParseError(null) }} className="rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground">Clear</button>
            </div>
            {isProcessing && <div className="text-xs text-muted-foreground">Processing file...</div>}
            {parseError && <div className="text-sm text-red-400">{parseError}</div>}

            <div>
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              {!parsedWidgets && <div className="text-xs text-muted-foreground">No parsed widgets yet</div>}

              {parsedWidgets && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-muted-foreground">Found {parsedWidgets.length} widget(s):</div>
                  <div className="grid grid-cols-1 gap-2">
                    {parsedWidgets.map((w) => (
                      <div key={w.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{String(w.title)}</div>
                            <div className="text-xs text-muted-foreground truncate">Type: {String(w.type)} • {String(w.config?.symbol ?? (Array.isArray(w.config?.symbols) ? `${w.config?.symbols.length} symbols` : ''))}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-800">
          <button type="button" onClick={() => onClose()} className="flex-1 rounded-lg border border-gray-800 bg-transparent px-4 py-2 text-sm font-medium text-foreground">Cancel</button>
          <button type="button" onClick={handleConfirmImport} disabled={!parsedWidgets || parsedWidgets.length === 0} className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50">Import {parsedWidgets ? `(${parsedWidgets.length})` : ''}</button>
        </div>
      </div>
    </div>
  )
}
