/**
 * Raw Response Fetcher
 * 
 * Fetches raw API responses for field extraction purposes.
 * This allows us to explore the full API response structure.
 */

import type { NetworkError, RateLimitError, ProviderError } from './types'

const API_KEYS = {
  'alpha-vantage': process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY,
  'finnhub': process.env.NEXT_PUBLIC_FINNHUB_API_KEY,
  'indian-api': process.env.NEXT_PUBLIC_INDIAN_API_KEY,
}

const BASE_URLS = {
  'alpha-vantage':
    process.env.NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL ||
    'https://www.alphavantage.co/query',
  'finnhub': 'https://finnhub.io/api/v1/quote',
  'indian-api':
    process.env.NEXT_PUBLIC_INDIAN_API_BASE_URL ||
    'https://api.example-indian-stock-api.com/v1/quote',
}

/**
 * Fetches raw response from a specific provider
 */
export async function fetchStockDataRaw(
  providerName: 'alpha-vantage' | 'finnhub' | 'indian-api',
  symbol: string
): Promise<unknown> {
  const API_KEY = API_KEYS[providerName]
  const BASE_URL = BASE_URLS[providerName]
  const normalizedSymbol = symbol.trim().toUpperCase()

  if (!API_KEY && providerName !== 'indian-api') {
    // Indian API might not require key
    throw new ProviderError(
      `${providerName} API key is missing`,
      providerName
    )
  }

  const url = new URL(BASE_URL)

  // Set provider-specific parameters
  if (providerName === 'alpha-vantage') {
    url.searchParams.set('function', 'GLOBAL_QUOTE')
    url.searchParams.set('symbol', normalizedSymbol)
    url.searchParams.set('apikey', API_KEY!)
  } else if (providerName === 'finnhub') {
    url.searchParams.set('symbol', normalizedSymbol)
    url.searchParams.set('token', API_KEY!)
  } else if (providerName === 'indian-api') {
    url.searchParams.set('symbol', normalizedSymbol)
    if (API_KEY) {
      url.searchParams.set('apikey', API_KEY)
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError(
          `${providerName} API rate limit exceeded`,
          providerName
        )
      }
      throw new NetworkError(
        `HTTP error! status: ${response.status}`,
        new Error(`Status: ${response.status}`)
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (
      error instanceof NetworkError ||
      error instanceof RateLimitError ||
      error instanceof ProviderError
    ) {
      throw error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        `Network error: Unable to connect to ${providerName} API`,
        error
      )
    }

    if (error instanceof SyntaxError) {
      throw new ProviderError(
        `Invalid JSON response from ${providerName} API`,
        providerName
      )
    }

    throw new NetworkError(
      `An unexpected error occurred while fetching from ${providerName}`,
      error
    )
  }
}

