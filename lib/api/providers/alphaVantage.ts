/**
 * Alpha Vantage API Provider
 * 
 * Primary provider for stock data.
 * Follows the provider abstraction pattern.
 */

import type { InvalidApiKeyError, NetworkError, NormalizedStockData, ProviderError, RateLimitError } from './types'

// Get API configuration from environment variables
const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
const BASE_URL =
  process.env.NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL ||
  'https://www.alphavantage.co/query'

/**
 * Alpha Vantage API response structure
 */
interface AlphaVantageQuoteResponse {
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
 * Alpha Vantage error response structure
 */
interface AlphaVantageErrorResponse {
  'Error Message'?: string
  'Note'?: string
  'Information'?: string
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
 * Fetch stock data from Alpha Vantage API
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
      'Alpha Vantage API key is missing. Please set NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY in your environment variables.',
      'alpha-vantage'
    )
  }

  // Validate symbol input
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new ProviderError('Symbol must be a non-empty string', 'alpha-vantage')
  }

  // Normalize symbol (uppercase, trimmed)
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Build API URL
  const url = new URL(BASE_URL)
  url.searchParams.set('function', 'GLOBAL_QUOTE')
  url.searchParams.set('symbol', normalizedSymbol)
  url.searchParams.set('apikey', API_KEY)

  try {
    // Fetch data from Alpha Vantage API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    // Handle HTTP errors and map to specific error types
    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError(
          'Alpha Vantage API rate limit exceeded. Please try again later.',
          'alpha-vantage'
        )
      }
      if (response.status === 401 || response.status === 403) {
        throw new InvalidApiKeyError(
          'Invalid API key for Alpha Vantage',
          'alpha-vantage'
        )
      }
      throw new NetworkError(
        `HTTP error! status: ${response.status}`,
        new Error(`Status: ${response.status}`)
      )
    }

    // Parse JSON response
    const data: AlphaVantageQuoteResponse | AlphaVantageErrorResponse =
      await response.json()

    // Check for rate limit indicators first (before checking structure)
    // Alpha Vantage returns Note or Information fields when rate limited
    const errorData = data as AlphaVantageErrorResponse
    if (errorData.Note || errorData.Information) {
      // Check if it's a rate limit message
      const noteLower = (errorData.Note || '').toLowerCase()
      const infoLower = (errorData.Information || '').toLowerCase()
      
      if (
        noteLower.includes('call frequency') ||
        noteLower.includes('rate limit') ||
        noteLower.includes('api call') ||
        infoLower.includes('call frequency') ||
        infoLower.includes('rate limit')
      ) {
        throw new RateLimitError(
          'Alpha Vantage API rate limit exceeded. Please try again later.',
          'alpha-vantage'
        )
      }
      
      // If it's not a rate limit, it's another API error
      const errorMessage = extractErrorMessage(errorData)
      throw new ProviderError(errorMessage, 'alpha-vantage')
    }

    // Check for explicit error messages
    if (errorData['Error Message']) {
      throw new ProviderError(
        errorData['Error Message'],
        'alpha-vantage'
      )
    }

    // Validate response structure - must have Global Quote
    if (!('Global Quote' in data)) {
      throw new ProviderError(
        'Invalid response format from Alpha Vantage API',
        'alpha-vantage'
      )
    }

    // Normalize data to common format
    const quote = (data as AlphaVantageQuoteResponse)['Global Quote']
    
    // Check for empty Global Quote (another rate limit indicator)
    if (!quote || Object.keys(quote).length === 0) {
      throw new RateLimitError(
        'Alpha Vantage API rate limit exceeded. Please try again later.',
        'alpha-vantage'
      )
    }
    const price = parseFloat(quote['05. price'])
    const open = parseFloat(quote['02. open'])
    const high = parseFloat(quote['03. high'])
    const low = parseFloat(quote['04. low'])
    const previousClose = parseFloat(quote['08. previous close'])

    if (isNaN(price)) {
      throw new ProviderError(
        `Invalid price data received for symbol: ${normalizedSymbol}`,
        'alpha-vantage'
      )
    }

    return {
      symbol: quote['01. symbol'] || normalizedSymbol,
      price,
      open: !isNaN(open) ? open : undefined,
      high: !isNaN(high) ? high : undefined,
      low: !isNaN(low) ? low : undefined,
      previousClose: !isNaN(previousClose) ? previousClose : undefined,
      provider: 'alpha-vantage',
      lastUpdated: new Date().toISOString(),
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
        'Network error: Unable to connect to Alpha Vantage API. Please check your internet connection.',
        error
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new ProviderError(
        'Invalid JSON response from Alpha Vantage API',
        'alpha-vantage'
      )
    }

    // Handle unknown errors
    throw new NetworkError(
      'An unexpected error occurred while fetching stock quote',
      error
    )
  }
}




