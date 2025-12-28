import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock useTableData to return deterministic data
vi.mock('../useTableData', () => ({
  useTableData: () => ({
    rows: [
      {
        symbol: 'AAPL',
        data: {
          price: 150,
          previousClose: 148,
          high: 151,
          provider: 'alpha-vantage',
          lastUpdated: new Date().toISOString(),
          companyName: 'Apple Inc.'
        },
        error: null,
      },
      {
        symbol: 'MSFT',
        data: {
          price: 320,
          previousClose: 315,
          high: 322,
          provider: 'finnhub',
          lastUpdated: new Date().toISOString(),
          companyName: 'Microsoft Corp.'
        },
        error: null,
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}))

// Stub useTableState to avoid complex store interactions
const mockSetSort = vi.fn()
vi.mock('../useTableState', () => ({
  useTableState: () => ({
    search: '',
    setSearchPersist: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    pageSize: 10,
    setPageSize: vi.fn(),
    total: 2,
    pages: 1,
    pageItems: [
      { symbol: 'AAPL', data: { price: 150, previousClose: 148, high: 151, provider: 'alpha-vantage', lastUpdated: new Date().toISOString() } },
      { symbol: 'MSFT', data: { price: 320, previousClose: 315, high: 322, provider: 'finnhub', lastUpdated: new Date().toISOString() } }
    ],
    sortField: 'symbol',
    sortDir: 'asc',
    setSort: mockSetSort,
  })
}))

import TableWidget from '../TableWidget'

const sampleWidget = {
  id: 'widget-1',
  type: 'table',
  title: 'Market List',
  config: { symbols: ['AAPL', 'MSFT'], selectedFields: ['companyName'] }
}

describe('TableWidget', () => {
  it('renders required columns in correct order and includes dynamic fields after required columns', () => {
    render(<TableWidget widget={sampleWidget as any} onRemove={vi.fn()} />)

    // Check headers are in order
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    expect(headers[0]).toContain('Symbol')
    expect(headers[1]).toContain('Price')
    expect(headers[2]).toContain('Previous Close')
    expect(headers[3]).toContain('Day High')
    expect(headers[4]).toContain('Provider')
    expect(headers[5]).toContain('Last updated')
    // Dynamic field 'companyName' should appear after required cols
    expect(headers).toContain(expect.stringContaining('Company'))
  })

  it('does not allow control clicks to bubble and initiate drag on parent', () => {
    const parentPointerDown = vi.fn()

    // Render the widget inside a parent that listens for pointerdown
    const { container } = render(
      <div onPointerDown={parentPointerDown as any}>
        <TableWidget widget={sampleWidget as any} onRemove={vi.fn()} />
      </div>
    )

    // Click the remove button
    const removeBtn = container.querySelector('button[aria-label^="Remove"]') as HTMLButtonElement
    expect(removeBtn).toBeTruthy()
    fireEvent.pointerDown(removeBtn)
    fireEvent.mouseDown(removeBtn)
    // Parent's handler should NOT be called because the widget stops propagation
    expect(parentPointerDown).not.toHaveBeenCalled()

    // Also check edit button
    const editBtn = container.querySelector('button[aria-label^="Edit"]') as HTMLButtonElement
    expect(editBtn).toBeTruthy()
    fireEvent.pointerDown(editBtn)
    fireEvent.mouseDown(editBtn)
    expect(parentPointerDown).not.toHaveBeenCalled()
  })

  it('handles keyboard sorting on header (Enter key)', () => {
    render(<TableWidget widget={sampleWidget as any} onRemove={vi.fn()} />)
    const symbolHeader = screen.getAllByRole('columnheader')[0]
    // Symbol header is sortable; simulate keydown Enter
    fireEvent.keyDown(symbolHeader, { key: 'Enter', code: 'Enter' })
    expect(mockSetSort).toHaveBeenCalledWith('symbol')
  })
})
