/**
 * Cache Utilities - Response caching with TTL support
 * 
 * Features:
 * - Simple in-memory cache with TTL (Time To Live)
 * - Cache key generation utilities
 * - Cache invalidation helpers
 * - LRU (Least Recently Used) eviction
 * - React Query integration helpers
 * - Storage persistence option
 */

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

export interface CacheOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum number of entries (default: 100) */
  maxSize?: number;
  /** Enable LRU eviction (default: true) */
  lruEviction?: boolean;
  /** Storage key for persistence (optional) */
  storageKey?: string;
  /** Use sessionStorage instead of localStorage */
  useSessionStorage?: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

// ============================================================================
// Cache Class
// ============================================================================

export class Cache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttl: number;
  private readonly maxSize: number;
  private readonly lruEviction: boolean;
  private readonly storageKey?: string;
  private readonly storage?: Storage;
  
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 100;
    this.lruEviction = options.lruEviction ?? true;
    this.storageKey = options.storageKey;

    // Setup storage if available
    if (options.storageKey && typeof window !== 'undefined') {
      this.storage = options.useSessionStorage ? sessionStorage : localStorage;
      this.loadFromStorage();
    }
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      this.saveToStorage();
      return undefined;
    }

    // Update access metadata
    entry.accessedAt = Date.now();
    entry.accessCount++;
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, customTtl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const now = Date.now();
    const ttl = customTtl ?? this.ttl;

    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
    });

    this.saveToStorage();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) this.saveToStorage();
    return deleted;
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) this.saveToStorage();
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestEntry === null || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (newestEntry === null || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Get all valid (non-expired) keys
   */
  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) this.saveToStorage();
    return count;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, customTtl);
    return value;
  }

  /**
   * Evict entries based on LRU or oldest
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    if (this.lruEviction) {
      // Find least recently used
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.accessedAt < lruTime) {
          lruTime = entry.accessedAt;
          lruKey = key;
        }
      }

      if (lruKey) this.cache.delete(lruKey);
    } else {
      // Delete oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  /**
   * Save cache to storage
   */
  private saveToStorage(): void {
    if (!this.storage || !this.storageKey) return;

    try {
      const data = Array.from(this.cache.entries());
      this.storage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Storage might be full or disabled
      console.warn('Failed to save cache to storage');
    }
  }

  /**
   * Load cache from storage
   */
  private loadFromStorage(): void {
    if (!this.storage || !this.storageKey) return;

    try {
      const data = this.storage.getItem(this.storageKey);
      if (data) {
        const entries: [string, CacheEntry<T>][] = JSON.parse(data);
        const now = Date.now();

        // Only restore non-expired entries
        for (const [key, entry] of entries) {
          if (now <= entry.expiresAt) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch {
      // Invalid data or storage disabled
      console.warn('Failed to load cache from storage');
    }
  }
}

// ============================================================================
// Cache Key Utilities
// ============================================================================

/**
 * Generate a cache key from multiple parts
 */
export function createCacheKey(...parts: (string | number | boolean | null | undefined)[]): string {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .map(String)
    .join(':');
}

/**
 * Generate a cache key from an object
 */
export function objectToCacheKey(obj: Record<string, unknown>, sortKeys = true): string {
  const keys = sortKeys ? Object.keys(obj).sort() : Object.keys(obj);
  const parts = keys
    .filter((key) => obj[key] !== undefined && obj[key] !== null)
    .map((key) => `${key}=${JSON.stringify(obj[key])}`);
  return parts.join('&');
}

/**
 * Generate a hash from a string (for shorter keys)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a namespaced cache key generator
 */
export function createKeyGenerator(namespace: string) {
  return (...parts: (string | number | boolean | null | undefined)[]): string => {
    return createCacheKey(namespace, ...parts);
  };
}

// ============================================================================
// React Query Integration
// ============================================================================

/**
 * Create cache options compatible with React Query
 */
export interface QueryCacheOptions {
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Cache time in milliseconds */
  cacheTime?: number;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Refetch on mount */
  refetchOnMount?: boolean;
  /** Refetch on reconnect */
  refetchOnReconnect?: boolean;
}

export function createQueryCacheOptions(ttlMs: number): QueryCacheOptions {
  return {
    staleTime: ttlMs,
    cacheTime: ttlMs * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  };
}

/**
 * Common cache configurations
 */
export const cacheConfigs = {
  /** Very short cache (30 seconds) - for rapidly changing data */
  veryShort: createQueryCacheOptions(30 * 1000),
  
  /** Short cache (2 minutes) - for somewhat dynamic data */
  short: createQueryCacheOptions(2 * 60 * 1000),
  
  /** Medium cache (5 minutes) - default for most data */
  medium: createQueryCacheOptions(5 * 60 * 1000),
  
  /** Long cache (15 minutes) - for stable data */
  long: createQueryCacheOptions(15 * 60 * 1000),
  
  /** Very long cache (1 hour) - for rarely changing data */
  veryLong: createQueryCacheOptions(60 * 60 * 1000),
  
  /** Static cache (24 hours) - for essentially static data */
  static: createQueryCacheOptions(24 * 60 * 60 * 1000),
} as const;

// ============================================================================
// Global Cache Instances
// ============================================================================

/** API response cache */
export const apiCache = new Cache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storageKey: 'api-cache',
});

/** UI state cache (session only) */
export const uiCache = new Cache({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 50,
  storageKey: 'ui-cache',
  useSessionStorage: true,
});

/** Search results cache */
export const searchCache = new Cache({
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 20,
});

// ============================================================================
// Cache Invalidation Utilities
// ============================================================================

/**
 * Invalidate cache entries by tag/pattern
 */
export function invalidateByTag(tag: string, ...caches: Cache[]): void {
  const pattern = new RegExp(`\\b${tag}\\b`);
  for (const cache of caches) {
    cache.deletePattern(pattern);
  }
}

/**
 * Invalidate all caches
 */
export function invalidateAll(...caches: Cache[]): void {
  for (const cache of caches) {
    cache.clear();
  }
}

/**
 * Prune expired entries from all caches
 */
export function pruneAll(...caches: Cache[]): number {
  return caches.reduce((total, cache) => total + cache.prune(), 0);
}

// ============================================================================
// Request Deduplication
// ============================================================================

const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent requests with the same key
 */
export async function dedupeRequest<T>(
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  // Return existing request if pending
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  // Create new request
  const request = factory().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, request);
  return request;
}

/**
 * Combined cache + deduplication
 */
export async function cachedRequest<T>(
  cache: Cache<T>,
  key: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Dedupe and cache
  return dedupeRequest(key, async () => {
    const result = await factory();
    cache.set(key, result, ttl);
    return result;
  });
}

export default Cache;
