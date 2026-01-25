/**
 * Circuit Breaker Service
 *
 * Implements the circuit breaker pattern with rolling window failure tracking
 * for protecting external API calls from cascading failures.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit is tripped, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service has recovered
 *
 * Key difference from simple consecutive failure counting:
 * This implementation uses a rolling time window to track failures,
 * so old failures outside the window don't count toward the threshold.
 */

import { createLogger } from './logger.service.js';

const logger = createLogger('services:circuit-breaker');

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject immediately
  HALF_OPEN = 'half_open' // Testing recovery
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  public readonly nextAttemptTime: Date;

  constructor(message: string, nextAttemptTime: Date) {
    super(message);
    this.name = 'CircuitOpenError';
    this.nextAttemptTime = nextAttemptTime;
  }
}

/**
 * Configuration options for circuit breaker
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Number of successes needed to close circuit from half-open (default: 2) */
  successThreshold: number;
  /** Timeout in ms before moving from OPEN to HALF_OPEN (default: 60000) */
  timeout: number;
  /** Rolling window size in ms for failure tracking (default: 60000) */
  windowSize: number;
  /** Name for logging purposes */
  name?: string;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
}

/**
 * Circuit Breaker with Rolling Window Failure Tracking
 *
 * This implementation tracks failures within a rolling time window,
 * allowing the circuit to recover naturally as old failures expire.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 30000,
 *   windowSize: 60000,
 *   name: 'external-api'
 * });
 *
 * try {
 *   const result = await breaker.execute(() => callExternalAPI());
 * } catch (error) {
 *   if (error instanceof CircuitOpenError) {
 *     console.log(`Circuit open, retry after: ${error.nextAttemptTime}`);
 *   }
 * }
 * ```
 */
export class CircuitBreaker<T = unknown> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureTimestamps: number[] = [];
  private successCount: number = 0;
  private openedAt?: number;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000,
      windowSize: options.windowSize ?? 60000,
      name: options.name ?? 'default',
    };

    logger.debug(
      { name: this.options.name, options: this.options },
      'Circuit breaker initialized'
    );
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - The async function to execute
   * @returns The result of the function
   * @throws CircuitOpenError if circuit is open and timeout hasn't elapsed
   * @throws The original error if the function fails
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.openedAt! >= this.options.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        const nextAttempt = new Date(this.openedAt! + this.options.timeout);
        throw new CircuitOpenError(
          `Circuit breaker '${this.options.name}' is open`,
          nextAttempt
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    // Prune old failures before returning stats for accuracy
    this.pruneOldFailures();

    return {
      state: this.state,
      failures: this.failureTimestamps.length,
      successes: this.successCount,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      openedAt: this.openedAt ? new Date(this.openedAt) : undefined,
    };
  }

  /**
   * Reset the circuit breaker to initial closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureTimestamps = [];
    this.successCount = 0;
    this.openedAt = undefined;
    this.lastFailure = undefined;
    this.lastSuccess = undefined;

    logger.info({ name: this.options.name }, 'Circuit breaker reset');
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      logger.debug(
        {
          name: this.options.name,
          successes: this.successCount,
          threshold: this.options.successThreshold,
        },
        'Success in half-open state'
      );

      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Clear old failures on success in closed state
      this.pruneOldFailures();

      logger.debug(
        { name: this.options.name, remainingFailures: this.failureTimestamps.length },
        'Success in closed state'
      );
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailure = new Date();
    const now = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      logger.warn(
        { name: this.options.name },
        'Failure in half-open state, opening circuit'
      );
      this.transitionTo(CircuitState.OPEN);
      return;
    }

    // Add failure timestamp and prune old ones
    this.failureTimestamps.push(now);
    this.pruneOldFailures();

    logger.debug(
      {
        name: this.options.name,
        failures: this.failureTimestamps.length,
        threshold: this.options.failureThreshold,
      },
      'Failure recorded'
    );

    if (this.failureTimestamps.length >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Remove failure timestamps outside the rolling window
   */
  private pruneOldFailures(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowSize;
    this.failureTimestamps = this.failureTimestamps.filter(
      (ts) => ts >= windowStart
    );
  }

  /**
   * Transition to a new circuit state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.OPEN) {
      this.openedAt = Date.now();
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failureTimestamps = [];
      this.openedAt = undefined;
    }

    logger.info(
      { name: this.options.name, oldState, newState },
      'Circuit breaker state transition'
    );
  }
}

/**
 * Factory function to create a circuit breaker with default options
 */
export function createCircuitBreaker<T = unknown>(
  options: Partial<CircuitBreakerOptions> & { name: string }
): CircuitBreaker<T> {
  return new CircuitBreaker<T>({
    failureThreshold: options.failureThreshold ?? 5,
    successThreshold: options.successThreshold ?? 2,
    timeout: options.timeout ?? 60000,
    windowSize: options.windowSize ?? 60000,
    name: options.name,
  });
}
