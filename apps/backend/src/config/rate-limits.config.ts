/**
 * Rate Limiting Configuration
 *
 * NOTE: This is a SINGLE-USER application. Rate limiting is disabled by default
 * to prevent "Failed to fetch" errors during normal navigation.
 *
 * Set ENABLE_RATE_LIMITING=true in environment to enable rate limiting
 * (e.g., if exposing to the internet without authentication).
 */
export const RateLimitConfig = {
  /** Master toggle for rate limiting - disabled for single-user sites */
  ENABLED: process.env.ENABLE_RATE_LIMITING === 'true',

  AUTH: {
    /** Window size for auth rate limiting (15 minutes) */
    WINDOW_MS: 15 * 60 * 1000,
    /** Maximum auth attempts per window */
    MAX_REQUESTS: 10,
  },
  API: {
    /** Window size for API rate limiting (1 minute) */
    WINDOW_MS: 1 * 60 * 1000,
    /** Maximum API requests per window - very generous for single-user */
    MAX_REQUESTS: 10000,
  },
} as const;
