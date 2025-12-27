'use client'

import EditWidgetModal from '@/components/dashboard/EditWidgetModal'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { Widget } from '@/lib/types/widget'
import { extractFields, filterMetaFields, formatFieldLabel, getNestedValue } from '@/lib/utils/fieldExtraction'
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import TableHeader from './TableHeader'
import TablePagination from './TablePagination'
import TableRowComponent from './TableRow'
import { useTableData } from './useTableData'
import { useTableState } from './useTableState'

interface TableWidgetProps {
  widget: Widget
  onRemove: () => void
}

export default function TableWidget({ widget, onRemove }: TableWidgetProps) {
  const updateWidget = useDashboardStore((s) => s.updateWidget)

  const symbols = useMemo(() => {
    const s = widget.config?.symbols
    if (Array.isArray(s)) return s.map((x: any) => String(x))
    if (typeof widget.config?.symbol === 'string') return [widget.config.symbol]
    return []
  }, [widget.config])

  const refreshInterval = typeof widget.config?.refreshInterval === 'number' ? widget.config.refreshInterval : 30000
  const { rows, isLoading, error, refetch } = useTableData({ symbols, refreshInterval })

  // dynamicFields: prefer widget-config selectedFields (keeps order), otherwise fall back to extracted fields
  const dynamicFields = useMemo(() => {
    const configured = Array.isArray(widget.config?.selectedFields)
      ? widget.config!.selectedFields.map((f: any) => String(f))
      : Array.isArray(widget.config?.fields)
      ? widget.config!.fields.map((f: any) => String(f))
      : null

    if (configured && configured.length > 0) {
      // keep configured order; filtered to remove meta columns if any
      return filterMetaFields(configured)
    }

    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.data) {
        extractFields(r.data).forEach((f) => set.add(f))
      }
    })

    const fields = filterMetaFields(Array.from(set))

    const priority = ['price', 'previousClose', 'close', 'high', 'low', 'volume']
    const sortKey = (f: string) => {
      const lower = f.toLowerCase()
      const p = priority.findIndex((p) => lower.includes(p))
      return p === -1 ? priority.length : p
    }

    fields.sort((a, b) => {
      const pa = sortKey(a)
      const pb = sortKey(b)
      if (pa !== pb) return pa - pb
      return a.localeCompare(b)
    })

    return fields
  }, [rows, widget.config])

  // compute a minimum table width so many columns render horizontally and allow overflow scroll
  // Increase base size to better fit more columns and reduce clipping
  const tableMinWidth = Math.max(1600, (dynamicFields.length + 4) * 200)

  // per-column minimum widths (heuristic) to avoid cutting values
  const colMinWidth = (f: string) => {
    const lower = f.toLowerCase()
    if (lower.includes('symbol')) return 140
    if (lower.includes('price') || lower.includes('close') || lower.includes('prev') || lower.includes('open')) return 160
    if (lower.includes('volume')) return 160
    if (lower.includes('change') || lower.includes('percent')) return 140
    // Default wide column for rich text / company names
    return 220
  }

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const {
    search,
    setSearchPersist,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    pages,
    pageItems,
    sortField,
    sortDir,
    setSort,
  } = useTableState({ widget, rows, updateWidget, dynamicFields })

  const handleRemoveSymbol = (sym: string) => {
    const current = Array.isArray(widget.config?.symbols) ? widget.config!.symbols : []
    updateWidget(widget.id, { config: { ...widget.config, symbols: current.filter((s: any) => String(s) !== String(sym)) } })
  }

  const lastUpdated = useMemo(() => {
    const timestamps = rows
      .map((r) => r.data?.lastUpdated ? new Date(r.data.lastUpdated).getTime() : 0)
      .filter(Boolean)
    if (timestamps.length === 0) return null
    const latest = Math.max(...timestamps)
    return new Date(latest).toISOString()
  }, [rows])

  return (
    <div className="group relative rounded-xl border bg-gray-900/50 p-6 shadow-sm min-h-[160px] min-w-0 w-full overflow-visible transition-transform hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-400 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
        aria-label={`Remove ${widget.title || 'table'}`}>
        <Trash className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Edit button (open modal to edit widget title/config) */}
      <button
        type="button"
        onClick={() => setIsEditModalOpen(true)}
        className="absolute right-10 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-gray-800/20 hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 group-hover:opacity-100"
        aria-label={`Edit ${widget.title || 'table'}`}>
        <Edit className="h-4 w-4" aria-hidden="true" />
      </button>

          <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-semibold text-foreground">{widget.title || 'Market table'}</h3>
        </div>

        <div className="flex-1">
          <TableHeader
            dynamicFields={dynamicFields}
            sortField={sortField}
            sortDir={sortDir}
            onSort={(f) => setSort(f)}
            search={search}
            onSearch={(s) => setSearchPersist(s)}
            onRefresh={() => refetch()}
            pageSize={pageSize}
            onPageSizeChange={(s) => setPageSize(s)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-full bg-gray-800/10 px-2 py-1 text-xs font-medium text-muted-foreground">{rows.length} symbol{rows.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Table: wide layout with comfortable spacing to match reference */}
      <div className="mt-4">
        <div className="rounded-md border border-gray-800/40 bg-transparent overflow-auto max-h-[680px]">
          <table className="w-full table-auto" style={{ minWidth: `${tableMinWidth}px` }}>
            <thead className="sticky top-0 z-10 bg-[#071223]/95">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-gray-700/40" style={{ minWidth: `${colMinWidth('symbol')}px` }}>Symbol</th>
                {dynamicFields.map((f) => (
                  <th
                    key={f}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-gray-700/40 cursor-pointer"
                    onClick={() => setSort(f)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSort(f) }}
                    aria-sort={sortField === f ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={{ minWidth: `${colMinWidth(f)}px` }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{formatFieldLabel(f)}</span>
                      <span className="text-[11px] text-muted-foreground flex items-center">
                        {sortField === f ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : (<ArrowUpDown className="h-3 w-3" />)}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-gray-700/40" style={{ minWidth: `${colMinWidth('actions')}px` }}>Actions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-gray-700/40" style={{ minWidth: `${colMinWidth('provider')}px` }}>Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-gray-700/40" style={{ minWidth: `${colMinWidth('lastUpdated')}px` }}>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                Array.from({ length: pageSize || 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-t border-gray-700/20">
                    <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-gray-800/60 animate-pulse" /></td>
                    {dynamicFields.map((f, j) => (
                      <td key={j} className="px-4 py-4" style={{ minWidth: `${colMinWidth(f)}px` }}><div className="h-4 rounded bg-gray-800/60 animate-pulse w-full max-w-[24rem]" /></td>
                    ))}
                    <td className="px-4 py-4"><div className="h-4 rounded bg-gray-800/60 animate-pulse w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 rounded bg-gray-800/60 animate-pulse w-16" /></td>
                  </tr>
                ))
              )}

              {!isLoading && pageItems.length === 0 && (
                <tr><td colSpan={4 + dynamicFields.length} className="px-4 py-6 text-sm text-muted-foreground">No data available</td></tr>
              )}

              {pageItems.map((r) => (
                <TableRowComponent key={r.symbol} row={r} dynamicFields={dynamicFields} onRemoveSymbol={handleRemoveSymbol} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Centered last-updated line beneath the table (mimics reference) */}
        <div className="mt-2 border-t border-gray-800/20 pt-2 text-center text-xs text-muted-foreground">Last updated: <span className="font-medium text-foreground">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</span></div>

        {/* Pagination + footer */}
        <TablePagination
          page={page}
          pages={pages}
          total={total}
          pageSize={pageSize}
          onPrev={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(Math.min(pages, page + 1))}
          startIndex={((page - 1) * pageSize) + 1}
          endIndex={Math.min(page * pageSize, total)}
        />
      </div>

      <EditWidgetModal isOpen={isEditModalOpen} widget={widget} onClose={() => setIsEditModalOpen(false)} />
    </div>
  )
}

function getSortValue(row: any, field: string) {
  if (!row) return null

  if (field === 'symbol') return row.symbol
  if (field === 'provider') return row.data?.provider ?? null
  if (field === 'lastUpdated') return row.data?.lastUpdated ? new Date(row.data.lastUpdated).getTime() : null

  // For dynamic nested fields, use getNestedValue and attempt numeric comparison
  const val = getNestedValue(row.data, field)
  if (val === undefined || val === null) return null
  if (typeof val === 'number') return val
  // Try to parse numeric-like strings
  const num = Number(String(val).replace(/[^0-9.-]+/g, ''))
  if (!Number.isNaN(num)) return num
  return String(val).toLowerCase()
}
