import express from 'express';
import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Global event emitter for progress updates
export const progressEmitter = new EventEmitter();

// Set max listeners to avoid warnings (many concurrent clients)
progressEmitter.setMaxListeners(100);

/**
 * GET /api/progress/stream
 *
 * Server-Sent Events endpoint for real-time progress updates.
 * Clients subscribe to this stream to receive job updates, chapter completions, etc.
 *
 * Authentication via query parameter (EventSource doesn't support headers):
 * ?token=<jwt-token>
 */
router.get('/stream', (req, res) => {
  // Verify authentication (token from query parameter)
  const token = req.query.token as string;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    jwt.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  /**
   * Helper to send SSE event
   */
  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial connection event
  sendEvent('init', { message: 'Connected to progress stream', timestamp: new Date().toISOString() });

  /**
   * Event handlers
   */

  const jobUpdateHandler = (job: any) => {
    sendEvent('job:update', job);
  };

  const chapterCompleteHandler = (chapter: any) => {
    sendEvent('chapter:complete', chapter);
  };

  const chapterProgressHandler = (data: any) => {
    sendEvent('chapter:progress', data);
  };

  const sessionUpdateHandler = (session: any) => {
    sendEvent('session:update', session);
  };

  const queueStatsHandler = (stats: any) => {
    sendEvent('queue:stats', stats);
  };

  // Register event listeners
  progressEmitter.on('job:update', jobUpdateHandler);
  progressEmitter.on('chapter:complete', chapterCompleteHandler);
  progressEmitter.on('chapter:progress', chapterProgressHandler);
  progressEmitter.on('session:update', sessionUpdateHandler);
  progressEmitter.on('queue:stats', queueStatsHandler);

  // Cleanup on client disconnect
  req.on('close', () => {
    progressEmitter.off('job:update', jobUpdateHandler);
    progressEmitter.off('chapter:complete', chapterCompleteHandler);
    progressEmitter.off('chapter:progress', chapterProgressHandler);
    progressEmitter.off('session:update', sessionUpdateHandler);
    progressEmitter.off('queue:stats', queueStatsHandler);
    res.end();
  });
});

export default router;
