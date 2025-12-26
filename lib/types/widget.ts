/**
 * Widget type definitions
 * 
 * Base structure for all dashboard widgets.
 * This can be extended for specific widget types in the future.
 */

export type WidgetType = 
  | 'stock-price'
  | 'portfolio-summary'
  | 'market-news'
  | 'price-chart'
  | 'custom'

export interface Widget {
  /** Unique identifier for the widget */
  id: string
  
  /** Type of widget */
  type: WidgetType
  
  /** Widget title/name */
  title: string
  
  /** Widget configuration (provider-specific) */
  config: Record<string, unknown>
  
  /** Widget position in grid (for future drag-and-drop) */
  position?: {
    x: number
    y: number
  }
  
  /** Widget size (for future resizing) */
  size?: {
    width: number
    height: number
  }
  
  /** Timestamp when widget was created */
  createdAt: number
  
  /** Timestamp when widget was last updated */
  updatedAt: number
}

/**
 * Widget creation payload (without auto-generated fields)
 */
export type CreateWidgetPayload = Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>

