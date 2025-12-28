/**
 * Provider Utility Functions
 * 
 * Utility functions for formatting and displaying provider information
 */

import type { ProviderName } from '@/lib/api/providers/fallback'

/**
 * Formats a provider name for display
 * 
 * @param provider - Provider name (e.g., 'alpha-vantage', 'finnhub')
 * @returns Formatted display name
 * 
 * @example
 * ```typescript
 * formatProviderName('alpha-vantage') // Returns: 'Alpha Vantage'
 * formatProviderName('finnhub') // Returns: 'Finnhub'
 * ```
 */
export function formatProviderName(provider: ProviderName): string {
  switch (provider) {
    case 'alpha-vantage':
      return 'Alpha Vantage'
    case 'finnhub':
      return 'Finnhub'
    default:
      return provider
  }
}

/**
 * Gets the display label for a provider badge
 * 
 * @param provider - Provider name
 * @param usedFallback - Whether fallback was used
 * @param preferredProvider - Preferred provider that was requested
 * @returns Display label
 */
export function getProviderLabel(
  provider: ProviderName | null,
  usedFallback: boolean,
  preferredProvider?: ProviderName | null
): string {
  if (!provider) {
    return 'Unknown provider'
  }

  if (usedFallback && preferredProvider && preferredProvider !== provider) {
    return `Fallback to ${formatProviderName(provider)}`
  }

  return `Data source: ${formatProviderName(provider)}`
}











