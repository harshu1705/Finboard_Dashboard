'use client'

import { useState, useEffect } from 'react'
import { fetchStockQuote } from '@/lib/api/alphaVantageClient'
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

    // Set loading state
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }))

    // Fetch stock quote
    fetchStockQuote(normalizedSymbol)
      .then((quote: StockQuote) => {
        setState({
          data: quote,
          isLoading: false,
          error: null,
          hasFetched: true,
        })
      })
      .catch((error: Error) => {
        setState({
          data: null,
          isLoading: false,
          error,
          hasFetched: true,
        })
      })
  }, [symbol]) // Re-fetch when symbol changes

  return state
}

