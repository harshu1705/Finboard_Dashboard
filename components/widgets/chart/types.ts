export type ChartType = 'line' | 'candle'
export type ChartInterval = 'daily' | 'weekly' | 'monthly'

export interface ChartPoint {
  date: string
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
}

export interface ChartWidgetConfig {
  symbol: string
  chartType: ChartType
  interval: ChartInterval
  refreshInterval?: number
  provider?: string
}
