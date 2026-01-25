import * as Sentry from '@sentry/node';
import { createLogger } from './logger.service.js';

const logger = createLogger('services:sentry');

/**
 * Initialize Sentry for error tracking
 *
 * Only initializes if SENTRY_DSN environment variable is set.
 * Automatically configures sample rates based on environment.
 */
export function initSentry(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      // Sample 10% of transactions in production, 100% in development
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        // Add integrations as needed
      ],
    });
    logger.info({ environment: process.env.NODE_ENV || 'development' }, 'Sentry initialized');
  } else {
    logger.info('Sentry skipped - SENTRY_DSN not configured');
  }
}

/**
 * Capture an exception to Sentry with optional context
 *
 * @param error - The error to capture
 * @param context - Additional context to attach to the error
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Capture a message to Sentry
 *
 * @param message - The message to capture
 * @param level - The severity level (info, warning, error)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Sentry error handler middleware for Express
 *
 * Should be used after all routes but before custom error handlers
 */
export const errorHandler = Sentry.expressErrorHandler;

/**
 * Export the Sentry SDK for advanced usage
 */
export { Sentry };
