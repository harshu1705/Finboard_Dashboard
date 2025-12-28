'use client'

import { GripVertical } from 'lucide-react'
import React from 'react'

interface SortableWidgetProps {
  id: string
  children: React.ReactNode
  /** Show a visible drag handle and restrict drag start to it */
  useHandle?: boolean
  /** Props from dnd-kit to attach to the handle button (attributes + listeners) */
  handleProps?: Record<string, unknown>
  /** Optional styles applied when dragging */
  isDragging?: boolean
  style?: React.CSSProperties
}

export default function SortableWidget({ id, children, useHandle = true, handleProps = {}, isDragging = false, style }: SortableWidgetProps) {
  return (
    <div
      style={style}
      className={`relative min-w-0 transition-all duration-200 ${isDragging ? 'scale-105 shadow-lg opacity-95' : ''}`}
    >
      {/* If useHandle is true, attach dnd attributes/listeners to the handle only */}
      {useHandle ? (
        <button
          type="button"
          aria-label="Drag to reorder"
          className={`absolute top-3 left-3 z-20 p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isDragging ? 'opacity-100 cursor-grabbing' : 'cursor-grab'}`}
          {...(handleProps as any)}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        // When not using a handle, only render the invisible drag overlay if handleProps are provided
        // This avoids an always-present overlay that blocks clicks when drag is disabled or not being used
        Object.keys(handleProps || {}).length > 0 ? (
          <div
            {...(handleProps as any)}
            tabIndex={0}
            role="button"
            aria-pressed={isDragging}
            className={`absolute inset-0 z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          />
        ) : null
      )}

      {/* Provide a group wrapper so the handle appears on hover */}
      <div className="group">
        {children}
      </div>
    </div>
  )
}
