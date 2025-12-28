import type { CreateWidgetPayload } from '@/lib/types/widget'

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  widgets: CreateWidgetPayload[]
}

/**
 * Predefined dashboard templates
 * 
 * Each template contains a set of widgets that can be loaded with one click.
 */
export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: 'stock-tracker',
    name: 'Stock Tracker',
    description: 'Track AAPL and MSFT stock prices with live updates',
    widgets: [
      {
        type: 'price-card',
        title: 'Apple Stock',
        description: 'Live AAPL price (updated every 30s)',
        config: {
          symbol: 'AAPL',
          refreshInterval: 30000,
          provider: 'alpha-vantage',
          selectedFields: ['price'],
          fields: ['price'],
        },
      },
      {
        type: 'price-card',
        title: 'Microsoft Stock',
        description: 'Live MSFT price (updated every 30s)',
        config: {
          symbol: 'MSFT',
          refreshInterval: 30000,
          provider: 'alpha-vantage',
          selectedFields: ['price'],
          fields: ['price'],
        },
      },
    ],
  },
  {
    id: 'market-overview',
    name: 'Market Overview',
    description: 'Monitor key market indicators and popular stocks',
    widgets: [
      {
        type: 'price-card',
        title: 'Apple Inc.',
        description: 'AAPL - Technology sector leader',
        config: {
          symbol: 'AAPL',
          refreshInterval: 30000,
          provider: 'alpha-vantage',
          selectedFields: ['price'],
          fields: ['price'],
        },
      },
      {
        type: 'price-card',
        title: 'Microsoft Corporation',
        description: 'MSFT - Cloud and enterprise software',
        config: {
          symbol: 'MSFT',
          refreshInterval: 30000,
          provider: 'alpha-vantage',
          selectedFields: ['price'],
          fields: ['price'],
        },
      },
      {
        type: 'price-card',
        title: 'Google (Alphabet)',
        description: 'GOOGL - Search and advertising',
        config: {
          symbol: 'GOOGL',
          refreshInterval: 30000,
          provider: 'alpha-vantage',
          selectedFields: ['price'],
          fields: ['price'],
        },
      },
    ],
  },  {
    id: 'market-list',
    name: 'Market / ETF List',
    description: 'Paginated table showing multiple stocks',
    widgets: [
      {
        type: 'table',
        title: 'Market List',
        description: 'Watchlist-style market table with pagination and search',
        config: {
          symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'],
          refreshInterval: 30000,
          selectedFields: ['price', 'previousClose'],
          pageSize: 5,
          page: 1,
          sortField: 'symbol',
          sortDir: 'asc'
        },
      },
    ],
  },]

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): DashboardTemplate | undefined {
  return dashboardTemplates.find((template) => template.id === id)
}

/**
 * Get all available templates
 */
export function getAllTemplates(): DashboardTemplate[] {
  return dashboardTemplates
}











