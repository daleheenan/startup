/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides fault tolerance for external API calls (primarily Claude API).
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit is tripped, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service has recovered
 *
 * The circuit opens after consecutive failures exceed threshold.
 * After a timeout period, it moves to half-open to test recovery.
 * If test succeeds, it closes; if it fails, it opens again.
 */

import { createLogger } from './logger.service.js';
import { EventEmitter } from 'events';

const logger = createLogger('services:circuit-breaker');

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

/**
 * Configuration options for circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Number of successes needed to close circuit from half-open */
  successThreshold: number;
  /** Timeout in ms before moving from OPEN to HALF_OPEN */
  timeout: number;
  /** Whether to enable the circuit breaker */
  enabled: boolean;
  /** Name for logging purposes */
  name: string;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  stateChangedAt: Date;
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  public readonly state: CircuitState;
  public readonly timeUntilRetry: number;

  constructor(message: string, timeUntilRetry: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.state = CircuitState.OPEN;
    this.timeUntilRetry = timeUntilRetry;
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  enabled: true,
  name: 'default',
};

/**
 * Circuit Breaker
 *
 * Implements the circuit breaker pattern for fault-tolerant API calls.
 * Emits events for state changes and can be monitored for health checks.
 */
export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private stateChangedAt: Date = new Date();
  private nextAttemptTime: Date | null = null;

  // Lifetime statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info({ config: this.config }, `Circuit breaker ${this.config.name} initialized`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
    };
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowing(): boolean {
    if (!this.config.enabled) return true;

    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if timeout has elapsed
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime.getTime()) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN allows requests (to test recovery)
    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.totalRequests++;
    this.totalSuccesses++;
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }

    logger.debug({
      name: this.config.name,
      state: this.state,
      successes: this.successes,
    }, 'Circuit breaker recorded success');
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: Error): void {
    this.totalRequests++;
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = new Date();

    logger.warn({
      name: this.config.name,
      state: this.state,
      failures: this.failures,
      threshold: this.config.failureThreshold,
      error: error?.message,
    }, 'Circuit breaker recorded failure');

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state trips the circuit again
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateChangedAt = new Date();

    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.nextAttemptTime = null;
    } else if (newState === CircuitState.OPEN) {
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      this.successes = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
    }

    logger.info({
      name: this.config.name,
      from: oldState,
      to: newState,
      nextAttemptTime: this.nextAttemptTime?.toISOString(),
    }, 'Circuit breaker state changed');

    // Emit state change event
    this.emit('stateChange', { from: oldState, to: newState });
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - The function to execute
   * @returns The result of the function
   * @throws CircuitOpenError if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    if (!this.isAllowing()) {
      const timeUntilRetry = this.nextAttemptTime
        ? Math.max(0, this.nextAttemptTime.getTime() - Date.now())
        : this.config.timeout;

      throw new CircuitOpenError(
        `Circuit breaker ${this.config.name} is OPEN. Service unavailable.`,
        timeUntilRetry
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Force the circuit to close (for testing/admin)
   */
  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
    logger.info({ name: this.config.name }, 'Circuit breaker force closed');
  }

  /**
   * Force the circuit to open (for testing/admin)
   */
  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
    logger.info({ name: this.config.name }, 'Circuit breaker force opened');
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stateChangedAt = new Date();
    this.nextAttemptTime = null;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;

    logger.info({ name: this.config.name }, 'Circuit breaker reset');
    this.emit('reset');
  }

  /**
   * Check if circuit is healthy (closed)
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Get time until circuit might allow requests again
   * Returns 0 if circuit is not open
   */
  getTimeUntilRetry(): number {
    if (this.state !== CircuitState.OPEN || !this.nextAttemptTime) {
      return 0;
    }
    return Math.max(0, this.nextAttemptTime.getTime() - Date.now());
  }

  /**
   * Update configuration
   */
  configure(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info({ config: this.config }, `Circuit breaker ${this.config.name} reconfigured`);
  }
}

// Create circuit breaker for Claude API
export const claudeCircuitBreaker = new CircuitBreaker({
  name: 'claude-api',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
});

/**
 * Factory function to create a circuit breaker
 */
export function createCircuitBreaker(config: Partial<CircuitBreakerConfig> = {}): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * Decorator function to wrap async functions with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  circuitBreaker: CircuitBreaker
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return circuitBreaker.execute(() => fn(...args));
  }) as T;
}
