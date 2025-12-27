/**
 * Finnhub API Provider
 * 
 * Secondary provider for stock data.
 * Follows the provider abstraction pattern.
 */

import type { NormalizedStockData, ProviderError, NetworkError, RateLimitError } from './types'

// Get API configuration from environment variables
const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY
const BASE_URL = 'https://finnhub.io/api/v1/quote'

/**
 * Finnhub API response structure
 */
interface FinnhubQuoteResponse {
  c: number // Current price
  h: number // High price
  l: number // Low price
  o: number // Open price
  pc: number // Previous close
  t: number // Timestamp
}

/**
 * Fetch stock data from Finnhub API
 * 
 * @param symbol - Stock symbol (e.g., "AAPL", "MSFT")
 * @returns Normalized stock data
 * @throws NetworkError - For network/fetch errors
 * @throws RateLimitError - For rate limit errors
 * @throws ProviderError - For API errors
 */
export async function fetchStockData(
  symbol: string
): Promise<NormalizedStockData> {
  // Validate API key
  if (!API_KEY) {
    throw new ProviderError(
      'Finnhub API key is missing. Please set NEXT_PUBLIC_FINNHUB_API_KEY in your environment variables.',
      'finnhub'
    )
  }

  // Validate symbol input
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new ProviderError('Symbol must be a non-empty string', 'finnhub')
  }

  // Normalize symbol (uppercase, trimmed)
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Build API URL
  const url = new URL(BASE_URL)
  url.searchParams.set('symbol', normalizedSymbol)
  url.searchParams.set('token', API_KEY)

  try {
    // Fetch data from Finnhub API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    // Handle HTTP errors
    if (!response.ok) {
      // Check for rate limit (429)
      if (response.status === 429) {
        throw new RateLimitError(
          'Finnhub API rate limit exceeded. Please try again later.',
          'finnhub'
        )
      }
      throw new NetworkError(
        `HTTP error! status: ${response.status}`,
        new Error(`Status: ${response.status}`)
      )
    }

    // Parse JSON response
    const data: FinnhubQuoteResponse = await response.json()

    // Check for invalid response (Finnhub returns { c: 0 } for invalid symbols)
    if (!data || typeof data.c !== 'number' || data.c === 0) {
      throw new ProviderError(
        `Invalid symbol or no data available for: ${normalizedSymbol}`,
        'finnhub'
      )
    }

    // Normalize data to common format
    return {
      symbol: normalizedSymbol,
      price: data.c,
      open: data.o,
      high: data.h,
      low: data.l,
      previousClose: data.pc,
      provider: 'finnhub',
      lastUpdated: data.t
        ? new Date(data.t * 1000).toISOString()
        : new Date().toISOString(),
    }
  } catch (error) {
    // Re-throw custom errors
    if (
      error instanceof NetworkError ||
      error instanceof RateLimitError ||
      error instanceof ProviderError
    ) {
      throw error
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        'Network error: Unable to connect to Finnhub API. Please check your internet connection.',
        error
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new ProviderError(
        'Invalid JSON response from Finnhub API',
        'finnhub'
      )
    }

    // Handle unknown errors
    throw new NetworkError(
      'An unexpected error occurred while fetching stock quote',
      error
    )
  }
}




