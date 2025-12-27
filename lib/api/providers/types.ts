/**
 * Provider Types
 * 
 * Common types for all API providers
 */

/**
 * Normalized stock data structure
 * All providers must return data in this format
 */
export interface NormalizedStockData {
  /** Current stock price (required) */
  price: number
  
  /** Opening price (optional) */
  open?: number
  
  /** High price (optional) */
  high?: number
  
  /** Low price (optional) */
  low?: number
  
  /** Previous close price (optional) */
  previousClose?: number
  
  /** Provider name that returned this data */
  provider: string
  
  /** Stock symbol */
  symbol: string
  
  /** ISO 8601 timestamp of when data was last updated */
  lastUpdated: string
}

/**
 * Provider error types
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public provider?: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class InvalidApiKeyError extends Error {
  constructor(message: string, public provider?: string) {
    super(message)
    this.name = 'InvalidApiKeyError'
  }
}











