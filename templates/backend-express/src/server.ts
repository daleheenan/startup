/**
 * Express Server Entry Point
 *
 * This file demonstrates production-ready server setup with:
 * - Global exception handlers (must be first)
 * - Environment validation
 * - Security middleware
 * - Graceful shutdown
 * - Health check integration
 */

import dotenv from 'dotenv';
dotenv.config();

// =============================================================================
// GLOBAL EXCEPTION HANDLERS - Must be registered before any other initialisation
// =============================================================================
// Node 20+ terminates on unhandled rejections by default. These handlers ensure
// Railway logs capture the error before the process exits.

process.on('uncaughtException', (error) => {
  console.error('[Server] UNCAUGHT EXCEPTION -- process will exit:', error);
  // Give error tracking (Sentry) time to flush if configured
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] UNHANDLED REJECTION:', reason);
  console.error('[Server] Promise:', promise);
  // Log but don't exit - background task failures shouldn't kill the server
});

// =============================================================================
// IMPORTS
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { logger, requestLogger } from './services/logger.service.js';
import { setServerReady, setQueueWorkerReady } from './services/server-state.service.js';
import { RateLimitConfig, RateLimitHeaders } from './config/rate-limits.config.js';
import { requireAuth } from './middleware/auth.js';
import healthRouter from './routes/health.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const MIN_JWT_SECRET_LENGTH = 32;

  // JWT_SECRET is required in all environments for security
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is required');
    } else {
      warnings.push('JWT_SECRET not set - using insecure default for development only');
      process.env.JWT_SECRET = 'dev-only-insecure-secret-change-in-production';
    }
  } else if (process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    if (process.env.NODE_ENV === 'production') {
      errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
    } else {
      warnings.push(`JWT_SECRET is shorter than recommended ${MIN_JWT_SECRET_LENGTH} characters`);
    }
  }

  // Add your production-required variables here:
  // if (process.env.NODE_ENV === 'production') {
  //   if (!process.env.DATABASE_URL) errors.push('DATABASE_URL is required in production');
  //   if (!process.env.API_KEY) errors.push('API_KEY is required in production');
  // }

  return { valid: errors.length === 0, errors, warnings };
}

// Run environment validation
if (process.env.NODE_ENV !== 'test') {
  const envValidation = validateEnvironment();

  if (envValidation.warnings.length > 0) {
    console.warn('[Server] Environment warnings:');
    envValidation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  if (!envValidation.valid) {
    console.error('[Server] Environment validation failed:');
    envValidation.errors.forEach(err => console.error(`  - ${err}`));
    if (process.env.NODE_ENV === 'production') {
      console.error('[Server] Exiting due to missing required environment variables');
      process.exit(1);
    } else {
      console.warn('[Server] Continuing with warnings in development mode');
    }
  }
}

// =============================================================================
// APP CONFIGURATION
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Trust proxy for Railway (required for rate limiting)
app.set('trust proxy', 1);

// =============================================================================
// MIDDLEWARE STACK
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (adds req.log and X-Request-ID)
app.use(requestLogger());

// Rate limiting - apply to all routes except health
app.use('/api', rateLimit({
  ...RateLimitConfig.api,
  ...RateLimitHeaders,
  skip: (req) => req.path.startsWith('/health'),
}));

// =============================================================================
// ROUTES
// =============================================================================

// Health check (no auth required)
app.use('/api/health', healthRouter);

// Protected routes example
// app.use('/api/users', requireAuth, usersRouter);
// app.use('/api/projects', requireAuth, projectsRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log error with request context
  if (req.log) {
    req.log.error({ error: err, statusCode }, 'Request error');
  } else {
    logger.error({ error: err, statusCode, path: req.path }, 'Request error');
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    frontend: FRONTEND_URL,
    environment: process.env.NODE_ENV || 'development',
  }, 'Server started');

  setServerReady(true);

  // If you have a queue worker, start it here:
  // setImmediate(() => {
  //   queueWorker.start()
  //     .then(() => {
  //       setQueueWorkerReady(true);
  //       logger.info('Queue worker started');
  //     })
  //     .catch((error) => {
  //       logger.error({ error }, 'Queue worker failed to start');
  //       // Retry after delay instead of exiting
  //       const retryDelay = process.env.NODE_ENV === 'production' ? 30000 : 10000;
  //       setTimeout(() => {
  //         queueWorker.start()
  //           .then(() => setQueueWorkerReady(true))
  //           .catch((err) => logger.error({ error: err }, 'Queue worker retry failed'));
  //       }, retryDelay);
  //     });
  // });

  // If no queue worker, mark as ready immediately
  setQueueWorkerReady(true);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  try {
    // 1. Stop accepting new connections
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          logger.warn({ error: err }, 'HTTP server close returned error');
        }
        logger.info('HTTP server closed');
        resolve();
      });
    });

    // 2. Stop queue worker (if applicable)
    // await queueWorker.stop();

    // 3. Close database connections
    // db.close();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Shutdown error');
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Export for testing
export { app, server };
