import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../services/logger.service.js';
import db from '../db/connection.js';

const router = express.Router();
const log = createLogger('HealthRouter');

// Import server readiness functions (lazy import to avoid circular dependency)
let isServerReady: () => boolean;
let isQueueWorkerReady: () => boolean;

// Initialize readiness functions asynchronously
(async () => {
  try {
    const serverModule = await import('../server.js');
    isServerReady = serverModule.isServerReady || (() => true);
    isQueueWorkerReady = serverModule.isQueueWorkerReady || (() => true);
  } catch {
    // Fallback if import fails (e.g., during testing)
    isServerReady = () => true;
    isQueueWorkerReady = () => true;
  }
})();

/**
 * GET /api/health
 *
 * Basic health check endpoint with database connectivity verification
 * This is used by Railway and Docker for deployment health checks
 *
 * Response (healthy):
 * {
 *   "status": "ok",
 *   "timestamp": "ISO 8601 timestamp",
 *   "database": "connected"
 * }
 *
 * Response (unhealthy):
 * {
 *   "status": "unhealthy",
 *   "timestamp": "ISO 8601 timestamp",
 *   "error": "error message"
 * }
 */
router.get('/', (req, res) => {
  try {
    // Verify database connectivity with a simple query
    const result = db.prepare('SELECT 1 as test').get();
    if (!result) {
      throw new Error('Database query returned no result');
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error: any) {
    log.error({ error: error.message }, 'Health check failed - database not accessible');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message || 'Database connection failed'
    });
  }
});

/**
 * GET /api/health/detailed
 *
 * Detailed health check including database connectivity
 *
 * Response:
 * {
 *   "status": "ok" | "degraded" | "unhealthy",
 *   "timestamp": "ISO 8601",
 *   "checks": {
 *     "database": { "status": "ok", "latency": 5 },
 *     "memory": { "used": 50, "total": 512 }
 *   }
 * }
 */
router.get('/detailed', (req, res) => {
  const checks: Record<string, any> = {};
  let overallStatus = 'ok';

  // Database check
  try {
    const dbStart = Date.now();
    const result = db.prepare('SELECT 1 as test').get();
    const dbLatency = Date.now() - dbStart;

    if (result) {
      checks.database = { status: 'ok', latency: dbLatency };
    } else {
      checks.database = { status: 'unhealthy', error: 'No result from database' };
      overallStatus = 'unhealthy';
    }
  } catch (error: any) {
    checks.database = { status: 'unhealthy', error: error.message };
    overallStatus = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
  };

  // Queue worker check
  try {
    const queueReady = isQueueWorkerReady ? isQueueWorkerReady() : true;
    checks.queueWorker = { status: queueReady ? 'ok' : 'starting' };
    if (!queueReady) {
      // Queue not ready is not unhealthy during startup, just degraded
      if (overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    }
  } catch (error: any) {
    checks.queueWorker = { status: 'unknown', error: error.message };
  }

  // Uptime
  checks.uptime = Math.round(process.uptime());

  // Environment
  checks.environment = process.env.NODE_ENV || 'development';

  const statusCode = overallStatus === 'ok' ? 200 : (overallStatus === 'degraded' ? 200 : 503);
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
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

/**
 * GET /api/health/diagnostics
 *
 * Full API diagnostics with test generation snippets
 * Tests outline generation and chapter generation with short snippets
 */
router.get('/diagnostics', async (req, res) => {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'placeholder-key-will-be-set-later') {
    return res.status(503).json({
      status: 'unhealthy',
      error: 'API key not configured',
      diagnostics,
    });
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';

  // Test 1: Basic API connectivity
  try {
    const startTime = Date.now();
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with exactly: "API Connected"' }],
    });
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    diagnostics.tests.basicApi = {
      status: 'ok',
      latency: Date.now() - startTime,
      response: content.substring(0, 100),
      model: 'claude-3-haiku-20240307',
    };
  } catch (error: any) {
    diagnostics.tests.basicApi = {
      status: 'error',
      error: error.message,
    };
  }

  // Test 2: Outline generation (JSON array output)
  try {
    const startTime = Date.now();
    const response = await client.messages.create({
      model,
      max_tokens: 500,
      temperature: 0.7,
      system: 'You are a JSON API. Always respond with valid JSON only, no markdown, no explanations.',
      messages: [{
        role: 'user',
        content: `Generate a simple 3-act story structure for a short mystery story. Return ONLY a JSON array:
[
  {"number": 1, "name": "Setup", "description": "Brief description"},
  {"number": 2, "name": "Confrontation", "description": "Brief description"},
  {"number": 3, "name": "Resolution", "description": "Brief description"}
]`
      }],
    });
    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // Try to parse the JSON
    let parsed = null;
    let parseError = null;
    try {
      // Try direct parse first
      parsed = JSON.parse(content.trim());
    } catch (e1) {
      // Try extracting from code block
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          parsed = JSON.parse(codeBlockMatch[1].trim());
        } catch (e2) {
          parseError = 'Failed to parse JSON from code block';
        }
      } else {
        // Try to find array brackets
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            parsed = JSON.parse(arrayMatch[0]);
          } catch (e3) {
            parseError = 'Failed to parse extracted JSON array';
          }
        } else {
          parseError = 'No JSON array found in response';
        }
      }
    }

    diagnostics.tests.outlineGeneration = {
      status: parsed ? 'ok' : 'error',
      latency: Date.now() - startTime,
      model,
      rawResponse: content.substring(0, 500),
      parsedSuccessfully: !!parsed,
      parseError,
      parsedData: parsed ? (Array.isArray(parsed) ? `Array with ${parsed.length} items` : 'Not an array') : null,
    };
  } catch (error: any) {
    diagnostics.tests.outlineGeneration = {
      status: 'error',
      error: error.message,
      model,
    };
  }

  // Test 3: Chapter text generation (prose output)
  try {
    const startTime = Date.now();
    const response = await client.messages.create({
      model,
      max_tokens: 300,
      temperature: 0.8,
      messages: [{
        role: 'user',
        content: `Write 2-3 sentences of opening prose for a mystery novel chapter. The scene is: A detective arrives at an old mansion on a rainy night. Write ONLY the prose, no commentary.`
      }],
    });
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    diagnostics.tests.chapterGeneration = {
      status: wordCount > 10 ? 'ok' : 'error',
      latency: Date.now() - startTime,
      model,
      wordCount,
      sampleText: content.substring(0, 300),
      hasContent: content.length > 50,
    };
  } catch (error: any) {
    diagnostics.tests.chapterGeneration = {
      status: 'error',
      error: error.message,
      model,
    };
  }

  // Test 4: JSON object generation (for characters/world)
  try {
    const startTime = Date.now();
    const response = await client.messages.create({
      model,
      max_tokens: 400,
      temperature: 0.7,
      system: 'You are a JSON API. Always respond with valid JSON only, no markdown, no explanations.',
      messages: [{
        role: 'user',
        content: `Generate a simple character profile. Return ONLY a JSON object:
{
  "name": "Character Name",
  "role": "protagonist",
  "description": "Brief description",
  "goals": ["goal1", "goal2"]
}`
      }],
    });
    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed = null;
    let parseError = null;
    try {
      parsed = JSON.parse(content.trim());
    } catch (e1) {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          parsed = JSON.parse(codeBlockMatch[1].trim());
        } catch {
          parseError = 'Failed to parse JSON from code block';
        }
      } else {
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            parsed = JSON.parse(objMatch[0]);
          } catch {
            parseError = 'Failed to parse extracted JSON object';
          }
        } else {
          parseError = 'No JSON object found in response';
        }
      }
    }

    diagnostics.tests.characterGeneration = {
      status: parsed ? 'ok' : 'error',
      latency: Date.now() - startTime,
      model,
      rawResponse: content.substring(0, 400),
      parsedSuccessfully: !!parsed,
      parseError,
      parsedFields: parsed ? Object.keys(parsed) : null,
    };
  } catch (error: any) {
    diagnostics.tests.characterGeneration = {
      status: 'error',
      error: error.message,
      model,
    };
  }

  // Calculate overall status
  const testResults = Object.values(diagnostics.tests);
  const allOk = testResults.every((t: any) => t.status === 'ok');
  const anyError = testResults.some((t: any) => t.status === 'error');

  diagnostics.overallStatus = allOk ? 'healthy' : anyError ? 'unhealthy' : 'degraded';
  diagnostics.summary = {
    total: testResults.length,
    passed: testResults.filter((t: any) => t.status === 'ok').length,
    failed: testResults.filter((t: any) => t.status === 'error').length,
  };

  const statusCode = diagnostics.overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(diagnostics);
});

export default router;
