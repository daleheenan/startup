import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrate.js';
import { queueWorker } from './queue/worker.js';
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

// Load environment variables
dotenv.config();

// Run database migrations
runMigrations();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/concepts', conceptsRouter);
app.use('/api/outlines', outlinesRouter);
app.use('/api/books', booksRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/generation', generationRouter);
app.use('/api/editing', editingRouter);
app.use('/api/export', exportRouter);
app.use('/api/trilogy', trilogyRouter);

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
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  queueWorker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  queueWorker.stop();
  process.exit(0);
});
