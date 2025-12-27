'use client'

import { getNestedValue } from '@/lib/utils/fieldExtraction'
import { useCallback, useMemo, useState } from 'react'
import type { SortDir, TableRow } from './types'

export function useTableState({
  widget,
  rows,
  updateWidget,
  dynamicFields = [],
}: {
  widget: any
  rows: TableRow[]
  updateWidget: (id: string, payload: any) => void
  dynamicFields?: string[]
}) {
  // persisted values in widget.config
  const pageSize = typeof widget.config?.pageSize === 'number' ? widget.config.pageSize : 5
  const page = typeof widget.config?.page === 'number' ? widget.config.page : 1
  const sortField = widget.config?.sortField || 'symbol'
  const sortDir: SortDir = widget.config?.sortDir || 'asc'
  const searchInit = widget.config?.search || ''

  const [search, setSearch] = useState<string>(searchInit)
  const [currentPage, setCurrentPage] = useState<number>(page)
  const [currentPageSize, setCurrentPageSize] = useState<number>(pageSize)
  const [currentSortField, setCurrentSortField] = useState<string>(sortField)
  const [currentSortDir, setCurrentSortDir] = useState<SortDir>(sortDir)

  // Persist helpers
  const persist = useCallback((patch: any) => {
    updateWidget(widget.id, { config: { ...widget.config, ...patch } })
  }, [updateWidget, widget.id, widget.config])

  const setPage = useCallback((p: number) => {
    setCurrentPage(p)
    persist({ page: p })
  }, [persist])

  const setPageSize = useCallback((s: number) => {
    setCurrentPageSize(s)
    setCurrentPage(1)
    persist({ pageSize: s, page: 1 })
  }, [persist])

  const setSearchPersist = useCallback((s: string) => {
    setSearch(s)
    setCurrentPage(1)
    persist({ search: s, page: 1 })
  }, [persist])

  const setSort = useCallback((field: string) => {
    let nextDir: SortDir = 'asc'
    if (currentSortField === field) nextDir = currentSortDir === 'asc' ? 'desc' : 'asc'
    setCurrentSortField(field)
    setCurrentSortDir(nextDir)
    persist({ sortField: field, sortDir: nextDir })
  }, [currentSortDir, currentSortField, persist])

  // derive dynamic fields from rows (exposed by caller) - caller should compute and pass

  // Filtering
  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase()
    if (!q) return rows

    return rows.filter((r) => {
      // symbol
      if (r.symbol && r.symbol.toLowerCase().includes(q)) return true

      // search across visible dynamic fields only
      if (r.data && dynamicFields && dynamicFields.length > 0) {
        for (const f of dynamicFields) {
          try {
            const val = getNestedValue(r.data, f)
            if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true
          } catch (e) {
            // ignore
          }
        }
      }

      // fallback: search top-level string values
      if (r.data) {
        for (const key of Object.keys(r.data as any)) {
          try {
            const val = getNestedValue(r.data, key as string)
            if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) return true
          } catch (e) {
            // ignore
          }
        }
      }

      return false
    })
  }, [rows, search, dynamicFields])

  // Sorting
  const sorted = useMemo(() => {
    const list = filtered.slice()
    list.sort((a, b) => {
      const aVal = getSortValue(a, currentSortField)
      const bVal = getSortValue(b, currentSortField)

      if (aVal === bVal) return 0
      const dir = (currentSortDir === 'desc') ? -1 : 1
      if (aVal === null || aVal === undefined) return 1 * dir
      if (bVal === null || bVal === undefined) return -1 * dir

      return aVal > bVal ? 1 * dir : -1 * dir
    })
    return list
  }, [filtered, currentSortField, currentSortDir])

  // Pagination
  const total = sorted.length
  const pages = Math.max(1, Math.ceil(total / currentPageSize))
  const safePage = Math.min(Math.max(1, currentPage), pages)
  const pageItems = sorted.slice((safePage - 1) * currentPageSize, safePage * currentPageSize)

  // Expose values and setters
  return {
    search,
    setSearchPersist,
    page: safePage,
    setPage,
    pageSize: currentPageSize,
    setPageSize,
    total,
    pages,
    pageItems,
    sortField: currentSortField,
    sortDir: currentSortDir,
    setSort,
  }
}

// helper to extract comparable values
function getSortValue(row: TableRow, field: string) {
  if (!row) return null
  if (field === 'symbol') return row.symbol
  if (field === 'provider') return row.data?.provider ?? null
  if (field === 'lastUpdated') return row.data?.lastUpdated ? new Date(row.data.lastUpdated).getTime() : null

  const val = getNestedValue(row.data, field)
  if (val === undefined || val === null) return null
  if (typeof val === 'number') return val
  const num = Number(String(val).replace(/[^0-9.-]+/g, ''))
  if (!Number.isNaN(num)) return num
  return String(val).toLowerCase()
}
