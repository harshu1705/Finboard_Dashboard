'use client'

import type { TableRow as UseTableRow } from './useTableData'

export type TableRow = UseTableRow

export interface TableWidgetProps {
  widget: any
  onRemove: () => void
}

export type SortDir = 'asc' | 'desc'
