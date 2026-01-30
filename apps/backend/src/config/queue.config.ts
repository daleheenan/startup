/**
 * Queue Worker Configuration
 * Centralised constants for job queue processing
 */
export const QueueConfig = {
  /** Interval between queue polls in milliseconds */
  POLL_INTERVAL_MS: 1000,

  /** Maximum time to wait for graceful shutdown in milliseconds */
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 60000,

  /** Maximum retry attempts before marking job as failed */
  MAX_JOB_RETRY_ATTEMPTS: 3,

  /** Fallback wait time when rate limit detection fails (30 minutes) */
  RATE_LIMIT_FALLBACK_WAIT_MS: 30 * 60 * 1000,
} as const;
