/**
 * Cache Manager
 * 
 * Client-side caching utility with in-memory + localStorage strategy.
 * Supports TTL (time-to-live) for cache expiration.
 * 
 * Features:
 * - In-memory cache for fast access
 * - localStorage persistence across page reloads
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 */

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T
  
  /** Timestamp when cache entry expires (milliseconds since epoch) */
  expiresAt: number
  
  /** Timestamp when cache entry was created */
  createdAt: number
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number
  
  /** localStorage key prefix (default: 'finance-dashboard-cache') */
  storageKeyPrefix?: string
}

/**
 * Cache Manager Class
 * 
 * Manages both in-memory and localStorage caching with TTL support.
 */
class CacheManager {
  private memoryCache: Map<string, CacheEntry<unknown>>
  private defaultTTL: number
  private storageKeyPrefix: string

  constructor(config: CacheConfig = {}) {
    this.memoryCache = new Map()
    this.defaultTTL = config.defaultTTL ?? 5 * 60 * 1000 // 5 minutes default
    this.storageKeyPrefix = config.storageKeyPrefix ?? 'finance-dashboard-cache'

    // Load cache from localStorage on initialization
    this.loadFromStorage()
    
    // Clean up expired entries periodically
    this.startCleanupInterval()
  }

  /**
   * Generate cache key from parts
   * 
   * @param apiName - API provider name (e.g., "alpha-vantage")
   * @param widgetType - Widget type (e.g., "stock-price")
   * @param symbol - Symbol or identifier (e.g., "AAPL")
   * @returns Cache key string
   */
  generateKey(apiName: string, widgetType: string, symbol: string, ...parts: string[]): string {
    const suffix = parts && parts.length > 0 ? `:${parts.join(':')}` : ''
    return `${apiName}:${widgetType}:${symbol.toUpperCase()}${suffix}`
  }

  /**
   * Get cached data
   * 
   * @param key - Cache key
   * @returns Cached data if valid, null if expired or not found
   */
  get<T>(key: string): T | null {
    // Check in-memory cache first
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined
    
    if (memoryEntry) {
      if (this.isExpired(memoryEntry)) {
        // Remove expired entry
        this.memoryCache.delete(key)
        this.removeFromStorage(key)
        return null
      }
      return memoryEntry.data
    }

    // Check localStorage
    const storageEntry = this.getFromStorage<T>(key)
    
    if (storageEntry) {
      if (this.isExpired(storageEntry)) {
        // Remove expired entry
        this.removeFromStorage(key)
        return null
      }
      
      // Restore to memory cache for faster access
      this.memoryCache.set(key, storageEntry)
      return storageEntry.data
    }

    return null
  }

  /**
   * Set cached data
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time-to-live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL)
    const entry: CacheEntry<T> = {
      data,
      expiresAt,
      createdAt: Date.now(),
    }

    // Store in memory
    this.memoryCache.set(key, entry)

    // Store in localStorage
    try {
      const storageKey = this.getStorageKey(key)
      localStorage.setItem(storageKey, JSON.stringify(entry))
    } catch (error) {
      // localStorage might be full or unavailable
      // Silently fail - memory cache will still work
      console.warn('Failed to persist cache to localStorage:', error)
    }
  }

  /**
   * Remove cached data
   * 
   * @param key - Cache key
   */
  remove(key: string): void {
    this.memoryCache.delete(key)
    this.removeFromStorage(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear()
    this.clearStorage()
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * Get storage key for localStorage
   */
  private getStorageKey(key: string): string {
    return `${this.storageKeyPrefix}:${key}`
  }

  /**
   * Get data from localStorage
   */
  private getFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const storageKey = this.getStorageKey(key)
      const item = localStorage.getItem(storageKey)
      
      if (!item) {
        return null
      }

      return JSON.parse(item) as CacheEntry<T>
    } catch (error) {
      // Invalid JSON or localStorage unavailable
      return null
    }
  }

  /**
   * Remove data from localStorage
   */
  private removeFromStorage(key: string): void {
    try {
      const storageKey = this.getStorageKey(key)
      localStorage.removeItem(storageKey)
    } catch (error) {
      // localStorage might be unavailable
      // Silently fail
    }
  }

  /**
   * Load all cache entries from localStorage
   */
  private loadFromStorage(): void {
    try {
      const keys = Object.keys(localStorage)
      const prefix = this.storageKeyPrefix + ':'
      
      for (const storageKey of keys) {
        if (storageKey.startsWith(prefix)) {
          const key = storageKey.replace(prefix, '')
          const entry = this.getFromStorage(key)
          
          if (entry && !this.isExpired(entry)) {
            this.memoryCache.set(key, entry)
          } else {
            // Remove expired entries
            this.removeFromStorage(key)
          }
        }
      }
    } catch (error) {
      // localStorage might be unavailable
      // Silently fail - memory cache will still work
    }
  }

  /**
   * Clear all cache from localStorage
   */
  private clearStorage(): void {
    try {
      const keys = Object.keys(localStorage)
      const prefix = this.storageKeyPrefix + ':'
      
      for (const storageKey of keys) {
        if (storageKey.startsWith(prefix)) {
          localStorage.removeItem(storageKey)
        }
      }
    } catch (error) {
      // localStorage might be unavailable
      // Silently fail
    }
  }

  /**
   * Clean up expired entries periodically
   */
  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    setInterval(() => {
      const now = Date.now()
      
      // Clean memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now > entry.expiresAt) {
          this.memoryCache.delete(key)
          this.removeFromStorage(key)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes
  }
}

// Export singleton instance
export const cacheManager = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes default TTL
  storageKeyPrefix: 'finance-dashboard-cache',
})

// Export types
export type { CacheConfig, CacheEntry }

