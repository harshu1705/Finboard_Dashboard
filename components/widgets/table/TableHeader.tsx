'use client'

import { RefreshCw } from 'lucide-react'
import type { SortDir } from './types'

export default function TableHeader({
  dynamicFields,
  sortField,
  sortDir,
  onSort,
  search,
  onSearch,
  onRefresh,
  pageSize,
  onPageSizeChange,
}: {
  dynamicFields: string[]
  sortField: string
  sortDir: SortDir
  onSort: (field: string) => void
  search: string
  onSearch: (s: string) => void
  onRefresh: () => void
  pageSize: number
  onPageSizeChange: (s: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <input
          aria-label="Search table"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search"
          className="rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground w-72"
        />
        <button onClick={onRefresh} title="Refresh" className="rounded-md p-1 hover:bg-gray-800">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground">Rows</label>
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground">
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </div>
    </div>
  )
}
