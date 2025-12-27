'use client'

import { fetchWithFallback } from '@/lib/api/providers/fallback'
import type { NormalizedStockData } from '@/lib/api/providers/types'
import { cacheManager } from '@/lib/cache/cacheManager'
import { useEffect, useRef, useState } from 'react'

export interface TableRow {
  symbol: string
  data: NormalizedStockData | null
  rawResponse: unknown | null
  error?: string | null
}

export interface UseTableDataOptions {
  symbols: string[]
  refreshInterval?: number | null
}

export function useTableData({ symbols, refreshInterval = 30000 }: UseTableDataOptions) {
  const [rows, setRows] = useState<TableRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  async function fetchAll() {
    if (!symbols || symbols.length === 0) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    const results: TableRow[] = []

    for (const symbol of symbols) {
      const normalizedSymbol = symbol.trim().toUpperCase()

      // Try cache first (generic multi-provider key)
      const cacheKey = cacheManager.generateKey('multi-provider', 'stock-price', normalizedSymbol)
      const cached = cacheManager.get<any>(cacheKey)

      if (cached) {
        results.push({ symbol: normalizedSymbol, data: cached, rawResponse: null, error: null })
        continue
      }

      try {
        const { normalized, rawResponse, provider } = await fetchWithFallback(normalizedSymbol)

        // Cache provider-specific result
        const providerCacheKey = cacheManager.generateKey(provider, 'stock-price', normalizedSymbol)
        const cacheTTL = 5 * 60 * 1000
        cacheManager.set(providerCacheKey, normalized, cacheTTL)

        // Also set multi-provider key for quick initial reads
        cacheManager.set(cacheKey, normalized, cacheTTL)

        results.push({ symbol: normalizedSymbol, data: normalized, rawResponse, error: null })
      } catch (err: any) {
        results.push({ symbol: normalizedSymbol, data: null, rawResponse: null, error: err?.message || 'Fetch error' })
      }
    }

    if (mountedRef.current) {
      setRows(results)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchAll()

    // Setup interval (enforce minimum 60s to avoid rate limits)
    const effectiveRefresh = refreshInterval && refreshInterval > 0 ? Math.max(refreshInterval, 60000) : null
    if (effectiveRefresh && effectiveRefresh > 0) {
      intervalRef.current = setInterval(() => {
        fetchAll()
      }, effectiveRefresh)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(symbols), refreshInterval])

  return { rows, isLoading, error, refetch: fetchAll }
}
