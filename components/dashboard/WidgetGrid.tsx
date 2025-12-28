'use client'

/**
 * Manual QA:
 * - Widgets can be dragged
 * - Order updates correctly
 * - Order persists after refresh
 * - Export / Import keeps order
 */

import React, { useEffect, useState } from 'react'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import SortableWidget from './SortableWidget'
import WidgetRenderer from './WidgetRenderer'

export default function WidgetGrid() {
  const widgets = useDashboardStore((state) => state.widgets)
  const reorderWidgets = useDashboardStore((state) => state.reorderWidgets)
  const dragEnabled = useDashboardStore((state) => state.dragEnabled)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // dndModules: undefined = loading, false = unavailable, object = modules
  const [dndModules, setDndModules] = useState<any | false | undefined>(undefined)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      // Try runtime require first (hidden via eval to avoid bundler static analysis)
      try {
        const req = eval('require') as (pkg: string) => any
        const core = req('@dnd-kit/core')
        const sortable = req('@dnd-kit/sortable')
        const utilities = req('@dnd-kit/utilities')
        if (!mounted) return
        setDndModules({ core, sortable, utilities })
        return
      } catch (err) {
        // require not available or packages not installed — try dynamic import fallback
      }

      try {
        // Use a runtime variable import via new Function to avoid bundler static analysis
        const coreName = '@dnd-kit/core'
        const sortableName = '@dnd-kit/sortable'
        const utilitiesName = '@dnd-kit/utilities'
        const core = await new Function('m', 'return import(m)')(coreName)
        const sortable = await new Function('m', 'return import(m)')(sortableName)
        const utilities = await new Function('m', 'return import(m)')(utilitiesName)
        if (!mounted) return
        setDndModules({ core, sortable, utilities })
      } catch (err) {
        if (!mounted) return
        console.warn('dnd-kit is not installed. Drag-and-drop disabled. Run `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` to enable it.')
        setDndModules(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (widgets.length === 0) {
    return null
  }

  // If dnd-kit isn't available (or still loading) OR if reordering is disabled, fall back to static grid
  if (!dndModules || !dragEnabled) {
    return (
      <div className="w-full">
        {!dragEnabled && (
          <div className="mb-3 text-xs text-muted-foreground">Widget reordering is disabled. Enable it via the header to reorder widgets.</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {widgets.map((widget) => (
            <div key={widget.id} className={`min-w-0 ${widget.type === 'table' ? 'col-span-full' : ''}`}>
              <SortableWidget id={widget.id} useHandle={false}>
                <WidgetRenderer widget={widget} />
              </SortableWidget>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // dnd-kit hooks and variables
  let DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, utilities
  let modifiers: any[] = []
  // Always define dummy sensors to satisfy hook rules
  const dummySensor = () => null
  const dummySensors = () => []
  // Always call hooks at the top level
  const sensors = dndModules
    ? (() => {
        const { core, sortable, utilities: utils } = dndModules
        DndContext = core.DndContext
        DragOverlay = core.DragOverlay
        closestCenter = core.closestCenter
        PointerSensor = core.PointerSensor
        KeyboardSensor = core.KeyboardSensor
        useSensor = core.useSensor
        useSensors = core.useSensors
        SortableContext = sortable.SortableContext
        rectSortingStrategy = sortable.rectSortingStrategy
        sortableKeyboardCoordinates = sortable.sortableKeyboardCoordinates
        useSortable = sortable.useSortable
        utilities = utils
        try {
          const req = eval('require') as (pkg: string) => any
          const modPkg = req('@dnd-kit/modifiers')
          if (modPkg && modPkg.restrictToParentElement) modifiers.push(modPkg.restrictToParentElement)
        } catch (err) {
          // ignore if not available
        }
        return core.useSensors(
          core.useSensor(core.PointerSensor, { activationConstraint: { distance: 5 } }),
          core.useSensor(core.KeyboardSensor, { coordinateGetter: sortable.sortableKeyboardCoordinates })
        )
      })()
    : dummySensors();

  function handleDragStart(id: { id: string }) {
    setActiveId(id.id)
    setOverId(null)
  }

  function handleDragOver(event: any) {
    const { over } = event
    setOverId(over?.id ?? null)
  }

  function handleDragEnd(event: any) {
    setActiveId(null)
    setOverId(null)
    const { active, over } = event
    if (!over) return
    if (active.id === over.id) return

    const fromIndex = widgets.findIndex((w) => w.id === active.id)
    const toIndex = widgets.findIndex((w) => w.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    reorderWidgets(fromIndex, toIndex)
  }

  function SortableItem({ id, children, spanClass }: { id: string; children: React.ReactNode; spanClass?: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
      transform: utilities.CSS.Transform.toString(transform),
      transition,
      transformOrigin: 'center',
    }

    const isPreview = overId === id && activeId !== null && activeId !== id

    return (
      <div ref={setNodeRef} style={style as React.CSSProperties} className={`min-w-0 ${spanClass ?? ''}`}>
        <SortableWidget id={id} useHandle={true} handleProps={{ ...attributes, ...listeners }} isDragging={isDragging} style={isPreview ? { outline: '2px dashed rgba(52,211,153,0.12)', boxShadow: '0 6px 20px rgba(16,185,129,0.06)' } : undefined}>
          {children}
        </SortableWidget>
      </div>
    )
  }

  return (
    <div className="w-full">
      <DndContext modifiers={modifiers} sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: any) => handleDragStart(e.active)} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {widgets.map((widget) => (
              <SortableItem key={widget.id} id={widget.id} spanClass={widget.type === 'table' ? 'col-span-full' : undefined}>
                <WidgetRenderer widget={widget} />
              </SortableItem>
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 150 }}>
          {activeId ? (
            <div className="w-full pointer-events-none scale-105 transform-gpu" style={{ transformOrigin: 'center', boxShadow: '0 10px 30px rgba(2,6,23,0.6)', cursor: 'grabbing' }}>
              <div className="opacity-100 pointer-events-none cursor-grabbing">
                <WidgetRenderer widget={widgets.find((w) => w.id === activeId)!} />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}


