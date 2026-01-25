import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const log = createLogger('HealthRouter');

/**
 * GET /api/health
 *
 * Basic health check endpoint
 *
 * Response:
 * {
 *   "status": "ok",
 *   "timestamp": "ISO 8601 timestamp"
 * }
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/claude
 *
 * Health check for Claude API connectivity
 *
 * Response (healthy):
 * {
 *   "status": "healthy",
 *   "latency": 123,
 *   "model": "claude-3-haiku-20240307"
 * }
 *
 * Response (unhealthy):
 * {
 *   "status": "unhealthy",
 *   "error": "error message"
 * }
 */
router.get('/claude', async (req, res) => {
  const startTime = Date.now();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'placeholder-key-will-be-set-later') {
      log.warn('Claude API key not configured');
      return res.status(503).json({
        status: 'unhealthy',
        error: 'API key not configured'
      });
    }

    const client = new Anthropic({ apiKey });

    // Quick ping to Claude API using Haiku (fastest, cheapest model)
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });

    const latency = Date.now() - startTime;

    // Verify we got a response
    if (!response || !response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude API');
    }

    log.info({ latency }, 'Claude API health check passed');

    res.json({
      status: 'healthy',
      latency,
      model: 'claude-3-haiku-20240307',
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;

    log.error({ error: error.message, latency }, 'Claude API health check failed');

    res.status(503).json({
      status: 'unhealthy',
      error: error.message || 'Unknown error',
      latency,
    });
  }
});

export default router;
