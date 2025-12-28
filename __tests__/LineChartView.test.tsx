import LineChartView from '@/components/widgets/chart/LineChartView'
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'

it('renders an svg path for line chart', () => {
  const data = [
    { date: '2025-01-01', open: 100, close: 100 },
    { date: '2025-01-02', open: 101, close: 110 },
    { date: '2025-01-03', open: 108, close: 120 },
  ]
  const { container } = render(<LineChartView data={data as any} />)
  const path = container.querySelector('svg path')
  expect(path).not.toBeNull()
})