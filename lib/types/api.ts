/**
 * API type definitions
 * 
 * Types for external API integrations, including Alpha Vantage
 */

/**
 * Normalized stock quote data structure
 * Used across the application regardless of API provider
 */
export interface StockQuote {
  /** Stock symbol (e.g., "AAPL") */
  symbol: string
  
  /** Current stock price */
  price: number
  
  /** ISO 8601 timestamp of when data was last updated */
  lastUpdated: string
  
  /** Provider that returned this data */
  provider?: string
  
  /** Opening price (optional) */
  open?: number
  
  /** High price (optional) */
  high?: number
  
  /** Low price (optional) */
  low?: number
  
  /** Previous close price (optional) */
  previousClose?: number
}

/**
 * Alpha Vantage API response structure for Global Quote endpoint
 * Based on Alpha Vantage API documentation
 */
export interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string
    '02. open': string
    '03. high': string
    '04. low': string
    '05. price': string
    '06. volume': string
    '07. latest trading day': string
    '08. previous close': string
    '09. change': string
    '10. change percent': string
  }
}

/**
 * Alpha Vantage API error response structure
 */
export interface AlphaVantageErrorResponse {
  'Error Message'?: string
  'Note'?: string
  'Information'?: string
}

/**
 * Custom error types for API client
 */
export class AlphaVantageError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AlphaVantageError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

