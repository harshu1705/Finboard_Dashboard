'use client'

import { useState } from 'react'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import WidgetRenderer from './WidgetRenderer'

/**
 * WidgetGrid component
 * 
 * Displays widgets in a responsive grid layout with drag-and-drop reordering.
 * Uses WidgetRenderer to dynamically render widgets based on their type.
 * 
 * Features:
 * - Native HTML5 drag-and-drop for reordering
 * - Visual feedback during drag operations
 * - Automatic persistence via Zustand store
 */
export default function WidgetGrid() {
  const widgets = useDashboardStore((state) => state.widgets)
  const reorderWidgets = useDashboardStore((state) => state.reorderWidgets)
  
  // Track dragging state for visual feedback
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  if (widgets.length === 0) {
    return null // EmptyState is handled by parent component
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Prevent dragging if clicking on interactive elements (buttons, links, etc.)
    const target = e.target as HTMLElement
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.closest('button') ||
      target.closest('a')
    ) {
      e.preventDefault()
      return
    }

    setDraggedIndex(index)
    // Set drag data (required for drag-and-drop to work)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', index.toString())
    // Use a semi-transparent drag image for better visual feedback
    // The opacity is handled via CSS classes
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Handle drag over (required to allow drop)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() // Required to allow drop
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    
    const fromIndex = draggedIndex
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderWidgets(fromIndex, toIndex)
    }
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="w-full">
      {/* Responsive grid layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {widgets.map((widget, index) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`min-w-0 transition-all duration-200 ${
              draggedIndex === index
                ? 'opacity-50 cursor-grabbing'
                : dragOverIndex === index && draggedIndex !== null
                ? 'opacity-75 ring-2 ring-accent ring-offset-2 ring-offset-gray-900'
                : 'cursor-grab'
            }`}
          >
            <WidgetRenderer widget={widget} />
          </div>
        ))}
      </div>
    </div>
  )
}


