'use client'

import { getNestedValue } from '@/lib/utils/fieldExtraction'
import { formatValue, getDefaultFormatType } from '@/lib/utils/valueFormatter'
import type { TableRow } from './types'

export default function TableRowComponent({ row, dynamicFields, onRemoveSymbol }: { row: TableRow, dynamicFields: string[], onRemoveSymbol?: (s: string) => void }) {
  const colMinWidth = (f: string) => {
    const lower = f.toLowerCase()
    if (lower.includes('symbol')) return 140
    if (lower.includes('price') || lower.includes('close') || lower.includes('prev') || lower.includes('open')) return 160
    if (lower.includes('volume')) return 160
    if (lower.includes('change') || lower.includes('percent')) return 140
    return 220
  }

  return (
    <tr className="border-t border-gray-700/20 hover:bg-gray-800/20 transition-colors">
      <td className="px-4 py-3 text-sm font-semibold text-foreground align-middle whitespace-nowrap" style={{ minWidth: `${colMinWidth('symbol')}px` }}>{row.symbol}</td>
      {dynamicFields.map((f) => {
        const val = getNestedValue(row.data, f)
        if (typeof val === 'number' && /price|close|high|low|volume/i.test(f)) {
          return <td key={f} className="px-4 py-3 text-sm text-foreground align-middle whitespace-nowrap" style={{ minWidth: `${colMinWidth(f)}px` }}>{formatValue(val, getDefaultFormatType('price'))}</td>
        }
        return <td key={f} className="px-4 py-3 text-sm text-foreground align-middle whitespace-normal break-words" style={{ minWidth: `${colMinWidth(f)}px` }}>{val === undefined || val === null ? '—' : String(val)}</td>
      })}

      <td className="px-4 py-3 text-sm text-muted-foreground align-middle whitespace-normal" style={{ minWidth: `${colMinWidth('actions')}px` }}>
        <div className="flex items-center gap-2">
          {onRemoveSymbol && (
            <button onClick={() => onRemoveSymbol(row.symbol)} className="rounded-md p-1 hover:bg-red-900/20 hover:text-red-400" title={`Remove ${row.symbol}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <span className="whitespace-normal break-words" style={{ minWidth: `${colMinWidth('provider')}px` }}>
            {row.data?.provider ?? (row.error ? (
              (String(row.error).toLowerCase().includes('rate limit') ? 'API rate limit exceeded. Please wait.' :
               /401|403|invalid api/i.test(String(row.error)) ? 'Invalid API key' :
               String(row.error).toLowerCase().includes('network') ? 'Network unavailable' : 'Error')
            ) : '—')}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-muted-foreground align-middle whitespace-nowrap" style={{ minWidth: `${colMinWidth('lastUpdated')}px` }}>{row.data?.lastUpdated ? new Date(row.data.lastUpdated).toLocaleTimeString() : (row.error ? 'Error' : '—')}</td>
    </tr>
  )
}
