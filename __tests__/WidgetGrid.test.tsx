import WidgetGrid from '@/components/dashboard/WidgetGrid'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { render, screen } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

describe('WidgetGrid', () => {
  beforeEach(() => {
    // reset store to a minimal state before each test
    act(() => {
      useDashboardStore.getState().importWidgets([
        { id: 'w-1', type: 'chart', title: 'Chart A', config: {}, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'w-2', type: 'table', title: 'Table B', config: {}, createdAt: Date.now(), updatedAt: Date.now() }
      ])
      useDashboardStore.getState().setDragEnabled(false)
    })
  })

  it('renders widgets in a static grid when reordering is disabled', () => {
    render(<WidgetGrid />)
    expect(screen.getByText('Chart A')).toBeTruthy()
    expect(screen.getByText('Table B')).toBeTruthy()
  })
})