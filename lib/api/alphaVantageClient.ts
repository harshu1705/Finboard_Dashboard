import type {
  StockQuote,
  AlphaVantageQuoteResponse,
  AlphaVantageErrorResponse,
  AlphaVantageError,
  NetworkError,
  RateLimitError,
} from '@/lib/types/api'

/**
 * Alpha Vantage API Client
 * 
 * Client-side API client for Alpha Vantage stock data API.
 * Designed for frontend-only Next.js applications.
 * 
 * Environment Variables Required:
 * - NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY: Your Alpha Vantage API key
 * - NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL: Base URL (default: https://www.alphavantage.co/query)
 */

// Get API configuration from environment variables
const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
const BASE_URL =
  process.env.NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL ||
  'https://www.alphavantage.co/query'

/**
 * Validate API configuration
 */
function validateConfig(): void {
  if (!API_KEY) {
    throw new Error(
      'Alpha Vantage API key is missing. Please set NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY in your environment variables.'
    )
  }
}

/**
 * Check if response indicates a rate limit error
 */
function isRateLimitError(response: AlphaVantageErrorResponse): boolean {
  return !!(
    response.Note?.toLowerCase().includes('call frequency') ||
    response.Note?.toLowerCase().includes('rate limit') ||
    response.Information?.toLowerCase().includes('call frequency')
  )
}

/**
 * Check if response indicates an API error
 */
function isApiError(response: AlphaVantageErrorResponse): boolean {
  return !!(
    response['Error Message'] ||
    (response.Note && !isRateLimitError(response))
  )
}

/**
 * Extract error message from Alpha Vantage error response
 */
function extractErrorMessage(response: AlphaVantageErrorResponse): string {
  if (response['Error Message']) {
    return response['Error Message']
  }
  if (response.Note) {
    return response.Note
  }
  if (response.Information) {
    return response.Information
  }
  return 'Unknown API error'
}

/**
 * Normalize Alpha Vantage API response to application format
 */
function normalizeQuoteResponse(
  symbol: string,
  response: AlphaVantageQuoteResponse
): StockQuote {
  const quote = response['Global Quote']
  const price = parseFloat(quote['05. price'])

  if (isNaN(price)) {
    throw new AlphaVantageError(
      `Invalid price data received for symbol: ${symbol}`
    )
  }

  return {
    symbol: quote['01. symbol'] || symbol.toUpperCase(),
    price,
    lastUpdated: new Date().toISOString(), // Alpha Vantage doesn't provide exact timestamp
  }
}

/**
 * Fetch stock quote from Alpha Vantage API
 * 
 * @param symbol - Stock symbol (e.g., "AAPL", "MSFT")
 * @returns Normalized stock quote data
 * @throws NetworkError - For network/fetch errors
 * @throws RateLimitError - For rate limit errors
 * @throws AlphaVantageError - For API errors
 * 
 * @example
 * ```typescript
 * try {
 *   const quote = await fetchStockQuote('AAPL')
 *   console.log(`${quote.symbol}: $${quote.price}`)
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.error('Rate limit exceeded. Please try again later.')
 *   } else if (error instanceof NetworkError) {
 *     console.error('Network error:', error.message)
 *   } else {
 *     console.error('API error:', error.message)
 *   }
 * }
 * ```
 */
export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  // Validate configuration
  validateConfig()

  // Validate symbol input
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error('Symbol must be a non-empty string')
  }

  // Normalize symbol (uppercase, trimmed)
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Build API URL
  const url = new URL(BASE_URL)
  url.searchParams.set('function', 'GLOBAL_QUOTE')
  url.searchParams.set('symbol', normalizedSymbol)
  url.searchParams.set('apikey', API_KEY!)

  try {
    // Fetch data from Alpha Vantage API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for client-side requests
      cache: 'no-store',
    })

    // Handle HTTP errors
    if (!response.ok) {
      throw new NetworkError(
        `HTTP error! status: ${response.status}`,
        new Error(`Status: ${response.status}`)
      )
    }

    // Parse JSON response
    const data: AlphaVantageQuoteResponse | AlphaVantageErrorResponse =
      await response.json()

    // Check for rate limit errors
    if (isRateLimitError(data as AlphaVantageErrorResponse)) {
      throw new RateLimitError(
        'Alpha Vantage API rate limit exceeded. Please try again later.'
      )
    }

    // Check for API errors
    if (isApiError(data as AlphaVantageErrorResponse)) {
      const errorMessage = extractErrorMessage(
        data as AlphaVantageErrorResponse
      )
      throw new AlphaVantageError(errorMessage)
    }

    // Validate response structure
    if (!('Global Quote' in data)) {
      throw new AlphaVantageError(
        'Invalid response format from Alpha Vantage API'
      )
    }

    // Normalize and return data
    return normalizeQuoteResponse(normalizedSymbol, data)
  } catch (error) {
    // Re-throw custom errors
    if (
      error instanceof NetworkError ||
      error instanceof RateLimitError ||
      error instanceof AlphaVantageError
    ) {
      throw error
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        'Network error: Unable to connect to Alpha Vantage API. Please check your internet connection.',
        error
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new AlphaVantageError(
        'Invalid JSON response from Alpha Vantage API'
      )
    }

    // Handle unknown errors
    throw new NetworkError(
      'An unexpected error occurred while fetching stock quote',
      error
    )
  }
}

/**
 * Alpha Vantage API Client
 * 
 * Main export object containing all API functions
 */
export const alphaVantageClient = {
  fetchStockQuote,
}

