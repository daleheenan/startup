/**
 * Rate Limiting Configuration
 *
 * Centralised rate limit settings for different endpoint types.
 * Adjust these values based on your application's needs.
 */

/**
 * Rate limit configuration for different endpoint categories
 */
export const RateLimitConfig = {
  /**
   * Authentication endpoints (login, register, password reset)
   * Stricter limits to prevent brute force attacks
   */
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
      error: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterMs: 15 * 60 * 1000,
    },
  },

  /**
   * General API endpoints
   * More lenient for normal operations
   */
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      error: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterMs: 60 * 1000,
    },
  },

  /**
   * Resource-intensive operations (AI, file processing, etc.)
   * Very strict limits due to high cost
   */
  expensive: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: {
      error: 'Too many resource-intensive requests. Please wait.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterMs: 60 * 1000,
    },
  },

  /**
   * Health check endpoints
   * Very high limit - these should always work
   */
  health: {
    windowMs: 60 * 1000,
    max: 1000,
    message: {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
};

/**
 * Standard headers to include in rate limit responses
 */
export const RateLimitHeaders = {
  // Send standard headers
  standardHeaders: true,
  // Disable legacy X-RateLimit headers
  legacyHeaders: false,
};
