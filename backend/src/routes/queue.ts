import { Router } from 'express';
import { QueueWorker } from '../queue/worker.js';
import { sessionTracker } from '../services/session-tracker.js';
import { createLogger } from '../services/logger.service.js';
import type { JobType } from '../shared/types/index.js';
import {
  createQueueJobSchema,
  validateRequest,
  type CreateQueueJobInput,
} from '../utils/schemas.js';

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
    const validation = validateRequest(createQueueJobSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { type, targetId } = validation.data;

    const jobId = QueueWorker.createJob(type as JobType, targetId);

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
