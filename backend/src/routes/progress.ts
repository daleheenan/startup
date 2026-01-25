import express from 'express';
import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:progress');

// Global event emitter for progress updates
export const progressEmitter = new EventEmitter();

// Set max listeners to avoid warnings (many concurrent clients)
progressEmitter.setMaxListeners(100);

// Track active connections for monitoring
const activeConnections = new Set<() => void>();

// Monitor connection count periodically
setInterval(() => {
  if (activeConnections.size > 90) {
    logger.warn({ count: activeConnections.size }, 'High SSE connection count');
  }
}, 300000); // Check every 5 minutes

/**
 * GET /api/progress/stream
 *
 * Server-Sent Events endpoint for real-time progress updates.
 * Clients subscribe to this stream to receive job updates, chapter completions, etc.
 *
 * Authentication via query parameter (EventSource doesn't support headers):
 * ?token=<jwt-token>
 *
 * BUG-006 FIX: Extracts userId from JWT and validates payload
 * BUG-013 FIX: Tracks connections and monitors for leaks
 */
router.get('/stream', (req, res) => {
  // Verify authentication (token from query parameter)
  const token = req.query.token as string;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // BUG-006 FIX: Extract and validate userId from token
  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const userId = decoded.userId || decoded.id;
  if (!userId) {
    res.status(401).json({ error: 'Invalid token payload' });
    return;
  }

  logger.info({ userId, connectionCount: activeConnections.size }, 'SSE connection established');

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
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error({ error, event }, 'Failed to send SSE event');
    }
  };

  // Send initial connection event
  sendEvent('init', { message: 'Connected to progress stream', timestamp: new Date().toISOString() });

  /**
   * Event handlers
   * BUG-006 FIX: Filter events by userId (future enhancement)
   * For now, all users see all events. Add userId filtering in event emitters.
   */

  const jobUpdateHandler = (job: any) => {
    // TODO: Add userId check if events include userId
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

  // BUG-013 FIX: Track cleanup function to detect leaks
  const cleanup = () => {
    progressEmitter.off('job:update', jobUpdateHandler);
    progressEmitter.off('chapter:complete', chapterCompleteHandler);
    progressEmitter.off('chapter:progress', chapterProgressHandler);
    progressEmitter.off('session:update', sessionUpdateHandler);
    progressEmitter.off('queue:stats', queueStatsHandler);
    activeConnections.delete(cleanup);
    logger.info({ userId, connectionCount: activeConnections.size }, 'SSE connection closed');
    res.end();
  };

  activeConnections.add(cleanup);

  // Cleanup on client disconnect
  req.on('close', cleanup);

  // Forced cleanup after 1 hour (safety measure)
  const forceCloseTimeout = setTimeout(() => {
    logger.warn({ userId }, 'Forcing SSE connection close after 1 hour');
    cleanup();
  }, 3600000);

  // Clear the force-close timeout if client disconnects normally
  req.on('close', () => {
    clearTimeout(forceCloseTimeout);
  });
});

export default router;
