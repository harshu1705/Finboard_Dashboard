'use client'

import { useState, useEffect } from 'react'
import { fetchStockQuote } from '@/lib/api/alphaVantageClient'
import { cacheManager } from '@/lib/cache/cacheManager'
import type { StockQuote } from '@/lib/types/api'
import type { StockPriceState } from './types'
import {
  NetworkError,
  RateLimitError,
  AlphaVantageError,
} from '@/lib/types/api'

/**
 * Custom hook for fetching stock price data
 * 
 * Manages loading, error, and data state for stock quotes.
 * Fully isolated - can be used by any component.
 * 
 * @param symbol - Stock symbol to fetch (e.g., "AAPL")
 * @returns Stock price state with data, loading, and error
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useStockPrice('AAPL')
 * 
 * if (isLoading) return <div>Loading...</div>
 * if (error) return <div>Error: {error.message}</div>
 * if (data) return <div>{data.symbol}: ${data.price}</div>
 * ```
 */
export function useStockPrice(symbol: string): StockPriceState {
  const [state, setState] = useState<StockPriceState>({
    data: null,
    isLoading: false,
    error: null,
    hasFetched: false,
  })

  useEffect(() => {
    // Skip if symbol is empty
    if (!symbol || symbol.trim().length === 0) {
      return
    }

    // Normalize symbol
    const normalizedSymbol = symbol.trim().toUpperCase()

    // Check cache first for instant display
    const cacheKey = cacheManager.generateKey(
      'alpha-vantage',
      'stock-price',
      normalizedSymbol
    )
    const cachedData = cacheManager.get<StockQuote>(cacheKey)

    if (cachedData) {
      // Use cached data immediately
      setState({
        data: cachedData,
        isLoading: false,
        error: null,
        hasFetched: true,
      })
    } else {
      // Set loading state only if no cache
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }))
    }

    // Fetch fresh data (will use cache internally if available)
    fetchStockQuote(normalizedSymbol, { useCache: true })
      .then((quote: StockQuote) => {
        setState({
          data: quote,
          isLoading: false,
          error: null,
          hasFetched: true,
        })
      })
      .catch((error: Error) => {
        // If we have cached data, keep it even if fetch fails
        if (cachedData) {
          setState({
            data: cachedData,
            isLoading: false,
            error: null, // Don't show error if we have cached data
            hasFetched: true,
          })
        } else {
          setState({
            data: null,
            isLoading: false,
            error,
            hasFetched: true,
          })
        }
      })
  }, [symbol]) // Re-fetch when symbol changes

  return state
}

