/**
 * Query Performance Monitor
 *
 * Provides query execution monitoring with:
 * - Execution time measurement
 * - Slow query detection and logging
 * - Statistics tracking (count, average time, slow queries)
 * - Integration with the logger service
 *
 * This follows the Decorator pattern, wrapping database operations
 * to add monitoring capabilities without modifying the core database code.
 */

import { createLogger } from '../services/logger.service.js';

const logger = createLogger('db:query-monitor');

/**
 * Configuration for query monitoring
 */
export interface QueryMonitorConfig {
  /** Threshold in milliseconds for slow query warnings */
  slowQueryThresholdMs: number;
  /** Whether to log all queries (not just slow ones) */
  logAllQueries: boolean;
  /** Maximum query length to log (truncates longer queries) */
  maxQueryLogLength: number;
  /** Whether monitoring is enabled */
  enabled: boolean;
}

/**
 * Statistics about query execution
 */
export interface QueryStatistics {
  /** Total number of queries executed */
  totalQueries: number;
  /** Number of slow queries (exceeding threshold) */
  slowQueries: number;
  /** Total execution time across all queries */
  totalExecutionTimeMs: number;
  /** Average query execution time */
  averageExecutionTimeMs: number;
  /** Fastest query execution time */
  minExecutionTimeMs: number;
  /** Slowest query execution time */
  maxExecutionTimeMs: number;
  /** Queries by type (SELECT, INSERT, UPDATE, DELETE, etc.) */
  queryTypeCounts: Record<string, number>;
  /** Recent slow queries for debugging */
  recentSlowQueries: SlowQueryRecord[];
}

/**
 * Record of a slow query for debugging
 */
export interface SlowQueryRecord {
  query: string;
  executionTimeMs: number;
  timestamp: Date;
}

/**
 * Result of a monitored query execution
 */
export interface QueryExecutionResult<T> {
  result: T;
  executionTimeMs: number;
  isSlow: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: QueryMonitorConfig = {
  slowQueryThresholdMs: 100,
  logAllQueries: false,
  maxQueryLogLength: 200,
  enabled: process.env.NODE_ENV !== 'test',
};

/**
 * Query Performance Monitor
 *
 * Wraps database operations to monitor performance.
 * Singleton pattern ensures consistent statistics across the application.
 */
export class QueryMonitor {
  private config: QueryMonitorConfig;
  private stats: QueryStatistics;
  private readonly maxRecentSlowQueries = 20;

  constructor(config: Partial<QueryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.createInitialStats();
  }

  /**
   * Create initial statistics object
   */
  private createInitialStats(): QueryStatistics {
    return {
      totalQueries: 0,
      slowQueries: 0,
      totalExecutionTimeMs: 0,
      averageExecutionTimeMs: 0,
      minExecutionTimeMs: Infinity,
      maxExecutionTimeMs: 0,
      queryTypeCounts: {},
      recentSlowQueries: [],
    };
  }

  /**
   * Extract query type from SQL statement
   */
  private extractQueryType(sql: string): string {
    const trimmed = sql.trim().toUpperCase();
    const match = trimmed.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|BEGIN|COMMIT|ROLLBACK|PRAGMA)/);
    return match ? match[1] : 'OTHER';
  }

  /**
   * Truncate query for logging
   */
  private truncateQuery(sql: string): string {
    if (sql.length <= this.config.maxQueryLogLength) {
      return sql;
    }
    return sql.substring(0, this.config.maxQueryLogLength) + '...';
  }

  /**
   * Record query execution statistics
   */
  private recordExecution(sql: string, executionTimeMs: number): void {
    if (!this.config.enabled) return;

    this.stats.totalQueries++;
    this.stats.totalExecutionTimeMs += executionTimeMs;
    this.stats.averageExecutionTimeMs = this.stats.totalExecutionTimeMs / this.stats.totalQueries;

    if (executionTimeMs < this.stats.minExecutionTimeMs) {
      this.stats.minExecutionTimeMs = executionTimeMs;
    }
    if (executionTimeMs > this.stats.maxExecutionTimeMs) {
      this.stats.maxExecutionTimeMs = executionTimeMs;
    }

    // Count by query type
    const queryType = this.extractQueryType(sql);
    this.stats.queryTypeCounts[queryType] = (this.stats.queryTypeCounts[queryType] || 0) + 1;

    // Handle slow queries
    const isSlow = executionTimeMs > this.config.slowQueryThresholdMs;
    if (isSlow) {
      this.stats.slowQueries++;

      // Add to recent slow queries
      this.stats.recentSlowQueries.unshift({
        query: this.truncateQuery(sql),
        executionTimeMs,
        timestamp: new Date(),
      });

      // Keep only recent slow queries
      if (this.stats.recentSlowQueries.length > this.maxRecentSlowQueries) {
        this.stats.recentSlowQueries = this.stats.recentSlowQueries.slice(0, this.maxRecentSlowQueries);
      }

      // Log warning for slow query
      logger.warn({
        query: this.truncateQuery(sql),
        executionTimeMs,
        thresholdMs: this.config.slowQueryThresholdMs,
      }, 'Slow query detected');
    } else if (this.config.logAllQueries) {
      logger.debug({
        query: this.truncateQuery(sql),
        executionTimeMs,
      }, 'Query executed');
    }
  }

  /**
   * Wrap a synchronous database operation with monitoring
   */
  wrapSync<T>(sql: string, operation: () => T): QueryExecutionResult<T> {
    if (!this.config.enabled) {
      return {
        result: operation(),
        executionTimeMs: 0,
        isSlow: false,
      };
    }

    const startTime = performance.now();
    const result = operation();
    const executionTimeMs = performance.now() - startTime;

    this.recordExecution(sql, executionTimeMs);

    return {
      result,
      executionTimeMs,
      isSlow: executionTimeMs > this.config.slowQueryThresholdMs,
    };
  }

  /**
   * Wrap an async database operation with monitoring
   */
  async wrapAsync<T>(sql: string, operation: () => Promise<T>): Promise<QueryExecutionResult<T>> {
    if (!this.config.enabled) {
      return {
        result: await operation(),
        executionTimeMs: 0,
        isSlow: false,
      };
    }

    const startTime = performance.now();
    const result = await operation();
    const executionTimeMs = performance.now() - startTime;

    this.recordExecution(sql, executionTimeMs);

    return {
      result,
      executionTimeMs,
      isSlow: executionTimeMs > this.config.slowQueryThresholdMs,
    };
  }

  /**
   * Execute a callback and measure its execution time
   * Useful for measuring non-SQL operations
   */
  measure<T>(label: string, operation: () => T): T {
    if (!this.config.enabled) {
      return operation();
    }

    const startTime = performance.now();
    const result = operation();
    const executionTimeMs = performance.now() - startTime;

    if (executionTimeMs > this.config.slowQueryThresholdMs) {
      logger.warn({
        label,
        executionTimeMs,
        thresholdMs: this.config.slowQueryThresholdMs,
      }, 'Slow operation detected');
    } else if (this.config.logAllQueries) {
      logger.debug({
        label,
        executionTimeMs,
      }, 'Operation measured');
    }

    return result;
  }

  /**
   * Get current statistics
   */
  getStatistics(): QueryStatistics {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = this.createInitialStats();
    logger.info('Query statistics reset');
  }

  /**
   * Get summary statistics for logging
   */
  getSummary(): {
    totalQueries: number;
    slowQueries: number;
    slowQueryPercentage: number;
    averageExecutionTimeMs: number;
  } {
    return {
      totalQueries: this.stats.totalQueries,
      slowQueries: this.stats.slowQueries,
      slowQueryPercentage: this.stats.totalQueries > 0
        ? (this.stats.slowQueries / this.stats.totalQueries) * 100
        : 0,
      averageExecutionTimeMs: Math.round(this.stats.averageExecutionTimeMs * 100) / 100,
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<QueryMonitorConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info({ config: this.config }, 'Query monitor configured');
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable monitoring
   */
  enable(): void {
    this.config.enabled = true;
    logger.info('Query monitoring enabled');
  }

  /**
   * Disable monitoring
   */
  disable(): void {
    this.config.enabled = false;
    logger.info('Query monitoring disabled');
  }

  /**
   * Get slow query threshold
   */
  getSlowQueryThreshold(): number {
    return this.config.slowQueryThresholdMs;
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(thresholdMs: number): void {
    this.config.slowQueryThresholdMs = thresholdMs;
    logger.info({ thresholdMs }, 'Slow query threshold updated');
  }

  /**
   * Log current statistics summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    logger.info({
      ...summary,
      queryTypes: this.stats.queryTypeCounts,
      minExecutionTimeMs: this.stats.minExecutionTimeMs === Infinity ? 0 : this.stats.minExecutionTimeMs,
      maxExecutionTimeMs: this.stats.maxExecutionTimeMs,
    }, 'Query monitor summary');
  }
}

// Export singleton instance
export const queryMonitor = new QueryMonitor();

/**
 * Create a monitored database wrapper
 * Factory function for creating database wrappers with monitoring
 */
export function createMonitoredDb<T extends object>(
  db: T,
  queryMethodNames: string[] = ['prepare', 'exec']
): T {
  const proxy = new Proxy(db, {
    get(target, prop) {
      const value = (target as any)[prop];

      if (typeof value === 'function' && queryMethodNames.includes(prop as string)) {
        return function (...args: any[]) {
          const sql = typeof args[0] === 'string' ? args[0] : 'unknown';
          const { result } = queryMonitor.wrapSync(sql, () => value.apply(target, args));
          return result;
        };
      }

      return value;
    },
  });

  return proxy as T;
}
