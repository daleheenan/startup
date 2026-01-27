/**
 * Server-Sent Events Configuration
 * Connection management for real-time updates
 */
export const SSEConfig = {
  /** Maximum number of SSE listeners */
  MAX_LISTENERS: 100,

  /** Threshold for high connection warning */
  HIGH_CONNECTION_WARNING_THRESHOLD: 90,

  /** Interval for connection monitoring (5 minutes) */
  CONNECTION_MONITOR_INTERVAL_MS: 5 * 60 * 1000,

  /** Force close connections after this time (1 hour) */
  CONNECTION_FORCE_CLOSE_TIMEOUT_MS: 60 * 60 * 1000,
} as const;
