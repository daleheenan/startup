// Initialize Sentry FIRST - must be before all other imports
import dotenv from 'dotenv';
dotenv.config();

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
function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder-key-will-be-set-later') {
      errors.push('ANTHROPIC_API_KEY is required in production');
    }
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET is required in production');
    }
    if (!process.env.OWNER_PASSWORD_HASH) {
      errors.push('OWNER_PASSWORD_HASH is required in production');
    }
  }

  // Warn about missing optional but recommended vars
  if (!process.env.DATABASE_PATH && process.env.NODE_ENV === 'production') {
    console.warn('[Server] WARNING: DATABASE_PATH not set, using default location');
  }

  return { valid: errors.length === 0, errors };
}

// Run environment validation
if (process.env.NODE_ENV !== 'test') {
  const envValidation = validateEnvironment();
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
import { queueWorker } from './queue/worker.js';
import { requireAuth } from './middleware/auth.js';
import { logger, requestLogger } from './services/logger.service.js';
import { RateLimitConfig } from './config/rate-limits.config.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import progressRouter from './routes/progress.js';
import lessonsRouter from './routes/lessons.js';
import reflectionsRouter from './routes/reflections.js';
import projectsRouter from './routes/projects.js';
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
import plagiarismRouter from './routes/plagiarism.js';
import vebRouter from './routes/veb.js';
import completionRouter from './routes/completion.js';

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

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: RateLimitConfig.AUTH.WINDOW_MS,
  max: RateLimitConfig.AUTH.MAX_REQUESTS,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: RateLimitConfig.API.WINDOW_MS,
  max: RateLimitConfig.API.MAX_REQUESTS,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' } },
  standardHeaders: true,
  legacyHeaders: false,
});

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
app.use('/api/books', apiLimiter, requireAuth, booksRouter);
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
app.use('/api/plagiarism', apiLimiter, requireAuth, plagiarismRouter);
app.use('/api/completion', apiLimiter, requireAuth, completionRouter);
app.use('/api', apiLimiter, requireAuth, vebRouter); // VEB routes use /api/projects/:id/veb/* and /api/veb/*

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

// Track server readiness state
let serverReady = false;
let queueWorkerReady = false;

// Start server
const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    frontend: FRONTEND_URL,
    environment: process.env.NODE_ENV || 'development',
    logLevel: logger.level,
  }, 'NovelForge Backend Server started');
  serverReady = true;

  // Start queue worker after server is listening
  // Use setImmediate to ensure server is fully bound before starting worker
  setImmediate(() => {
    logger.info('Starting queue worker');
    queueWorker.start()
      .then(() => {
        queueWorkerReady = true;
        logger.info('Queue worker started successfully');
      })
      .catch((error) => {
        logger.error({ error }, 'Queue worker failed to start');
        if (error instanceof Error) {
          captureException(error, { context: 'queue_worker_startup' });
        }
        // In production, exit on queue worker failure
        // In development, log but continue (allows debugging)
        if (process.env.NODE_ENV === 'production') {
          logger.error('Exiting due to queue worker failure in production');
          process.exit(1);
        } else {
          logger.warn('Continuing despite queue worker failure in development mode');
        }
      });
  });
});

// Export readiness check for health endpoints
export function isServerReady(): boolean {
  return serverReady;
}

export function isQueueWorkerReady(): boolean {
  return queueWorkerReady;
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  try {
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
