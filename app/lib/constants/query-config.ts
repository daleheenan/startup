/**
 * React Query Configuration
 * Centralised caching and retry settings
 */
export const QueryConfig = {
  /** Default stale time (5 minutes) */
  STALE_TIME_DEFAULT: 5 * 60 * 1000,

  /** Fast stale time for critical data (30 seconds) */
  STALE_TIME_FAST: 30 * 1000,

  /** Default garbage collection time (30 minutes) */
  GC_TIME_DEFAULT: 30 * 60 * 1000,

  /** Default retry count */
  RETRY_DEFAULT: 2,

  /** Minimal retry count */
  RETRY_MINIMAL: 1,
} as const;
