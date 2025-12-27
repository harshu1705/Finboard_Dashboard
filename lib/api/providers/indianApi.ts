/**
 * Indian Stock API Provider
 * 
 * Tertiary provider for Indian stock data.
 * Follows the provider abstraction pattern.
 * 
 * Note: This is a placeholder implementation. Replace with actual Indian stock API
 * when available (e.g., NSE, BSE, or other Indian market data providers).
 */

import type { NormalizedStockData, ProviderError, NetworkError, RateLimitError } from './types'

// Get API configuration from environment variables
const API_KEY = process.env.NEXT_PUBLIC_INDIAN_API_KEY
const BASE_URL =
  process.env.NEXT_PUBLIC_INDIAN_API_BASE_URL ||
  'https://api.example-indian-stock-api.com/v1/quote'

/**
 * Indian API response structure (placeholder - adjust based on actual API)
 */
interface IndianApiQuoteResponse {
  symbol: string
  price: number
  open?: number
  high?: number
  low?: number
  previousClose?: number
  timestamp?: string
}

/**
 * Fetch stock data from Indian Stock API
 * 
 * @param symbol - Stock symbol (e.g., "RELIANCE", "TCS")
 * @returns Normalized stock data
 * @throws NetworkError - For network/fetch errors
 * @throws RateLimitError - For rate limit errors
 * @throws ProviderError - For API errors
 */
export async function fetchStockData(
  symbol: string
): Promise<NormalizedStockData> {
  // Validate API key (optional - some Indian APIs may not require keys)
  if (!API_KEY) {
    throw new ProviderError(
      'Indian API key is missing. Please set NEXT_PUBLIC_INDIAN_API_KEY in your environment variables.',
      'indian-api'
    )
  }

  // Validate symbol input
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new ProviderError('Symbol must be a non-empty string', 'indian-api')
  }

  // Normalize symbol (uppercase, trimmed)
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Build API URL
  const url = new URL(BASE_URL)
  url.searchParams.set('symbol', normalizedSymbol)
  if (API_KEY) {
    url.searchParams.set('apikey', API_KEY)
  }

  try {
    // Fetch data from Indian Stock API
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
          'Indian API rate limit exceeded. Please try again later.',
          'indian-api'
        )
      }
      throw new NetworkError(
        `HTTP error! status: ${response.status}`,
        new Error(`Status: ${response.status}`)
      )
    }

    // Parse JSON response
    const data: IndianApiQuoteResponse = await response.json()

    // Validate response structure
    if (!data || typeof data.price !== 'number' || data.price <= 0) {
      throw new ProviderError(
        `Invalid price data received for symbol: ${normalizedSymbol}`,
        'indian-api'
      )
    }

    // Normalize data to common format
    return {
      symbol: data.symbol || normalizedSymbol,
      price: data.price,
      open: data.open,
      high: data.high,
      low: data.low,
      previousClose: data.previousClose,
      provider: 'indian-api',
      lastUpdated: data.timestamp || new Date().toISOString(),
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
        'Network error: Unable to connect to Indian Stock API. Please check your internet connection.',
        error
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new ProviderError(
        'Invalid JSON response from Indian Stock API',
        'indian-api'
      )
    }

    // Handle unknown errors
    throw new NetworkError(
      'An unexpected error occurred while fetching stock quote',
      error
    )
  }
}




