'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Settings2, Code, AlertTriangle } from 'lucide-react'
import { extractFields, formatFieldLabel, getNestedValue, hasMetaFields, filterMetaFields, isMetaField } from '@/lib/utils/fieldExtraction'
import type { FormatType } from '@/lib/utils/valueFormatter'
import { getDefaultFormatType } from '@/lib/utils/valueFormatter'

/**
 * Field Selection Panel Props
 */
interface FieldSelectionPanelProps {
  /** Raw API response to extract fields from */
  rawResponse: unknown
  
  /** Currently selected fields */
  selectedFields: string[]
  
  /** Callback when selected fields change */
  onFieldsChange: (fields: string[]) => void
  
  /** Field format preferences (field path -> format type) */
  fieldFormats?: Record<string, FormatType>
  
  /** Callback when field format preferences change */
  onFieldFormatsChange?: (formats: Record<string, FormatType>) => void
  
  /** Widget ID for persistence */
  widgetId?: string
}

/**
 * Field Selection Panel Component
 * 
 * Collapsible panel that displays available fields from API response
 * and allows users to select/deselect fields to display in the widget.
 */
export function FieldSelectionPanel({
  rawResponse,
  selectedFields,
  onFieldsChange,
  fieldFormats = {},
  onFieldFormatsChange,
  widgetId,
}: FieldSelectionPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false)
  
  // Track the last rawResponse we processed to avoid duplicate cleanups
  const lastProcessedResponseRef = useRef<unknown>(null)

  // Detect if meta fields are present in the response
  const hasMetaFieldsDetected = useMemo(() => {
    if (!rawResponse) {
      return false
    }
    return hasMetaFields(rawResponse)
  }, [rawResponse])

  // Extract available fields from raw response, filtering out meta fields
  const availableFields = useMemo(() => {
    if (!rawResponse) {
      return []
    }
    const allFields = extractFields(rawResponse)
    return filterMetaFields(allFields)
  }, [rawResponse])

  // Clean selected fields: remove any meta fields that might have been selected previously
  // This ensures selected fields remain intact for valid fields, but removes meta fields
  // Only run when rawResponse changes to detect new meta fields
  useEffect(() => {
    if (!rawResponse || rawResponse === lastProcessedResponseRef.current) {
      return
    }
    
    // Track that we've processed this response
    lastProcessedResponseRef.current = rawResponse
    
    const metaFieldsInSelected = selectedFields.filter((field) => isMetaField(field))
    
    // Only update if there are meta fields in selected fields
    if (metaFieldsInSelected.length > 0) {
      const cleanedFields = selectedFields.filter((field) => !isMetaField(field))
      onFieldsChange(cleanedFields)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawResponse]) // Intentionally only depend on rawResponse to avoid infinite loops

  // Handle field toggle
  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      // Deselect field
      const newFields = selectedFields.filter((f) => f !== field)
      onFieldsChange(newFields)
      
      // Remove format preference when field is deselected
      if (onFieldFormatsChange) {
        const newFormats = { ...fieldFormats }
        delete newFormats[field]
        onFieldFormatsChange(newFormats)
      }
    } else {
      // Select field
      onFieldsChange([...selectedFields, field])
      
      // Set default format when field is selected
      if (onFieldFormatsChange) {
        const defaultFormat = getDefaultFormatType(field)
        onFieldFormatsChange({
          ...fieldFormats,
          [field]: defaultFormat,
        })
      }
    }
  }

  // Handle format change for a field
  const handleFormatChange = (field: string, format: FormatType) => {
    if (onFieldFormatsChange) {
      onFieldFormatsChange({
        ...fieldFormats,
        [field]: format,
      })
    }
  }

  // If no raw response or no fields, don't show panel
  if (!rawResponse || availableFields.length === 0) {
    return null
  }

  return (
    <div className="mt-3 border-t border-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label={isOpen ? 'Collapse field selection' : 'Expand field selection'}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-3 w-3" />
          <span>Field Selection</span>
          {selectedFields.length > 0 && (
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              {selectedFields.length} selected
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-3 p-2">
          {/* Warning Banner for Meta Fields */}
          {hasMetaFieldsDetected && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-900/50 bg-yellow-950/30 p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-yellow-400">
                  API rate limit reached. Data may be stale.
                </p>
                <p className="text-[10px] text-yellow-500/80 mt-0.5">
                  Meta fields have been automatically excluded from selection.
                </p>
              </div>
            </div>
          )}

          {/* JSON Preview Section */}
          <div className="border-t border-gray-800 pt-2">
            <button
              type="button"
              onClick={() => setIsJsonPreviewOpen(!isJsonPreviewOpen)}
              className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isJsonPreviewOpen ? 'Collapse JSON preview' : 'Expand JSON preview'}
            >
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                <span>API Response Preview</span>
              </div>
              {isJsonPreviewOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            
            {isJsonPreviewOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-gray-800 bg-gray-950 p-3">
                <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Field Selection Section */}
          <div>
            <div className="mb-2 text-xs font-medium text-foreground">
              Select Fields to Display
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {availableFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">No fields available</p>
              ) : (
                availableFields.map((field) => {
                  const isSelected = selectedFields.includes(field)
                  const value = getNestedValue(rawResponse, field)
                  const label = formatFieldLabel(field)
                  const currentFormat = fieldFormats[field] || getDefaultFormatType(field)

                  return (
                    <div
                      key={field}
                      className="rounded p-1.5 text-xs hover:bg-gray-800/50 transition-colors"
                    >
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleField(field)}
                          className="mt-0.5 h-3 w-3 rounded border-gray-700 bg-gray-900 text-accent focus:ring-1 focus:ring-accent focus:ring-offset-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{label}</div>
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground font-mono">
                            {field}
                          </div>
                          {value !== null && value !== undefined && (
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              Value: {String(value)}
                            </div>
                          )}
                        </div>
                      </label>
                      {/* Format selector - shown when field is selected */}
                      {isSelected && onFieldFormatsChange && (
                        <div className="ml-5 mt-2 flex items-center gap-2">
                          <label className="text-[10px] text-muted-foreground">
                            Format:
                          </label>
                          <select
                            value={currentFormat}
                            onChange={(e) => handleFormatChange(field, e.target.value as FormatType)}
                            className="rounded border border-gray-700 bg-gray-900 px-2 py-0.5 text-[10px] text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="raw">Raw</option>
                            <option value="currency">Currency</option>
                            <option value="percentage">Percentage</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

