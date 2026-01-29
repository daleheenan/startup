/**
 * Project Metrics Routes
 * Handles metrics retrieval for projects
 */

import { Router } from 'express';
import { metricsService } from '../../services/metrics.service.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:projects:metrics');

/**
 * GET /api/projects/:id/metrics
 * Get detailed metrics for a project
 */
router.get('/:id/metrics', (req, res) => {
  try {
    const metrics = metricsService.getFormattedMetrics(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project metrics not found' },
      });
    }

    res.json(metrics);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching project metrics');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
