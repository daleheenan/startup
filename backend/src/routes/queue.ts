import { Router } from 'express';
import { QueueWorker } from '../queue/worker.js';
import { sessionTracker } from '../services/session-tracker.js';

const router = Router();

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
    console.error('[API] Error fetching queue stats:', error);
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
    console.error('[API] Error creating test job:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
