// Initialize Sentry FIRST - must be before all other imports
import dotenv from 'dotenv';
dotenv.config();

// Global exception handlers -- must be registered before any other initialisation.
// Node 20 terminates on unhandled rejections by default; these ensure Railway logs
// the error and the process exits cleanly rather than silently crashing.
process.on('uncaughtException', (error) => {
  console.error('[Server] UNCAUGHT EXCEPTION -- process will exit:', error);
  // Give Sentry a chance to flush if it was initialised
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] UNHANDLED REJECTION:', reason);
  console.error('[Server] Promise:', promise);
  // Do not exit immediately -- the rejection may be from a background task.
  // Log loudly so Railway captures it, but allow the event loop to continue.
});

import { initSentry, errorHandler as sentryErrorHandler, captureException } from './services/sentry.service.js';
initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Early logging before logger is fully initialized
if (process.env.NODE_ENV !== 'test') {
  console.log('[Server] Starting NovelForge Backend...');
  console.log('[Server] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Server] DATABASE_PATH:', process.env.DATABASE_PATH);
}

// Validate critical environment variables at startup
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
      // Set a development-only default (NEVER use in production)
      process.env.JWT_SECRET = 'dev-only-insecure-secret-change-in-production';
    }
  } else if (process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    if (process.env.NODE_ENV === 'production') {
      errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters for security`);
    } else {
      warnings.push(`JWT_SECRET is shorter than recommended ${MIN_JWT_SECRET_LENGTH} characters`);
    }
  }

  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-key-will-be-set-later') {
      errors.push('ANTHROPIC_API_KEY is required in production');
    }
    if (!process.env.OWNER_PASSWORD_HASH) {
      errors.push('OWNER_PASSWORD_HASH is required in production');
    }
  }

  // Warn about missing optional but recommended vars
  if (!process.env.DATABASE_PATH && process.env.NODE_ENV === 'production') {
    warnings.push('DATABASE_PATH not set, using default location');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Run environment validation
if (process.env.NODE_ENV !== 'test') {
  const envValidation = validateEnvironment();

  // Log warnings
  if (envValidation.warnings.length > 0) {
    console.warn('[Server] Environment warnings:');
    envValidation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  // Handle errors
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

// Import database and migrations after env is loaded
import { runMigrations } from './db/migrate.js';
import { queueWorker, QueueWorker } from './queue/worker.js';
import { requireAuth } from './middleware/auth.js';
import { setServerReady, setQueueWorkerReady } from './services/server-state.service.js';
import { logger, requestLogger } from './services/logger.service.js';
import { RateLimitConfig } from './config/rate-limits.config.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import progressRouter from './routes/progress.js';
import lessonsRouter from './routes/lessons.js';
import reflectionsRouter from './routes/reflections.js';
import projectsRouter from './routes/projects/index.js';
import queueRouter from './routes/queue.js';
import conceptsRouter from './routes/concepts.js';
import outlinesRouter from './routes/outlines.js';
import booksRouter from './routes/books.js';
import chaptersRouter from './routes/chapters.js';
import generationRouter from './routes/generation.js';
import editingRouter from './routes/editing.js';
import exportRouter from './routes/export.js';
import trilogyRouter from './routes/trilogy.js';
import savedConceptsRouter from './routes/saved-concepts.js';
import savedConceptSummariesRouter from './routes/saved-concept-summaries.js';
import regenerationRouter from './routes/regeneration.js';
import genreTropesRouter from './routes/genre-tropes.js';
import genreConventionsRouter from './routes/genre-conventions.js';
import proseStylesRouter from './routes/prose-styles.js';
import analyticsRouter from './routes/analytics.js';
import presetsRouter from './routes/presets.js';
import mysteriesRouter from './routes/mysteries.js';
import universesRouter from './routes/universes.js';
import userSettingsRouter from './routes/user-settings.js';
import storyIdeasRouter from './routes/story-ideas.js';
import authorsRouter from './routes/authors.js';
import authorProfileRouter from './routes/author-profile.js';
import plagiarismRouter from './routes/plagiarism.js';
import vebRouter from './routes/veb.js';
import completionRouter from './routes/completion.js';
import outlineEditorialRouter from './routes/outline-editorial.js';
import editorialBoardRouter from './routes/editorial-board.js';
import seriesRouter from './routes/series.js';
import wordCountRevisionRouter from './routes/word-count-revision.js';
import editorialLessonsRouter from './routes/editorial-lessons.js';
import lessonCurationRouter from './routes/lesson-curation.js';
import aiCostsRouter from './routes/ai-costs.js';
import navigationRouter from './routes/navigation.js';
import authorStylesRouter from './routes/author-styles.js';
import imagesRouter from './routes/images/index.js';
import proseReportsRouter from './routes/prose-reports.js';
import publishingRouter from './routes/publishing.js';
import bestsellerRouter from './routes/bestseller.js';

// Run database migrations
try {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[Server] Running migrations...');
  }
  runMigrations();
  logger.info('Database migrations complete');
} catch (error) {
  logger.error({ error }, 'Database migration failed');
  if (error instanceof Error) {
    captureException(error, { context: 'database_migration' });
  }
  process.exit(1);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Trust proxy for Railway/reverse proxy setups (needed for rate limiting)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API server
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: [
    FRONTEND_URL,
    'https://novelforge.daleheenan.com',
    'https://novelforge-production.up.railway.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body parsing with size limits
// Increased to 10mb to handle large plot structures with many layers and points
app.use(express.json({ limit: '10mb' }));

// Request logging with correlation IDs
app.use(requestLogger());

// Rate limiting configuration
// NOTE: Rate limiting is DISABLED by default for single-user sites to prevent
// "Failed to fetch" errors during normal navigation. Enable via ENABLE_RATE_LIMITING=true

// Auth rate limiter - only active when rate limiting is enabled
const authLimiter = RateLimitConfig.ENABLED
  ? rateLimit({
      windowMs: RateLimitConfig.AUTH.WINDOW_MS,
      max: RateLimitConfig.AUTH.MAX_REQUESTS,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' } },
      standardHeaders: true,
      legacyHeaders: false,
    })
  : (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

// General API rate limiter - only active when rate limiting is enabled
const apiLimiter = RateLimitConfig.ENABLED
  ? rateLimit({
      windowMs: RateLimitConfig.API.WINDOW_MS,
      max: RateLimitConfig.API.MAX_REQUESTS,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' } },
      standardHeaders: true,
      legacyHeaders: false,
    })
  : (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

// Routes that should be exempt from rate limiting (admin/migration operations)
const rateLimitExemptPaths = [
  /\/api\/books\/[^/]+\/migrate-chapters$/,  // Version migration
];

// Conditional rate limiter that skips certain paths (or all paths if rate limiting disabled)
const conditionalApiLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!RateLimitConfig.ENABLED) {
    return next();
  }
  const isExempt = rateLimitExemptPaths.some(pattern => pattern.test(req.path));
  if (isExempt) {
    return next();
  }
  return apiLimiter(req, res, next);
};

// Log rate limiting status at startup
if (process.env.NODE_ENV !== 'test') {
  console.log(`[Server] Rate limiting: ${RateLimitConfig.ENABLED ? 'ENABLED' : 'DISABLED (single-user mode)'}`);
}

// Public Routes (no auth required, no rate limiting)
app.use('/api/health', healthRouter);

// Public API Routes with rate limiting
app.use('/api/auth', authLimiter, authRouter);

// Protected API Routes (require authentication) with rate limiting
app.use('/api/progress', requireAuth, progressRouter); // SSE exempt from rate limit
app.use('/api/lessons', apiLimiter, requireAuth, lessonsRouter);
app.use('/api/reflections', apiLimiter, requireAuth, reflectionsRouter);
app.use('/api/projects', apiLimiter, requireAuth, projectsRouter);
app.use('/api/queue', apiLimiter, requireAuth, queueRouter);
app.use('/api/concepts', apiLimiter, requireAuth, conceptsRouter);
app.use('/api/outlines', apiLimiter, requireAuth, outlinesRouter);
app.use('/api/books', conditionalApiLimiter, requireAuth, booksRouter);
app.use('/api/chapters', apiLimiter, requireAuth, chaptersRouter);
app.use('/api/generation', apiLimiter, requireAuth, generationRouter);
app.use('/api/editing', apiLimiter, requireAuth, editingRouter);
app.use('/api/export', apiLimiter, requireAuth, exportRouter);
app.use('/api/trilogy', apiLimiter, requireAuth, trilogyRouter);
app.use('/api/saved-concepts', apiLimiter, requireAuth, savedConceptsRouter);
app.use('/api/saved-concept-summaries', apiLimiter, requireAuth, savedConceptSummariesRouter);
app.use('/api/regeneration', apiLimiter, requireAuth, regenerationRouter);
app.use('/api/genre-tropes', apiLimiter, requireAuth, genreTropesRouter);
app.use('/api/genre-conventions', apiLimiter, requireAuth, genreConventionsRouter);
app.use('/api/prose-styles', apiLimiter, requireAuth, proseStylesRouter);
app.use('/api/analytics', apiLimiter, requireAuth, analyticsRouter);
app.use('/api/presets', apiLimiter, requireAuth, presetsRouter);
app.use('/api/mysteries', apiLimiter, requireAuth, mysteriesRouter);
app.use('/api/universes', apiLimiter, requireAuth, universesRouter);
app.use('/api/user-settings', apiLimiter, requireAuth, userSettingsRouter);
app.use('/api/story-ideas', apiLimiter, requireAuth, storyIdeasRouter);
app.use('/api/authors', apiLimiter, requireAuth, authorsRouter);
app.use('/api/author-profile', apiLimiter, requireAuth, authorProfileRouter);
app.use('/api/plagiarism', apiLimiter, requireAuth, plagiarismRouter);
app.use('/api/completion', apiLimiter, requireAuth, completionRouter);
app.use('/api', apiLimiter, requireAuth, vebRouter); // VEB routes use /api/projects/:id/veb/* and /api/veb/*
app.use('/api', apiLimiter, requireAuth, outlineEditorialRouter); // Outline Editorial routes
app.use('/api/editorial', apiLimiter, requireAuth, editorialBoardRouter); // Editorial Board aggregation routes
app.use('/api/series', apiLimiter, requireAuth, seriesRouter); // Series management routes
app.use('/api/word-count-revision', apiLimiter, requireAuth, wordCountRevisionRouter); // Word count revision routes
app.use('/api/editorial-lessons', apiLimiter, requireAuth, editorialLessonsRouter); // Editorial lessons routes
app.use('/api/lesson-curation', apiLimiter, requireAuth, lessonCurationRouter); // AI-assisted lesson curation (Sprint 45)
app.use('/api/ai-costs', apiLimiter, requireAuth, aiCostsRouter); // AI cost tracking routes
app.use('/api/navigation', apiLimiter, requireAuth, navigationRouter); // Navigation counts (optimised single-query endpoint)
app.use('/api/author-styles', apiLimiter, requireAuth, authorStylesRouter); // Author writing style profiles (Sprint 21)
app.use('/api/images', apiLimiter, requireAuth, imagesRouter); // Image generation and management (Sprint 24)
app.use('/api/prose-reports', apiLimiter, requireAuth, proseReportsRouter); // ProWritingAid-style prose analysis (Sprint 40)
app.use('/api/publishing', apiLimiter, requireAuth, publishingRouter); // Traditional publishing support (Sprint 39)
app.use('/api/bestseller', apiLimiter, requireAuth, bestsellerRouter); // Bestseller formula analysis (Sprint 43-44)

// Sentry error handler - must be BEFORE custom error handlers
app.use(sentryErrorHandler());

// Custom error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Use request logger if available, otherwise use global logger
  const log = req.log || logger;
  log.error({ err, path: req.path, method: req.method }, 'Request error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    frontend: FRONTEND_URL,
    environment: process.env.NODE_ENV || 'development',
    logLevel: logger.level,
  }, 'NovelForge Backend Server started');
  setServerReady(true);

  // Start queue worker after server is listening
  // Use setImmediate to ensure server is fully bound before starting worker
  setImmediate(() => {
    // Recover any stale jobs that were running when the server last stopped
    // This ensures VEB and other jobs don't get stuck in 'running' state forever
    logger.info('Recovering stale jobs from previous session...');
    QueueWorker.recoverStaleJobs();

    logger.info('Starting queue worker');
    queueWorker.start()
      .then(() => {
        setQueueWorkerReady(true);
        logger.info('Queue worker started successfully');
      })
      .catch((error) => {
        logger.error({ error }, 'Queue worker failed to start');
        if (error instanceof Error) {
          captureException(error, { context: 'queue_worker_startup' });
        }
        // Do NOT exit the process on queue worker failure.
        // The HTTP server is healthy and serving requests; killing it because
        // of a background worker issue causes Railway to restart the entire
        // container, compounding the outage. Retry after a delay so that
        // transient issues (e.g., missing table from partial migration) resolve
        // without unnecessary downtime.
        const retryDelaySec = process.env.NODE_ENV === 'production' ? 30 : 10;
        logger.warn({ retryDelaySeconds: retryDelaySec },
          'Queue worker failed to start -- will retry in ' + retryDelaySec + 's. Server continues serving requests.');
        setTimeout(() => {
          logger.info('Retrying queue worker startup...');
          queueWorker.start()
            .then(() => {
              setQueueWorkerReady(true);
              logger.info('Queue worker started successfully on retry');
            })
            .catch((retryError) => {
              logger.error({ error: retryError }, 'Queue worker retry also failed -- worker will remain inactive');
              if (retryError instanceof Error) {
                captureException(retryError, { context: 'queue_worker_startup_retry' });
              }
            });
        }, retryDelaySec * 1000);
      });
  });
});

// Re-export readiness checks from the shared state module for any legacy consumers
export { isServerReady, isQueueWorkerReady } from './services/server-state.service.js';

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  try {
    // Stop accepting new connections first, then drain in-flight requests
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          logger.warn({ error: err }, 'HTTP server close returned error');
        }
        logger.info('HTTP server closed -- no longer accepting new connections');
        resolve();
      });
    });

    // Stop the queue worker (waits for current job up to GRACEFUL_SHUTDOWN_TIMEOUT_MS)
    await queueWorker.stop();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Shutdown error');
    if (error instanceof Error) {
      captureException(error, { context: 'graceful_shutdown', signal });
    }
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
