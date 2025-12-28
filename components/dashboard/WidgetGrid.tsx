'use client'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React, { useState } from 'react'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import SortableWidget from './SortableWidget'
import WidgetRenderer from './WidgetRenderer'

export default function WidgetGrid() {
  // ✅ ALL HOOKS FIRST — NO RETURNS ABOVE
  const widgets = useDashboardStore((state) => state.widgets)
  const reorderWidgets = useDashboardStore((state) => state.reorderWidgets)
  const dragEnabled = useDashboardStore((state) => state.dragEnabled)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: any) {
    setActiveId(null)
    setOverId(null)

    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = widgets.findIndex((w) => w.id === active.id)
    const toIndex = widgets.findIndex((w) => w.id === over.id)

    if (fromIndex === -1 || toIndex === -1) return
    reorderWidgets(fromIndex, toIndex)
  }

  function SortableItem({
    id,
    children,
    spanClass,
  }: {
    id: string
    children: React.ReactNode
    spanClass?: string
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id })

    const style: React.CSSProperties = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
    }

    return (
      <div ref={setNodeRef} style={style} className={`min-w-0 ${spanClass ?? ''}`}>
        <SortableWidget
          id={id}
          useHandle
          handleProps={{ ...attributes, ...listeners }}
        >
          {children}
        </SortableWidget>
      </div>
    )
  }

  // ✅ RENDER LOGIC ONLY — NO EARLY RETURNS
  if (widgets.length === 0) {
    return <div />
  }

  if (!dragEnabled) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {widgets.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {widgets.map((widget) => (
            <SortableItem
              key={widget.id}
              id={widget.id}
              spanClass={widget.type === 'table' ? 'col-span-full' : undefined}
            >
              <WidgetRenderer widget={widget} />
            </SortableItem>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <WidgetRenderer
            widget={widgets.find((w) => w.id === activeId)!}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
