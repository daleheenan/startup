// Initialize Sentry FIRST - must be before all other imports
import dotenv from 'dotenv';
dotenv.config();

import { initSentry, errorHandler as sentryErrorHandler, captureException } from './services/sentry.service.js';
initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

console.log('[Server] Starting NovelForge Backend...');
console.log('[Server] NODE_ENV:', process.env.NODE_ENV);
console.log('[Server] DATABASE_PATH:', process.env.DATABASE_PATH);

// Import database and migrations after env is loaded
import { runMigrations } from './db/migrate.js';
import { queueWorker } from './queue/worker.js';
import { requireAuth } from './middleware/auth.js';
import { logger, requestLogger } from './services/logger.service.js';
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
import regenerationRouter from './routes/regeneration.js';
import genreTropesRouter from './routes/genre-tropes.js';
import genreConventionsRouter from './routes/genre-conventions.js';
import proseStylesRouter from './routes/prose-styles.js';
import analyticsRouter from './routes/analytics.js';
import presetsRouter from './routes/presets.js';
import mysteriesRouter from './routes/mysteries.js';

// Run database migrations
try {
  console.log('[Server] Running migrations...');
  runMigrations();
  console.log('[Server] Migrations complete');
} catch (error) {
  console.error('[Server] Migration failed:', error);
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
app.use(express.json({ limit: '1mb' }));

// Request logging with correlation IDs
app.use(requestLogger());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
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
app.use('/api/regeneration', apiLimiter, requireAuth, regenerationRouter);
app.use('/api/genre-tropes', apiLimiter, requireAuth, genreTropesRouter);
app.use('/api/genre-conventions', apiLimiter, requireAuth, genreConventionsRouter);
app.use('/api/prose-styles', apiLimiter, requireAuth, proseStylesRouter);
app.use('/api/analytics', apiLimiter, requireAuth, analyticsRouter);
app.use('/api/presets', apiLimiter, requireAuth, presetsRouter);
app.use('/api/mysteries', apiLimiter, requireAuth, mysteriesRouter);

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
app.listen(PORT, () => {
  logger.info({
    port: PORT,
    frontend: FRONTEND_URL,
    environment: process.env.NODE_ENV || 'development',
    logLevel: logger.level,
  }, 'NovelForge Backend Server started');

  // Start queue worker
  logger.info('Starting queue worker');
  queueWorker.start().catch((error) => {
    logger.error({ error }, 'Queue worker failed to start');
    if (error instanceof Error) {
      captureException(error, { context: 'queue_worker_startup' });
    }
    process.exit(1);
  });
});

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
