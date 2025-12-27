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
}: {
  page: number
  pages: number
  total: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
  startIndex: number
  endIndex: number
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
      <div>
        <div className="text-sm">Showing <span className="font-medium text-foreground">{startIndex}</span> - <span className="font-medium text-foreground">{endIndex}</span> of <span className="font-medium text-foreground">{total}</span></div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onPrev} disabled={page === 1} className="rounded-md p-1 hover:bg-gray-800 disabled:opacity-50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium text-foreground">{page} / {pages}</div>
        <button onClick={onNext} disabled={page === pages} className="rounded-md p-1 hover:bg-gray-800 disabled:opacity-50">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
