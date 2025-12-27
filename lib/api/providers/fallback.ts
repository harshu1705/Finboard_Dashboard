/**
 * Fallback API Provider
 * 
 * Implements fallback logic to try multiple providers in sequence.
 * Tries providers in order: Alpha Vantage → Finnhub
 */

import type { NormalizedStockData, NetworkError, RateLimitError, ProviderError } from './types'
import { fetchStockData as fetchAlphaVantage } from './alphaVantage'
import { fetchStockData as fetchFinnhub } from './finnhub'
import { fetchStockDataRaw } from './rawResponseFetcher'

/**
 * Provider configuration
 */
export type ProviderName = 'alpha-vantage' | 'finnhub'

interface ProviderConfig {
  name: ProviderName
  fetch: (symbol: string) => Promise<NormalizedStockData>
}

/**
 * Provider order for fallback (primary → secondary)
 */
const PROVIDERS: ProviderConfig[] = [
  { name: 'alpha-vantage', fetch: fetchAlphaVantage },
  { name: 'finnhub', fetch: fetchFinnhub },
]

/**
 * Check if an error is retryable (should try next provider)
 */
function isRetryableError(error: unknown): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof RateLimitError ||
    error instanceof ProviderError
  )
}

/**
 * Result from fetchWithFallback including both normalized data and raw response
 */
export interface FetchWithFallbackResult {
  /** Normalized stock data */
  normalized: NormalizedStockData
  /** Raw API response from the provider */
  rawResponse: unknown
}

/**
 * Fetch stock data with automatic fallback to next provider on failure
 * 
 * Tries providers in order:
 * 1. Preferred provider (default: Alpha Vantage)
 * 2. Fallback provider (Finnhub if Alpha Vantage was preferred, vice versa)
 * 
 * @param symbol - Stock symbol to fetch
 * @param preferredProvider - Optional preferred provider to try first (default: 'alpha-vantage')
 * @returns Normalized stock data and raw response from the first successful provider
 * @throws Error if all providers fail
 * 
 * @example
 * ```typescript
 * try {
 *   const { normalized, rawResponse } = await fetchWithFallback('AAPL')
 *   console.log(`Price: $${normalized.price} from ${normalized.provider}`)
 *   console.log('Raw response:', rawResponse)
 * } catch (error) {
 *   console.error('All providers failed:', error.message)
 * }
 * ```
 */
export async function fetchStockDataWithFallback(
  symbol: string,
  preferredProvider: ProviderName = 'alpha-vantage'
): Promise<FetchWithFallbackResult> {
  // Validate symbol input
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new ProviderError(
      'Symbol must be a non-empty string',
      preferredProvider
    )
  }

  // Normalize symbol
  const normalizedSymbol = symbol.trim().toUpperCase()

  // Reorder providers to start with preferred provider
  const reorderedProviders = [
    ...PROVIDERS.filter((p) => p.name === preferredProvider),
    ...PROVIDERS.filter((p) => p.name !== preferredProvider),
  ]

  const errors: Array<{ provider: string; error: string }> = []

  // Try each provider in order
  for (const provider of reorderedProviders) {
    try {
      const data = await provider.fetch(normalizedSymbol)
      
      // Fetch raw response for field extraction
      const rawResponse = await fetchRawResponse(provider.name, normalizedSymbol)
      
      return {
        normalized: data,
        rawResponse,
      }
    } catch (error) {
      // Collect error information for user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        provider: provider.name,
        error: errorMessage,
      })

      // Continue to next provider if this one failed
      // All errors are retryable (rate limits, network errors, invalid symbols)
      continue
    }
  }

  // All providers failed - return user-friendly error
  // Format errors for display
  const errorSummary = errors.length > 0
    ? errors.map((e) => {
        // Make error messages more user-friendly
        if (e.error.includes('rate limit')) {
          return `${e.provider}: Rate limit reached`
        }
        if (e.error.includes('Network')) {
          return `${e.provider}: Network error`
        }
        return `${e.provider}: ${e.error}`
      }).join('; ')
    : 'Unknown error'

  throw new Error(
    `Unable to fetch stock data for "${normalizedSymbol}". ${errorSummary}. Please try again later.`
  )
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use fetchStockDataWithFallback instead
 */
export async function fetchWithFallback(
  symbol: string,
  preferredProvider: ProviderName = 'alpha-vantage'
): Promise<FetchWithFallbackResult> {
  return fetchStockDataWithFallback(symbol, preferredProvider)
}

/**
 * Fetches raw response from a provider for field extraction
 * This is a helper function that makes a separate call to get the raw response
 */
async function fetchRawResponse(
  providerName: ProviderName,
  symbol: string
): Promise<unknown> {
  try {
    return await fetchStockDataRaw(providerName, symbol)
  } catch (error) {
    // If raw fetch fails, return empty object
    // This ensures we always have something to extract fields from
    // The widget will gracefully handle missing raw response
    return {}
  }
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): ProviderName[] {
  return PROVIDERS.map((p) => p.name)
}




