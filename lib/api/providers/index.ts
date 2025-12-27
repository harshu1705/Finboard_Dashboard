/**
 * API Providers Index
 * 
 * Central export point for all API providers and fallback logic
 */

export { fetchStockData as fetchAlphaVantage } from './alphaVantage'
export { fetchStockData as fetchFinnhub } from './finnhub'
export { fetchStockData as fetchIndianApi } from './indianApi'
export { fetchWithFallback, getAvailableProviders } from './fallback'
export type { NormalizedStockData, ProviderError, NetworkError, RateLimitError } from './types'




