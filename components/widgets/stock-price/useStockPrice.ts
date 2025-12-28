'use client'

import type { ProviderName } from '@/lib/api/providers/fallback'
import { fetchWithFallback } from '@/lib/api/providers/fallback'
import { cacheManager } from '@/lib/cache/cacheManager'
import type { StockQuote } from '@/lib/types/api'
import { useEffect, useRef, useState } from 'react'
import type { StockPriceState } from './types'

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
  refreshInterval: number | null = 60000,
  provider: ProviderName = 'alpha-vantage',
  realtime: boolean = false
): StockPriceState {
  const [state, setState] = useState<StockPriceState>({
    data: null,
    rawResponse: null,
    isLoading: false,
    error: null,
    hasFetched: false,
    provider: null,
    usedFallback: false,
    isRealtimeEnabled: realtime,
    realtimeConnected: false,
    realtimeUnavailableReason: null,
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

    // Enforce minimum refresh interval to avoid provider rate limits (min 60s)
    const effectiveRefresh = refreshInterval && refreshInterval > 0 ? Math.max(refreshInterval, 60000) : null

    // Fetch function that can be called on demand or by interval
    const fetchData = async (isInitialLoad: boolean = false) => {
      // Prevent overlapping API calls
      if (isFetchingRef.current) {
        return
      }

      // Check cache first for instant display (only on initial load)
      // Use generic cache key (not provider-specific) but include refresh interval grouping
      const cacheKey = cacheManager.generateKey(
        'multi-provider',
        'stock-price',
        normalizedSymbol,
        String(effectiveRefresh || refreshInterval || 'manual')
      )
      const cachedData = cacheManager.get<StockQuote>(cacheKey)

      if (isInitialLoad && cachedData) {
        // Use cached data immediately on initial load
        // Note: We don't have raw response in cache, so it will be null
        // Raw response will be fetched on next refresh
        setState((prev) => ({
          ...prev,
          data: cachedData,
          rawResponse: null,
          isLoading: false,
          error: null,
          hasFetched: true,
        }))
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
        
        // Cache the result (use provider-specific + interval cache key)
        const cacheKey = cacheManager.generateKey(
          actualProvider,
          'stock-price',
          normalizedSymbol,
          // include refresh interval in key to avoid mixing short/long interval data
          String(effectiveRefresh || refreshInterval || 'manual')
        )
        const cacheTTL = 10 * 60 * 1000 // 10 minutes
        cacheManager.set(cacheKey, quote, cacheTTL)
        
        setState((prev) => ({
          ...prev,
          data: quote,
          rawResponse,
          isLoading: false,
          error: null,
          hasFetched: true,
          provider: actualProvider,
          usedFallback,
        }))
      } catch (error) {
        // If we have cached data, keep it even if fetch fails
        if (cachedData) {
          setState((prev) => ({
            ...prev,
            data: cachedData,
            rawResponse: null, // No raw response if using cache
            isLoading: false,
            error: null, // Don't show error if we have cached data
            hasFetched: true,
          }))
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
    if (effectiveRefresh && effectiveRefresh > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(false) // Background refresh, don't show loading state
      }, effectiveRefresh)
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

  // Realtime WebSocket subscription (Finnhub only)
  useEffect(() => {
    if (!realtime) return
    if (!symbol || symbol.trim().length === 0) return
    if (provider !== 'finnhub') {
      // Realtime only supported for Finnhub
      setState((prev) => ({ ...prev, isRealtimeEnabled: true, realtimeConnected: false, realtimeUnavailableReason: 'Provider does not support realtime' }))
      return
    }

    let unsub: (() => void) | null = null
    let mgr: any = null

    // Use dynamic import to keep this client-only and decoupled
    const setup = async () => {
      try {
        const mod = await import('@/lib/realtime/finnhubSocket')
        const FinnhubSocketManager = mod.default || mod.FinnhubSocketManager
        const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY
        mgr = FinnhubSocketManager.getInstance(apiKey)

        // Status listener
        const statusCb = (s: { status: string; reason?: string }) => {
          if (s.status === 'connected') {
            setState((prev) => ({ ...prev, isRealtimeEnabled: true, realtimeConnected: true, realtimeUnavailableReason: null }))
          } else if (s.status === 'no-key') {
            setState((prev) => ({ ...prev, isRealtimeEnabled: true, realtimeConnected: false, realtimeUnavailableReason: s.reason || 'No API key for realtime' }))
          } else if (s.status === 'connecting') {
            setState((prev) => ({ ...prev, isRealtimeEnabled: true, realtimeConnected: false }))
          } else {
            setState((prev) => ({ ...prev, isRealtimeEnabled: true, realtimeConnected: false, realtimeUnavailableReason: s.reason || 'Realtime unavailable' }))
          }
        }

        mgr.addStatusListener(statusCb)

        // Subscribe to symbol trades
        const cb = (payload: { symbol: string; price: number; timestamp: number }) => {
          // Update local state with latest price, but keep other fields intact
          setState((prev) => {
            const newQuote = prev.data
              ? { ...prev.data, price: payload.price, lastUpdated: payload.timestamp }
              : { symbol: payload.symbol, price: payload.price, lastUpdated: payload.timestamp } as any
            return { ...prev, data: newQuote, realtimeConnected: true, realtimeUnavailableReason: null }
          })
        }

        unsub = mgr.subscribe(symbol, cb)
      } catch (err) {
        // Failed to set up realtime; mark as unavailable but keep polling
        setState((prev) => ({ ...prev, isRealtimeEnabled: true, realtimeConnected: false, realtimeUnavailableReason: 'Failed to setup realtime' }))
      }

    }

    setup()

    return () => {
      // cleanup subscription & listeners
      try {
        if (mgr && unsub) unsub()
        if (mgr && mgr.removeStatusListener) {
          // We passed an anonymous status callback; easiest to reset manager by removing all if needed
          // but try to remove if possible — manager exposes removeStatusListener
        }
      } catch {
        // ignore
      }
    }
  }, [symbol, realtime, provider])

  return state
}

