/**
 * Value Formatter Utilities
 * 
 * Utilities for formatting values based on type (currency, percentage, number, raw)
 */

/**
 * Supported format types for field values
 */
export type FormatType = 'currency' | 'percentage' | 'number' | 'raw'

/**
 * Currency options for formatting
 */
export type Currency = 'USD' | 'INR' | 'EUR'

/**
 * Format a value based on the specified format type
 * 
 * @param value - The value to format (can be number, string, Date, etc.)
 * @param formatType - The format type to apply
 * @param currency - Optional currency code (default: 'USD')
 * @returns Formatted string representation of the value
 * 
 * @example
 * ```typescript
 * formatValue(1234.56, 'currency') // Returns: '$1,234.56'
 * formatValue(0.125, 'percentage') // Returns: '12.5%'
 * formatValue(1234.56, 'number') // Returns: '1,234.56'
 * formatValue(1234.56, 'raw') // Returns: '1234.56'
 * ```
 */
export function formatValue(
  value: unknown,
  formatType: FormatType = 'raw',
  currency: Currency = 'USD'
): string {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return 'N/A'
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toLocaleString()
  }

  // Handle non-numeric values for non-raw formats
  if (formatType !== 'raw' && typeof value !== 'number') {
    // Try to parse as number
    const parsed = parseFloat(String(value))
    if (isNaN(parsed)) {
      // If can't parse as number, return as string
      return String(value)
    }
    value = parsed
  }

  // Format based on type
  switch (formatType) {
    case 'currency':
      return formatCurrency(value as number, currency)
    
    case 'percentage':
      return formatPercentage(value as number)
    
    case 'number':
      return formatNumber(value as number)
    
    case 'raw':
    default:
      return String(value)
  }
}

/**
 * Format a number as currency
 * 
 * @param value - The number to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
function formatCurrency(value: number, currency: Currency = 'USD'): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A'
  }

  const currencyMap: Record<Currency, { code: string; symbol: string; locale: string }> = {
    USD: { code: 'USD', symbol: '$', locale: 'en-US' },
    INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
    EUR: { code: 'EUR', symbol: '€', locale: 'en-EU' },
  }

  const config = currencyMap[currency] || currencyMap.USD

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch (error) {
    // Fallback to simple formatting
    return `${config.symbol}${value.toFixed(2)}`
  }
}

/**
 * Format a number as percentage
 * 
 * @param value - The number to format (can be decimal like 0.125 or whole like 12.5)
 * @returns Formatted percentage string
 */
function formatPercentage(value: number): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A'
  }

  // If value is between 0 and 1 (or -1 and 0), treat as decimal and multiply by 100
  // Otherwise, assume it's already a percentage value
  const percentageValue = Math.abs(value) <= 1 ? value * 100 : value

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(percentageValue / 100)
  } catch (error) {
    // Fallback to simple formatting
    return `${percentageValue.toFixed(2)}%`
  }
}

/**
 * Format a number with commas (thousands separator)
 * 
 * @param value - The number to format
 * @returns Formatted number string with commas
 */
function formatNumber(value: number): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'N/A'
  }

  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch (error) {
    // Fallback to simple formatting
    return value.toLocaleString()
  }
}

/**
 * Get default format type for a field based on its name
 * This provides sensible defaults but can be overridden by user selection
 * 
 * @param fieldName - The field name/path
 * @returns Suggested format type
 */
export function getDefaultFormatType(fieldName: string): FormatType {
  const lowerFieldName = fieldName.toLowerCase()

  // Price-related fields
  if (
    lowerFieldName.includes('price') ||
    lowerFieldName.includes('open') ||
    lowerFieldName.includes('high') ||
    lowerFieldName.includes('low') ||
    lowerFieldName.includes('close') ||
    lowerFieldName.includes('amount') ||
    lowerFieldName.includes('value')
  ) {
    return 'currency'
  }

  // Percentage-related fields
  if (
    lowerFieldName.includes('percent') ||
    lowerFieldName.includes('change') ||
    lowerFieldName.includes('ratio') ||
    lowerFieldName.includes('rate')
  ) {
    return 'percentage'
  }

  // Volume and count fields
  if (
    lowerFieldName.includes('volume') ||
    lowerFieldName.includes('count') ||
    lowerFieldName.includes('quantity')
  ) {
    return 'number'
  }

  // Default to raw for everything else
  return 'raw'
}








