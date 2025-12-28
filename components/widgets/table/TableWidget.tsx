'use client'

import EditWidgetModal from '@/components/dashboard/EditWidgetModal'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import type { Widget } from '@/lib/types/widget'
import { extractFields, filterMetaFields, formatFieldLabel, getNestedValue } from '@/lib/utils/fieldExtraction'
import { formatValue, getDefaultFormatType } from '@/lib/utils/valueFormatter'
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, RefreshCw, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import TablePagination from './TablePagination'
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

  // per-column minimum widths (heuristic) to avoid cutting values
  // Use tighter defaults so the table can fit within the widget card without horizontal scroll.
  const colMinWidth = (f: string) => {
    const lower = f.toLowerCase()
    if (lower.includes('symbol')) return 110
    if (lower.includes('price') || lower.includes('close') || lower.includes('prev') || lower.includes('open')) return 110
    if (lower.includes('volume')) return 120
    if (lower.includes('change') || lower.includes('percent')) return 100
    // Default reasonable width for company names / longer fields
    return 140
  }

  // Calculate a reasonable minimum table width based on number of columns so columns don't overlap.
  const requiredCols = ['symbol','price','previousClose','high','provider','lastUpdated']
  const columnCount = requiredCols.length + dynamicFields.length
  const desiredMinWidth = Math.max(800, columnCount * 140) // each column gets ~140px min
  // Use full width and fixed layout but set a minWidth to ensure readability; allow horizontal scroll on small viewports
  const tableStyle: React.CSSProperties = { width: '100%', minWidth: `${desiredMinWidth}px`, tableLayout: 'fixed' }

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
    <div className="relative col-span-full rounded-xl border bg-transparent p-5 min-h-[420px] w-full overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground opacity-100 hover:bg-red-900/20 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label={`Remove ${widget.title || 'table'}`}>
        <Trash className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Edit button (open modal to edit widget title/config) */}
      <button
        type="button"
        onClick={() => setIsEditModalOpen(true)}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute right-10 top-2 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-gray-800/20 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label={`Edit ${widget.title || 'table'}`}>
        <Edit className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Top bar: left title, center search, right controls */}
      <div className="flex items-center gap-4 w-full">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-foreground">Market List</h3>
          <div className="text-sm text-muted-foreground">{rows.length} symbol{rows.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="flex-1 px-4">
          <input
            aria-label="Search symbol"
            value={search}
            onChange={(e) => setSearchPersist(e.target.value)}
            placeholder="Search symbol"
            className="w-full rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} title="Refresh" className="rounded-md p-1 hover:bg-gray-800">
            <RefreshCw className="h-4 w-4" />
          </button>
          <label className="text-xs text-muted-foreground">Rows</label>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm text-foreground">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* Table: wide layout with comfortable spacing to match reference */}
      <div className="mt-4 w-full">
        <div className="w-full overflow-x-auto overflow-y-auto max-h-[680px] border-t border-gray-800/20 bg-transparent">
          <table role="table" aria-label="Market list table" className="w-full table-fixed" style={tableStyle}>
            <thead className="sticky top-0 z-10 bg-gray-900">
              <tr>
                {['symbol','price','previousClose','high','provider','lastUpdated'].map((col) => {
                  const label = col === 'symbol' ? 'Symbol' : col === 'price' ? 'Price' : col === 'previousClose' ? 'Previous Close' : col === 'high' ? 'Day High' : col === 'provider' ? 'Provider' : 'Last updated'
                  const sortable = ['symbol','price','previousClose','high','lastUpdated'].includes(col)
                  return (
                    <th key={col} className={`px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-foreground border-b border-gray-700/40 border-r border-gray-800/10 last:border-r-0 ${sortable ? 'cursor-pointer' : ''}`} {...(sortable ? { onClick: () => setSort(col), role: 'button', tabIndex: 0, onKeyDown: (e: any) => { if (e.key === 'Enter' || e.key === ' ') setSort(col) } } : {})} aria-sort={sortField === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-tight break-words">{label}</span>
                        {sortable && (
                          <span className={`text-[11px] flex items-center ${sortField === col ? 'text-accent' : 'text-muted-foreground'}`}>
                            {sortField === col ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : (<ArrowUpDown className="h-3 w-3" />)}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}

                {dynamicFields.filter((f) => !['symbol','price','previousClose','high','provider','lastUpdated'].includes(f)).map((f) => (
                  <th key={f} className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-foreground border-b border-gray-700/40 border-r border-gray-800/10 last:border-r-0 cursor-pointer" onClick={() => setSort(f)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSort(f) }} aria-sort={sortField === f ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <div className="flex items-center gap-2"><span className="text-sm">{formatFieldLabel(f)}</span> <span className={`text-[11px] flex items-center ${sortField === f ? 'text-accent' : 'text-muted-foreground'}`}>{sortField === f ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : (<ArrowUpDown className="h-3 w-3" />)}</span></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                Array.from({ length: pageSize || 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-t border-gray-700/20 h-11">
                    <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-800/60 animate-pulse" /></td>
                    {Array.from({ length: Math.max(0, (['symbol','price','previousClose','high','provider','lastUpdated'].length + dynamicFields.length) - 1) }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-gray-800/60 animate-pulse w-full max-w-[24rem]" /></td>
                    ))}
                  </tr>
                ))
              )}

              {!isLoading && pageItems.length === 0 && (
                <tr><td colSpan={(['symbol','price','previousClose','high','provider','lastUpdated'].length + dynamicFields.length)} className="px-4 py-6 text-sm text-muted-foreground">No data available</td></tr>
              )}

              {pageItems.map((r) => {
                const priceRaw = getNestedValue(r.data, 'price')
                const prevRaw = getNestedValue(r.data, 'previousClose')
                const highRaw = getNestedValue(r.data, 'high')

                const price = typeof priceRaw === 'number' ? formatValue(priceRaw, getDefaultFormatType('price')) : (priceRaw ?? '—')
                const prev = typeof prevRaw === 'number' ? formatValue(prevRaw, getDefaultFormatType('price')) : (prevRaw ?? '—')
                const high = typeof highRaw === 'number' ? formatValue(highRaw, getDefaultFormatType('price')) : (highRaw ?? '—')

                return (
                  <tr key={r.symbol} className="border-t border-gray-700/20 h-11 hover:bg-gray-800/10 odd:bg-transparent even:bg-gray-900/6">
                    <td className="px-4 py-3 font-semibold align-middle whitespace-nowrap">{r.symbol}</td>

                    <td className="px-4 py-3 text-sm text-foreground align-middle text-right whitespace-nowrap truncate max-w-[12rem]">{String(price)}</td>

                    <td className="px-4 py-3 text-sm text-muted-foreground align-middle text-right whitespace-nowrap truncate max-w-[10rem]">{String(prev)}</td>

                    <td className="px-4 py-3 text-sm text-foreground align-middle text-right whitespace-nowrap truncate max-w-[10rem]">{String(high)}</td>

                    <td className="px-4 py-3 align-middle whitespace-normal max-w-[14rem]"><span className="inline-block px-2 py-1 rounded-full bg-gray-800/10 text-xs text-muted-foreground truncate">{String(r.data?.provider ?? (r.error ? 'Error' : '—'))}</span></td>

                    <td className="px-4 py-3 text-sm text-muted-foreground align-middle whitespace-normal truncate max-w-[10rem]">{r.data?.lastUpdated ? new Date(r.data.lastUpdated).toLocaleTimeString() : (r.error ? 'Error' : '—')}</td>

                    {dynamicFields.filter((f) => !['symbol','price','previousClose','high','provider','lastUpdated'].includes(f)).map((f) => {
                      const val = getNestedValue(r.data, f)
                      const rendered = typeof val === 'number' ? formatValue(val, getDefaultFormatType('price')) : (val === undefined || val === null ? '—' : String(val))
                      return <td key={f} className="px-4 py-3 text-sm text-foreground align-middle">{String(rendered)}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination + footer (includes last-updated) */}
        <TablePagination
          page={page}
          pages={pages}
          total={total}
          pageSize={pageSize}
          onPrev={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(Math.min(pages, page + 1))}
          startIndex={((page - 1) * pageSize) + 1}
          endIndex={Math.min(page * pageSize, total)}
          lastUpdated={lastUpdated}
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
