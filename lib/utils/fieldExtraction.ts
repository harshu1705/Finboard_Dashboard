/**
 * Field Extraction Utilities
 * 
 * Utilities for extracting and flattening fields from API responses
 * using dot notation for nested objects.
 */

/**
 * Flattens a nested object into a flat object with dot notation keys
 * 
 * @param obj - The object to flatten
 * @param prefix - Optional prefix for keys (used recursively)
 * @returns A flat object with dot-notation keys
 * 
 * @example
 * ```typescript
 * flattenObject({ a: { b: 1, c: { d: 2 } } })
 * // Returns: { 'a.b': 1, 'a.c.d': 2 }
 * ```
 */
export function flattenObject(
  obj: unknown,
  prefix: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (obj === null || obj === undefined) {
    return result
  }

  // Handle arrays - include index in path
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const key = prefix ? `${prefix}[${index}]` : `[${index}]`
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Recursively flatten nested objects in arrays
        Object.assign(result, flattenObject(item, key))
      } else {
        result[key] = item
      }
    })
    return result
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    if (prefix) {
      result[prefix] = obj
    }
    return result
  }

  // Handle objects
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value === null || value === undefined) {
      result[newKey] = value
    } else if (Array.isArray(value)) {
      // Handle arrays
      value.forEach((item, index) => {
        const arrayKey = `${newKey}[${index}]`
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          Object.assign(result, flattenObject(item, arrayKey))
        } else {
          result[arrayKey] = item
        }
      })
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects
      Object.assign(result, flattenObject(value, newKey))
    } else {
      // Primitive value
      result[newKey] = value
    }
  }

  return result
}

/**
 * Extracts all available field paths from an API response
 * 
 * @param response - The API response object
 * @returns Array of field paths (keys) sorted alphabetically
 * 
 * @example
 * ```typescript
 * extractFields({ price: 100, meta: { symbol: 'AAPL' } })
 * // Returns: ['meta.symbol', 'price']
 * ```
 */
export function extractFields(response: unknown): string[] {
  if (!response || typeof response !== 'object') {
    return []
  }

  const flattened = flattenObject(response)
  const fields = Object.keys(flattened).sort()
  return fields
}

/**
 * Gets a value from a nested object using dot notation path
 * 
 * @param obj - The object to get value from
 * @param path - Dot notation path (e.g., 'meta.symbol' or 'data[0].price')
 * @returns The value at the path, or undefined if not found
 * 
 * @example
 * ```typescript
 * getNestedValue({ a: { b: 1 } }, 'a.b')
 * // Returns: 1
 * 
 * getNestedValue({ data: [{ price: 100 }] }, 'data[0].price')
 * // Returns: 100
 * ```
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object' || !path) {
    return undefined
  }

  // Handle array indices in path (e.g., 'data[0].price')
  const parts = path.split(/[\.\[\]]/).filter(Boolean)

  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (Array.isArray(current)) {
      const index = parseInt(part, 10)
      if (isNaN(index) || index < 0 || index >= current.length) {
        return undefined
      }
      current = current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Formats a field path into a user-friendly label
 * 
 * @param path - The field path (e.g., 'Global Quote.05. price')
 * @returns A formatted label (e.g., 'Price')
 * 
 * @example
 * ```typescript
 * formatFieldLabel('Global Quote.05. price')
 * // Returns: 'Price'
 * 
 * formatFieldLabel('data[0].high')
 * // Returns: 'High'
 * ```
 */
export function formatFieldLabel(path: string): string {
  // Remove array indices and common prefixes
  let label = path
    .replace(/\[.*?\]/g, '') // Remove array indices
    .split('.')
    .pop() || path // Get last part

  // Remove numeric prefixes (e.g., '05. price' -> 'price')
  label = label.replace(/^\d+\.\s*/, '')

  // Capitalize first letter and replace underscores/dashes with spaces
  label = label
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  return label.trim() || path
}

