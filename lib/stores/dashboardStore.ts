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
  
  /** Reorder widgets by moving a widget from one index to another */
  reorderWidgets: (fromIndex: number, toIndex: number) => void
  
  /** Import widgets from an array (replaces current widgets) */
  importWidgets: (widgets: Widget[]) => void
  
  /** Internal: Initialize store from persisted state (called once on mount) */
  _hydrate: () => void
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
 * Storage configuration constants
 */
const STORAGE_KEY = 'groww-dashboard-state'
const STORAGE_VERSION = 1 // Increment this when schema changes

/**
 * Persisted state schema interface
 * Version this interface when making breaking changes to the stored data structure
 */
interface PersistedState {
  version: number
  widgets: Widget[]
}

/**
 * Validates that a widget object has the required structure
 * Used to filter out corrupted or invalid widgets from localStorage
 */
function isValidWidget(widget: unknown): widget is Widget {
  if (!widget || typeof widget !== 'object') return false
  
  const w = widget as Record<string, unknown>
  
  // Check required fields
  if (typeof w.id !== 'string' || !w.id) return false
  if (typeof w.type !== 'string') return false
  if (typeof w.title !== 'string') return false
  if (!w.config || typeof w.config !== 'object') return false
  if (typeof w.createdAt !== 'number') return false
  if (typeof w.updatedAt !== 'number') return false
  
  return true
}

/**
 * Loads persisted state from localStorage
 * Returns null if no valid state is found or if an error occurs
 * Handles corrupted data gracefully by returning null (which will use default empty state)
 */
function loadPersistedState(): Widget[] | null {
  // Only run on client-side (localStorage is not available during SSR)
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as unknown

    // Validate top-level structure
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[Dashboard Store] Invalid stored state format, clearing...')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    const state = parsed as Record<string, unknown>

    // Check version compatibility
    // For now, we only support version 1. In the future, add migration logic here
    if (state.version !== STORAGE_VERSION) {
      console.warn(
        `[Dashboard Store] Stored state version (${state.version}) does not match current version (${STORAGE_VERSION}), clearing...`
      )
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Validate widgets array
    if (!Array.isArray(state.widgets)) {
      console.warn('[Dashboard Store] Invalid widgets array in stored state, clearing...')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Filter out invalid widgets (defensive parsing)
    const validWidgets = state.widgets.filter(isValidWidget)

    // If some widgets were invalid, log a warning
    if (validWidgets.length !== state.widgets.length) {
      console.warn(
        `[Dashboard Store] Filtered out ${state.widgets.length - validWidgets.length} invalid widgets from stored state`
      )
    }

    // Migrate widgets with Indian API provider to Alpha Vantage
    const migratedWidgets = validWidgets.map((widget) => {
      const config = widget.config || {}
      
      // Check if widget has Indian API provider reference
      if (config.provider === 'indian-api' || config.provider === 'indian') {
        // Migrate to Alpha Vantage
        return {
          ...widget,
          config: {
            ...config,
            provider: 'alpha-vantage',
          },
          updatedAt: Date.now(),
        }
      }
      
      return widget
    })

    // If any widgets were migrated, save the updated state
    if (migratedWidgets.some((w, i) => w.updatedAt !== validWidgets[i]?.updatedAt)) {
      const migratedState: PersistedState = {
        version: STORAGE_VERSION,
        widgets: migratedWidgets,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedState))
      } catch {
        // Silently fail if we can't save migration
      }
    }

    return migratedWidgets
  } catch (error) {
    // Handle JSON parse errors, corrupted data, or any other exceptions
    console.error('[Dashboard Store] Error loading persisted state:', error)
    // Clear corrupted data to prevent future errors
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore errors when clearing (e.g., if localStorage is disabled)
    }
    return null
  }
}

/**
 * Saves current state to localStorage
 * Silently fails if localStorage is unavailable or disabled
 */
function savePersistedState(widgets: Widget[]): void {
  // Only run on client-side
  if (typeof window === 'undefined') {
    return
  }

  try {
    const state: PersistedState = {
      version: STORAGE_VERSION,
      widgets,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    // Silently handle errors (e.g., localStorage quota exceeded, disabled, etc.)
    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Dashboard Store] Failed to save state to localStorage:', error)
    }
  }
}

/**
 * Track if store has been hydrated from localStorage
 * This prevents multiple hydration attempts and ensures we only load once
 */
let hasHydrated = false

/**
 * Dashboard Zustand store
 * 
 * Manages the global state of widgets in the dashboard with localStorage persistence.
 * 
 * Persistence features:
 * - Automatically saves widgets to localStorage whenever they change
 * - Restores widgets from localStorage on initialization (client-side only)
 * - Handles corrupted or invalid data gracefully
 * - Versioned schema for future migrations
 * - Defensive parsing to filter out invalid widgets
 * 
 * This store is designed to be scalable for future features like:
 * - Widget reordering
 * - Widget configuration
 * - Multi-dashboard support
 */
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state - will be hydrated from localStorage on client-side mount
  widgets: [],

  // Internal: Initialize store from persisted state
  // This is called once when the store is first used on the client-side
  // We use a separate method instead of loading in the initial state to avoid
  // hydration mismatches in Next.js (SSR renders with empty state, client hydrates with persisted state)
  _hydrate: () => {
    // Only hydrate once, even if called multiple times
    // This prevents unnecessary localStorage reads and potential race conditions
    if (hasHydrated) {
      return
    }

    hasHydrated = true
    const persistedWidgets = loadPersistedState()
    
    // Only update state if we have persisted widgets
    // If localStorage is empty or invalid, keep the default empty state
    if (persistedWidgets && persistedWidgets.length > 0) {
      set({ widgets: persistedWidgets })
    }
  },

  // Add a new widget
  addWidget: (widgetPayload) => {
    const newWidget: Widget = {
      ...widgetPayload,
      id: generateWidgetId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    set((state) => {
      const updatedWidgets = [...state.widgets, newWidget]
      // Persist immediately after state update
      savePersistedState(updatedWidgets)
      return { widgets: updatedWidgets }
    })
  },

  // Remove a widget by ID
  removeWidget: (widgetId) => {
    set((state) => {
      const updatedWidgets = state.widgets.filter((widget) => widget.id !== widgetId)
      // Persist immediately after state update
      savePersistedState(updatedWidgets)
      return { widgets: updatedWidgets }
    })
  },

  // Update an existing widget
  updateWidget: (widgetId, updates) => {
    set((state) => {
      const updatedWidgets = state.widgets.map((widget) =>
        widget.id === widgetId
          ? { ...widget, ...updates, updatedAt: Date.now() }
          : widget
      )
      // Persist immediately after state update
      savePersistedState(updatedWidgets)
      return { widgets: updatedWidgets }
    })
  },

  // Get a widget by ID
  getWidget: (widgetId) => {
    return get().widgets.find((widget) => widget.id === widgetId)
  },

  // Clear all widgets
  clearWidgets: () => {
    set({ widgets: [] })
    // Persist immediately after clearing
    savePersistedState([])
  },

  // Reorder widgets by moving a widget from one index to another
  reorderWidgets: (fromIndex, toIndex) => {
    set((state) => {
      // Validate indices
      if (
        fromIndex < 0 ||
        fromIndex >= state.widgets.length ||
        toIndex < 0 ||
        toIndex >= state.widgets.length ||
        fromIndex === toIndex
      ) {
        return state // No change needed
      }

      // Create a new array with reordered widgets
      const updatedWidgets = [...state.widgets]
      const [movedWidget] = updatedWidgets.splice(fromIndex, 1)
      updatedWidgets.splice(toIndex, 0, movedWidget)

      // Persist immediately after reordering
      savePersistedState(updatedWidgets)
      return { widgets: updatedWidgets }
    })
  },

  // Import widgets from an array (replaces current widgets)
  // Validates widgets before importing and filters out invalid ones
  importWidgets: (widgetsToImport) => {
    // Filter and validate widgets using the existing validation function
    const validWidgets = widgetsToImport.filter(isValidWidget)

    set({ widgets: validWidgets })
    // Persist immediately after importing
    savePersistedState(validWidgets)
  },
}))

