import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate.js';
import { queueWorker } from './queue/worker.js';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
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

// Load environment variables
dotenv.config();

// Run database migrations
runMigrations();

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

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 NovelForge Backend Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n✅ Server started successfully\n`);

  // Start queue worker
  console.log('🔄 Starting queue worker...');
  queueWorker.start().catch((error) => {
    console.error('Queue worker failed:', error);
    process.exit(1);
  });
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...`);
  try {
    await queueWorker.stop();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown error:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
