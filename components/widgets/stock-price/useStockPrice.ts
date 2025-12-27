'use client'

import { useState, useEffect, useRef } from 'react'
import { fetchWithFallback } from '@/lib/api/providers/fallback'
import type { ProviderName } from '@/lib/api/providers/fallback'
import { cacheManager } from '@/lib/cache/cacheManager'
import type { StockQuote } from '@/lib/types/api'
import type { StockPriceState } from './types'
import { NetworkError, RateLimitError } from '@/lib/api/providers/types'

/**
 * Custom hook for fetching stock price data with automatic refresh
 * 
 * Manages loading, error, and data state for stock quotes.
 * Supports automatic polling-based refresh at configurable intervals.
 * Fully isolated - can be used by any component.
 * 
 * @param symbol - Stock symbol to fetch (e.g., "AAPL")
 * @param refreshInterval - Refresh interval in milliseconds (default: 30000 = 30 seconds)
 *                          Set to 0 or null to disable auto-refresh
 * @param provider - Preferred provider to use (default: 'alpha-vantage')
 * @returns Stock price state with data, loading, error, provider, and fallback info
 * 
 * @example
 * ```tsx
 * // Default 30-second refresh
 * const { data, isLoading, error } = useStockPrice('AAPL')
 * 
 * // Custom 60-second refresh
 * const { data, isLoading, error } = useStockPrice('AAPL', 60000)
 * 
 * // With specific provider
 * const { data, isLoading, error, provider, usedFallback } = useStockPrice('AAPL', 30000, 'finnhub')
 * ```
 */
export function useStockPrice(
  symbol: string,
  refreshInterval: number | null = 30000,
  provider: ProviderName = 'alpha-vantage'
): StockPriceState {
  const [state, setState] = useState<StockPriceState>({
    data: null,
    rawResponse: null,
    isLoading: false,
    error: null,
    hasFetched: false,
    provider: null,
    usedFallback: false,
  })

  // Track if a fetch is in progress to prevent overlapping calls
  const isFetchingRef = useRef(false)
  
  // Store interval ID for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initial fetch and setup interval
  useEffect(() => {
    // Skip if symbol is empty
    if (!symbol || symbol.trim().length === 0) {
      return
    }

    // Normalize symbol
    const normalizedSymbol = symbol.trim().toUpperCase()

    // Fetch function that can be called on demand or by interval
    const fetchData = async (isInitialLoad: boolean = false) => {
      // Prevent overlapping API calls
      if (isFetchingRef.current) {
        return
      }

      // Check cache first for instant display (only on initial load)
      // Use generic cache key (not provider-specific) since we use fallback
      const cacheKey = cacheManager.generateKey(
        'multi-provider',
        'stock-price',
        normalizedSymbol
      )
      const cachedData = cacheManager.get<StockQuote>(cacheKey)

      if (isInitialLoad && cachedData) {
        // Use cached data immediately on initial load
        // Note: We don't have raw response in cache, so it will be null
        // Raw response will be fetched on next refresh
        setState({
          data: cachedData,
          rawResponse: null,
          isLoading: false,
          error: null,
          hasFetched: true,
        })
      } else if (isInitialLoad && !cachedData) {
        // Set loading state only on initial load if no cache
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }))
      }

      // Mark as fetching
      isFetchingRef.current = true

      try {
        // Fetch fresh data with fallback logic
        // Tries preferred provider → fallback provider in sequence
        const { 
          normalized: normalizedData, 
          rawResponse, 
          provider: actualProvider,
          usedFallback 
        } = await fetchWithFallback(normalizedSymbol, provider)
        
        // Convert normalized data to StockQuote format
        const quote: StockQuote = {
          symbol: normalizedData.symbol,
          price: normalizedData.price,
          lastUpdated: normalizedData.lastUpdated,
          provider: normalizedData.provider,
          open: normalizedData.open,
          high: normalizedData.high,
          low: normalizedData.low,
          previousClose: normalizedData.previousClose,
        }
        
        // Cache the result (use provider-specific cache key)
        const cacheKey = cacheManager.generateKey(
          actualProvider,
          'stock-price',
          normalizedSymbol
        )
        const cacheTTL = 5 * 60 * 1000 // 5 minutes
        cacheManager.set(cacheKey, quote, cacheTTL)
        
        setState({
          data: quote,
          rawResponse,
          isLoading: false,
          error: null,
          hasFetched: true,
          provider: actualProvider,
          usedFallback,
        })
      } catch (error) {
        // If we have cached data, keep it even if fetch fails
        if (cachedData) {
          setState({
            data: cachedData,
            rawResponse: null, // No raw response if using cache
            isLoading: false,
            error: null, // Don't show error if we have cached data
            hasFetched: true,
          })
        } else {
          setState((prev) => ({
            ...prev,
            data: prev.data, // Keep existing data if available
            rawResponse: prev.rawResponse, // Keep existing raw response if available
            isLoading: false,
            error: error as Error,
            hasFetched: true,
          }))
        }
      } finally {
        // Mark as not fetching
        isFetchingRef.current = false
      }
    }

    // Initial fetch
    fetchData(true)

    // Set up auto-refresh interval if enabled
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(false) // Background refresh, don't show loading state
      }, refreshInterval)
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Reset fetching flag on cleanup
      isFetchingRef.current = false
    }
  }, [symbol, refreshInterval, provider]) // Re-run when symbol, interval, or provider changes

  return state
}

