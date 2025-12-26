'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

interface JsonViewerProps {
  data: unknown
  selectedFields: string[]
  onFieldSelect: (path: string) => void
  basePath?: string
}

/**
 * JSON Viewer Component
 * 
 * Displays JSON data in a tree structure with expand/collapse functionality.
 * Allows field selection by clicking on values.
 * 
 * Features:
 * - Expandable/collapsible nested objects
 * - Field path display in dot-notation
 * - Visual selection highlighting
 * - Click to toggle field selection
 */
export default function JsonViewer({
  data,
  selectedFields,
  onFieldSelect,
  basePath = '',
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const getFullPath = (key: string | number): string => {
    return basePath ? `${basePath}.${key}` : String(key)
  }

  const isSelected = (path: string): boolean => {
    return selectedFields.includes(path)
  }

  const renderValue = (value: unknown, key: string | number): JSX.Element => {
    const path = getFullPath(key)
    const isExpandedPath = expanded.has(path)

    if (value === null) {
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="text-gray-500">null</span>
        </div>
      )
    }

    if (value === undefined) {
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="text-gray-500">undefined</span>
        </div>
      )
    }

    if (Array.isArray(value)) {
      return (
        <div>
          <button
            type="button"
            onClick={() => toggleExpand(path)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpandedPath ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-mono text-sm">[{value.length}]</span>
          </button>
          {isExpandedPath && (
            <div className="ml-6 mt-1 border-l border-gray-800 pl-4">
              {value.map((item, index) => {
                const itemPath = getFullPath(index)
                return (
                  <div key={index} className="py-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      [{index}]:
                    </span>
                    <JsonViewer
                      data={item}
                      selectedFields={selectedFields}
                      onFieldSelect={onFieldSelect}
                      basePath={itemPath}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      const keys = Object.keys(obj)

      return (
        <div>
          <button
            type="button"
            onClick={() => toggleExpand(path)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpandedPath ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-mono text-sm">{'{'}{keys.length}{'}'}</span>
          </button>
          {isExpandedPath && (
            <div className="ml-6 mt-1 border-l border-gray-800 pl-4">
              {keys.map((objKey) => {
                const objKeyPath = getFullPath(objKey)
                return (
                  <div key={objKey} className="py-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      {objKey}:
                    </span>
                    <JsonViewer
                      data={obj[objKey]}
                      selectedFields={selectedFields}
                      onFieldSelect={onFieldSelect}
                      basePath={objKeyPath}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // Primitive value - clickable for selection
    const isFieldSelected = isSelected(path)
    return (
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
          isFieldSelected
            ? 'bg-accent/20 border border-accent/50'
            : 'hover:bg-gray-800'
        }`}
        onClick={() => onFieldSelect(path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onFieldSelect(path)
          }
        }}
        aria-label={`Select field ${path}`}
      >
        <span
          className={`font-mono text-sm ${
            isFieldSelected ? 'text-accent font-semibold' : 'text-foreground'
          }`}
        >
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">({path})</span>
      </div>
    )
  }

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {typeof data === 'object' && !Array.isArray(data) ? (
        Object.entries(data as Record<string, unknown>).map(([key, value]) => (
          <div key={key} className="py-1">
            <span className="font-mono text-xs text-muted-foreground">
              {key}:
            </span>
            {renderValue(value, key)}
          </div>
        ))
      ) : (
        renderValue(data, '')
      )}
    </div>
  )
}

