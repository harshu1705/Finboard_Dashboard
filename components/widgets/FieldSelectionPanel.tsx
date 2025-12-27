'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { extractFields, formatFieldLabel, getNestedValue } from '@/lib/utils/fieldExtraction'

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
  widgetId,
}: FieldSelectionPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Extract available fields from raw response
  const availableFields = useMemo(() => {
    if (!rawResponse) {
      return []
    }
    return extractFields(rawResponse)
  }, [rawResponse])

  // Handle field toggle
  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      // Deselect field
      onFieldsChange(selectedFields.filter((f) => f !== field))
    } else {
      // Select field
      onFieldsChange([...selectedFields, field])
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
        <div className="max-h-48 space-y-1 overflow-y-auto p-2">
          {availableFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">No fields available</p>
          ) : (
            availableFields.map((field) => {
              const isSelected = selectedFields.includes(field)
              const value = getNestedValue(rawResponse, field)
              const label = formatFieldLabel(field)

              return (
                <label
                  key={field}
                  className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-xs hover:bg-gray-800/50 transition-colors"
                >
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
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

