import pino from 'pino';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Main application logger with environment-specific configuration
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
  base: {
    service: 'novelforge-api',
    version: process.env.npm_package_version,
  },
});

/**
 * Create a child logger with a specific context
 * @param context - The context name (e.g., 'ClaudeService', 'DatabaseMigration')
 */
export const createLogger = (context: string) => logger.child({ context });

/**
 * Extend Express Request type to include logger and requestId
 */
declare global {
  namespace Express {
    interface Request {
      log: pino.Logger;
      requestId: string;
    }
  }
}

/**
 * Request logger middleware
 *
 * Adds:
 * - X-Request-ID header to each request/response
 * - Request-scoped logger attached to req.log
 * - Automatic request completion logging with duration and status code
 */
export const requestLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Attach request-scoped logger
    req.log = logger.child({
      requestId,
      path: req.path,
      method: req.method
    });

    // Store requestId on request object
    req.requestId = requestId;

    // Set response header
    res.setHeader('X-Request-ID', requestId);

    // Log request completion
    res.on('finish', () => {
      req.log.info({
        statusCode: res.statusCode,
        duration: Date.now() - startTime,
      }, 'request completed');
    });

    next();
  };
};
