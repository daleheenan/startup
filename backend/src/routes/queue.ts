import { Router } from 'express';
import { QueueWorker } from '../queue/worker.js';
import { sessionTracker } from '../services/session-tracker.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:queue');

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get('/stats', (req, res) => {
  try {
    const queueStats = QueueWorker.getQueueStats();
    const sessionStats = sessionTracker.getSessionStats();

    res.json({
      queue: queueStats,
      session: sessionStats,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching queue stats');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/queue/test
 * Create a test job
 */
router.post('/test', (req, res) => {
  try {
    const { type, targetId } = req.body;

    if (!type || !targetId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing type or targetId' },
      });
    }

    const jobId = QueueWorker.createJob(type, targetId);

    res.status(201).json({
      jobId,
      type,
      targetId,
      status: 'pending',
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, type: req.body.type, targetId: req.body.targetId }, 'Error creating test job');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
