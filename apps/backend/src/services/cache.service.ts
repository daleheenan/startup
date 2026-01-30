/**
 * Simple in-memory cache service for API response caching
 * Helps reduce database load and improve response times for static/semi-static data
 */

interface CacheEntry<T> {
  data: T;
  expiry: number; // Unix timestamp in milliseconds
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get a cached value if it exists and hasn't expired
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in the cache with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlSeconds - Time to live in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;

    this.cache.set(key, {
      data,
      expiry,
    });
  }

  /**
   * Invalidate cache entries matching a pattern (prefix match)
   * @param pattern - Key prefix to match (e.g., 'genre-tropes:')
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const cache = new CacheService();
