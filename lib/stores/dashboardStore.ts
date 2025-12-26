import { create } from 'zustand'
import type { Widget, CreateWidgetPayload } from '@/lib/types/widget'

/**
 * Dashboard store state interface
 */
interface DashboardState {
  /** Array of all widgets in the dashboard */
  widgets: Widget[]
  
  /** Add a new widget to the dashboard */
  addWidget: (widget: CreateWidgetPayload) => void
  
  /** Remove a widget by ID */
  removeWidget: (widgetId: string) => void
  
  /** Update an existing widget */
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void
  
  /** Get a widget by ID */
  getWidget: (widgetId: string) => Widget | undefined
  
  /** Clear all widgets */
  clearWidgets: () => void
}

/**
 * Generate a unique ID for widgets using crypto.randomUUID()
 */
function generateWidgetId(): string {
  // Use crypto.randomUUID() if available (browser), fallback to timestamp-based ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `widget-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Dashboard Zustand store
 * 
 * Manages the global state of widgets in the dashboard.
 * This store is designed to be scalable for future features like:
 * - Widget persistence (localStorage/IndexedDB)
 * - Widget reordering
 * - Widget configuration
 * - Multi-dashboard support
 */
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  widgets: [],

  // Add a new widget
  addWidget: (widgetPayload) => {
    const newWidget: Widget = {
      ...widgetPayload,
      id: generateWidgetId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    set((state) => ({
      widgets: [...state.widgets, newWidget],
    }))
  },

  // Remove a widget by ID
  removeWidget: (widgetId) => {
    set((state) => ({
      widgets: state.widgets.filter((widget) => widget.id !== widgetId),
    }))
  },

  // Update an existing widget
  updateWidget: (widgetId, updates) => {
    set((state) => ({
      widgets: state.widgets.map((widget) =>
        widget.id === widgetId
          ? { ...widget, ...updates, updatedAt: Date.now() }
          : widget
      ),
    }))
  },

  // Get a widget by ID
  getWidget: (widgetId) => {
    return get().widgets.find((widget) => widget.id === widgetId)
  },

  // Clear all widgets
  clearWidgets: () => {
    set({ widgets: [] })
  },
}))

