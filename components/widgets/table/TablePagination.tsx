'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TablePagination({
  page,
  pages,
  total,
  pageSize,
  onPrev,
  onNext,
  startIndex,
  endIndex,
  lastUpdated,
}: {
  page: number
  pages: number
  total: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
  startIndex: number
  endIndex: number
  lastUpdated?: string | null
}) {
  return (
    <div className="mt-3 grid grid-cols-3 items-center text-sm text-muted-foreground">
      <div className="col-span-1">
        <div className="text-sm">Showing <span className="font-medium text-foreground">{startIndex}</span> - <span className="font-medium text-foreground">{endIndex}</span> of <span className="font-medium text-foreground">{total}</span></div>
      </div>

      <div className="col-span-1 flex items-center justify-center gap-3">
        <button onClick={onPrev} disabled={page === 1} className="rounded-md p-1 hover:bg-gray-800 disabled:opacity-50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium text-foreground">{page} / {pages}</div>
        <button onClick={onNext} disabled={page === pages} className="rounded-md p-1 hover:bg-gray-800 disabled:opacity-50">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="col-span-1 flex items-center justify-end text-xs">
        {lastUpdated && (<div>Last updated: <span className="font-medium text-foreground">{new Date(lastUpdated).toLocaleTimeString()}</span></div>)}
      </div>
    </div>
  )
}
