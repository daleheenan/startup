import express from 'express';
import { createLogger } from '../services/logger.service.js';
import { isServerReady, isQueueWorkerReady } from '../services/server-state.service.js';

const router = express.Router();
const log = createLogger('HealthRouter');

/**
 * GET /api/health
 *
 * Basic health check endpoint for Railway/Docker orchestration.
 * Returns 200 if healthy, 503 if unhealthy.
 *
 * Keep this endpoint FAST - it's called frequently by load balancers.
 */
router.get('/', (req, res) => {
  try {
    // Add your database health check here
    // Example for SQLite:
    // const result = db.prepare('SELECT 1 as test').get();
    // if (!result) throw new Error('Database query returned no result');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error({ error: error.message }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed'
    });
  }
});

/**
 * GET /api/health/detailed
 *
 * Detailed health check with component status.
 * Use for debugging - not for orchestration (too slow).
 */
router.get('/detailed', (req, res) => {
  const checks: Record<string, any> = {};
  let overallStatus = 'ok';

  // Server readiness
  const serverReady = isServerReady();
  checks.server = { status: serverReady ? 'ok' : 'starting' };
  if (!serverReady && overallStatus === 'ok') {
    overallStatus = 'degraded';
  }

  // Queue worker readiness (if applicable)
  const queueReady = isQueueWorkerReady();
  checks.queueWorker = { status: queueReady ? 'ok' : 'starting' };
  if (!queueReady && overallStatus === 'ok') {
    overallStatus = 'degraded';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
  };

  // Uptime
  checks.uptime = Math.round(process.uptime()) + 's';

  // Environment
  checks.environment = process.env.NODE_ENV || 'development';

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /api/health/ready
 *
 * Readiness probe - returns 503 until server is fully ready.
 * Use this as Railway's health check if you need startup delays.
 */
router.get('/ready', (req, res) => {
  const serverReady = isServerReady();
  const queueReady = isQueueWorkerReady();

  if (serverReady && queueReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      server: serverReady ? 'ready' : 'starting',
      queue: queueReady ? 'ready' : 'starting',
    });
  }
});

export default router;
