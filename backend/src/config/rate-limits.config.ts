/**
 * Rate Limiting Configuration
 * Security-critical values for request throttling
 */
export const RateLimitConfig = {
  AUTH: {
    /** Window size for auth rate limiting (15 minutes) */
    WINDOW_MS: 15 * 60 * 1000,
    /** Maximum auth attempts per window */
    MAX_REQUESTS: 10,
  },
  API: {
    /** Window size for API rate limiting (1 minute) */
    WINDOW_MS: 1 * 60 * 1000,
    /** Maximum API requests per window */
    MAX_REQUESTS: 100,
  },
} as const;
