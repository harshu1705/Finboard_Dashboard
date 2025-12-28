/**
 * Response Normalizer
 * 
 * Normalizes API responses from different providers into a common shape
 * for safe field access and rendering.
 */

/**
 * Normalized API response shape
 * All fields are optional except price (which should always exist)
 */
export interface NormalizedResponse {
  price?: number
  open?: number
  high?: number
  low?: number
  volume?: number
  previousClose?: number
  symbol?: string
  [key: string]: unknown // Allow additional fields
}

/**
 * Normalizes a raw API response into a common shape
 * Handles different provider response formats safely
 * 
 * @param rawResponse - Raw API response from any provider
 * @param normalizedData - Already normalized data from provider (fallback)
 * @returns Normalized response with common field names
 */
export function normalizeApiResponse(
  rawResponse: unknown,
  normalizedData?: {
    price?: number
    open?: number
    high?: number
    low?: number
    previousClose?: number
    symbol?: string
  }
): NormalizedResponse {
  const normalized: NormalizedResponse = {}

  // Start with normalized data if available (most reliable)
  if (normalizedData) {
    if (typeof normalizedData.price === 'number') {
      normalized.price = normalizedData.price
    }
    if (typeof normalizedData.open === 'number') {
      normalized.open = normalizedData.open
    }
    if (typeof normalizedData.high === 'number') {
      normalized.high = normalizedData.high
    }
    if (typeof normalizedData.low === 'number') {
      normalized.low = normalizedData.low
    }
    if (typeof normalizedData.previousClose === 'number') {
      normalized.previousClose = normalizedData.previousClose
    }
    if (normalizedData.symbol) {
      normalized.symbol = normalizedData.symbol
    }
  }

  // Try to extract from raw response if available
  if (rawResponse && typeof rawResponse === 'object') {
    try {
      const response = rawResponse as Record<string, unknown>

      // Handle Alpha Vantage format
      if ('Global Quote' in response) {
        const quote = (response['Global Quote'] as Record<string, unknown>) || {}
        
        // Extract price (required field)
        if (!normalized.price) {
          const priceStr = quote['05. price'] || quote['price']
          if (priceStr) {
            const price = parseFloat(String(priceStr))
            if (!isNaN(price) && isFinite(price)) {
              normalized.price = price
            }
          }
        }

        // Extract other fields
        if (!normalized.open) {
          const openStr = quote['02. open'] || quote['open']
          if (openStr) {
            const open = parseFloat(String(openStr))
            if (!isNaN(open) && isFinite(open)) {
              normalized.open = open
            }
          }
        }

        if (!normalized.high) {
          const highStr = quote['03. high'] || quote['high']
          if (highStr) {
            const high = parseFloat(String(highStr))
            if (!isNaN(high) && isFinite(high)) {
              normalized.high = high
            }
          }
        }

        if (!normalized.low) {
          const lowStr = quote['04. low'] || quote['low']
          if (lowStr) {
            const low = parseFloat(String(lowStr))
            if (!isNaN(low) && isFinite(low)) {
              normalized.low = low
            }
          }
        }

        if (!normalized.previousClose) {
          const prevCloseStr = quote['08. previous close'] || quote['previousClose'] || quote['previous_close']
          if (prevCloseStr) {
            const prevClose = parseFloat(String(prevCloseStr))
            if (!isNaN(prevClose) && isFinite(prevClose)) {
              normalized.previousClose = prevClose
            }
          }
        }

        if (!normalized.symbol) {
          const symbol = quote['01. symbol'] || quote['symbol']
          if (symbol && typeof symbol === 'string') {
            normalized.symbol = symbol
          }
        }

        // Extract volume if available
        const volumeStr = quote['06. volume'] || quote['volume']
        if (volumeStr) {
          const volume = parseFloat(String(volumeStr))
          if (!isNaN(volume) && isFinite(volume)) {
            normalized.volume = volume
          }
        }
      }

      // Handle Finnhub format
      if ('c' in response && typeof response.c === 'number') {
        if (!normalized.price) {
          normalized.price = response.c
        }
        if (!normalized.open && typeof response.o === 'number') {
          normalized.open = response.o
        }
        if (!normalized.high && typeof response.h === 'number') {
          normalized.high = response.h
        }
        if (!normalized.low && typeof response.l === 'number') {
          normalized.low = response.l
        }
        if (!normalized.previousClose && typeof response.pc === 'number') {
          normalized.previousClose = response.pc
        }
      }

      // Handle flat object format (fallback)
      if (!normalized.price && typeof response.price === 'number') {
        normalized.price = response.price
      }
      if (!normalized.open && typeof response.open === 'number') {
        normalized.open = response.open
      }
      if (!normalized.high && typeof response.high === 'number') {
        normalized.high = response.high
      }
      if (!normalized.low && typeof response.low === 'number') {
        normalized.low = response.low
      }
      if (!normalized.previousClose && typeof response.previousClose === 'number') {
        normalized.previousClose = response.previousClose
      }
      if (!normalized.volume && typeof response.volume === 'number') {
        normalized.volume = response.volume
      }
    } catch (error) {
      // Silently fail - we'll use normalized data or show N/A
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Response Normalizer] Failed to extract from raw response:', error)
      }
    }
  }

  return normalized
}

/**
 * Gets a field value from normalized response safely
 * 
 * @param normalized - Normalized response object
 * @param fieldPath - Field path (e.g., 'price', 'open', 'high')
 * @returns Field value or undefined if not found
 */
export function getNormalizedField(
  normalized: NormalizedResponse,
  fieldPath: string
): unknown {
  // Handle simple field names
  if (fieldPath in normalized) {
    return normalized[fieldPath]
  }

  // Handle dot notation (e.g., 'Global Quote.05. price' -> 'price')
  const fieldLower = fieldPath.toLowerCase()
  
  // Map common field patterns
  if (fieldLower.includes('price') || fieldLower.endsWith('.price')) {
    return normalized.price
  }
  if (fieldLower.includes('open')) {
    return normalized.open
  }
  if (fieldLower.includes('high')) {
    return normalized.high
  }
  if (fieldLower.includes('low')) {
    return normalized.low
  }
  if ((fieldLower.includes('previous') && fieldLower.includes('close')) || fieldLower.includes('previousclose')) {
    return normalized.previousClose
  }
  if (fieldLower.includes('volume')) {
    return normalized.volume
  }
  if (fieldLower.includes('symbol')) {
    return normalized.symbol
  }

  return undefined
}











