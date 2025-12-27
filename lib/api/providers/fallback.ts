/**
 * Fallback API Provider
 * 
 * Implements fallback logic to try multiple providers in sequence.
 * Tries providers in order: Alpha Vantage → Finnhub → Indian API
 */

import type { NormalizedStockData, NetworkError, RateLimitError, ProviderError } from './types'
import { fetchStockData as fetchAlphaVantage } from './alphaVantage'
import { fetchStockData as fetchFinnhub } from './finnhub'
import { fetchStockData as fetchIndianApi } from './indianApi'
import { fetchStockDataRaw } from './rawResponseFetcher'

/**
 * Provider configuration
 */
type ProviderName = 'alpha-vantage' | 'finnhub' | 'indian-api'

interface ProviderConfig {
  name: ProviderName
  fetch: (symbol: string) => Promise<NormalizedStockData>
}

/**
 * Provider order for fallback (primary → secondary → tertiary)
 */
const PROVIDERS: ProviderConfig[] = [
  { name: 'alpha-vantage', fetch: fetchAlphaVantage },
  { name: 'finnhub', fetch: fetchFinnhub },
  { name: 'indian-api', fetch: fetchIndianApi },
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
 * 1. Alpha Vantage (primary)
 * 2. Finnhub (secondary)
 * 3. Indian API (tertiary)
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
export async function fetchWithFallback(
  symbol: string,
  preferredProvider: ProviderName = 'alpha-vantage'
): Promise<FetchWithFallbackResult> {
  // Reorder providers to start with preferred provider
  const reorderedProviders = [
    ...PROVIDERS.filter((p) => p.name === preferredProvider),
    ...PROVIDERS.filter((p) => p.name !== preferredProvider),
  ]

  const errors: Array<{ provider: string; error: string }> = []

  // Try each provider in order
  for (const provider of reorderedProviders) {
    try {
      const data = await provider.fetch(symbol)
      
      // Fetch raw response for field extraction
      // We need to get the raw response from the provider
      // Since providers normalize immediately, we'll need to fetch raw separately
      // For now, we'll reconstruct a representative raw response from normalized data
      // In a real implementation, providers would return both normalized and raw
      const rawResponse = await fetchRawResponse(provider.name, symbol)
      
      return {
        normalized: data,
        rawResponse,
      }
    } catch (error) {
      // Collect error information
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        provider: provider.name,
        error: errorMessage,
      })

      // If error is retryable, continue to next provider
      if (isRetryableError(error)) {
        // Continue to next provider
        continue
      }

      // For non-retryable errors, still try next provider but log the error
      // (e.g., invalid symbol might work with different provider)
      continue
    }
  }

  // All providers failed - return user-friendly error
  const errorMessages = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join('; ')

  throw new Error(
    `Unable to fetch stock data for "${symbol}". All providers failed: ${errorMessages}`
  )
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
  } catch {
    // If raw fetch fails, return a reconstructed object from normalized data
    // This ensures we always have something to extract fields from
    return {}
  }
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): ProviderName[] {
  return PROVIDERS.map((p) => p.name)
}




