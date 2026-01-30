import { Router } from 'express';
import { metricsService } from '../services/metrics.service.js';
import { createLogger } from '../services/logger.service.js';
import { AI_REQUEST_TYPE_LABELS, AI_REQUEST_TYPE_CATEGORIES, getAllRequestTypes, getRequestTypesByCategory } from '../constants/ai-request-types.js';
import db from '../db/connection.js';

const router = Router();
const logger = createLogger('routes:ai-costs');

/**
 * GET /api/ai-costs
 * Get AI request log with filters and pagination
 */
router.get('/', (req, res) => {
  try {
    const filters = {
      projectId: req.query.projectId as string | undefined,
      seriesId: req.query.seriesId as string | undefined,
      requestType: req.query.requestType as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const result = metricsService.getAIRequestLog(filters);

    // Add friendly labels to entries
    const entriesWithLabels = result.entries.map((entry) => ({
      ...entry,
      request_type_label: AI_REQUEST_TYPE_LABELS[entry.request_type as keyof typeof AI_REQUEST_TYPE_LABELS] || entry.request_type,
    }));

    res.json({
      entries: entriesWithLabels,
      total: result.total,
      summary: {
        ...result.summary,
        // Add formatted values for display
        formattedCostUSD: `$${result.summary.totalCostUSD.toFixed(2)}`,
        formattedCostGBP: `£${result.summary.totalCostGBP.toFixed(2)}`,
        formattedInputTokens: formatTokenCount(result.summary.totalInputTokens),
        formattedOutputTokens: formatTokenCount(result.summary.totalOutputTokens),
      },
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + result.entries.length < result.total,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching AI costs');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/ai-costs/summary
 * Get overall AI cost summary
 */
router.get('/summary', (req, res) => {
  try {
    const filters = {
      projectId: req.query.projectId as string | undefined,
      seriesId: req.query.seriesId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const summary = metricsService.getAICostSummary(filters);

    res.json({
      summary: {
        ...summary,
        // Add formatted values for display
        formattedCostUSD: `$${summary.totalCostUSD.toFixed(2)}`,
        formattedCostGBP: `£${summary.totalCostGBP.toFixed(2)}`,
        formattedInputTokens: formatTokenCount(summary.totalInputTokens),
        formattedOutputTokens: formatTokenCount(summary.totalOutputTokens),
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching AI cost summary');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/ai-costs/by-type
 * Get costs grouped by request type
 */
router.get('/by-type', (req, res) => {
  try {
    const filters = {
      projectId: req.query.projectId as string | undefined,
      seriesId: req.query.seriesId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const breakdown = metricsService.getCostsByRequestType(filters);

    // Add friendly labels
    const breakdownWithLabels = breakdown.map((item) => ({
      ...item,
      requestTypeLabel: AI_REQUEST_TYPE_LABELS[item.requestType as keyof typeof AI_REQUEST_TYPE_LABELS] || item.requestType,
      formattedCostUSD: `$${item.costUSD.toFixed(2)}`,
      formattedCostGBP: `£${item.costGBP.toFixed(2)}`,
    }));

    res.json({ breakdown: breakdownWithLabels });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching costs by type');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/ai-costs/by-project
 * Get costs grouped by project
 */
router.get('/by-project', (req, res) => {
  try {
    const filters = {
      seriesId: req.query.seriesId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const breakdown = metricsService.getCostsByProject(filters);

    // Add formatted values
    const breakdownWithFormatted = breakdown.map((item) => ({
      ...item,
      formattedCostUSD: `$${item.totalCostUSD.toFixed(2)}`,
      formattedCostGBP: `£${item.totalCostGBP.toFixed(2)}`,
    }));

    res.json({ projects: breakdownWithFormatted });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching costs by project');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/ai-costs/request-types
 * Get all available request types for filter dropdowns
 */
router.get('/request-types', (_req, res) => {
  try {
    res.json({
      types: getAllRequestTypes(),
      categories: getRequestTypesByCategory(),
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching request types');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/ai-costs/debug
 * Debug endpoint to check database state and diagnose tracking issues
 */
router.get('/debug', (_req, res) => {
  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='ai_request_log'
    `).get();

    // Get record count
    const recordCount = db.prepare('SELECT COUNT(*) as count FROM ai_request_log').get() as { count: number };

    // Get most recent 5 records
    const recentRecords = db.prepare(`
      SELECT id, request_type, project_id, input_tokens, output_tokens, cost_gbp, created_at
      FROM ai_request_log
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    // Get database path info
    const dbInfo = db.prepare('PRAGMA database_list').all();

    // Check project_metrics AI columns
    const metricsWithCosts = db.prepare(`
      SELECT project_id, total_ai_cost_gbp, total_ai_requests
      FROM project_metrics
      WHERE total_ai_requests > 0
      LIMIT 5
    `).all();

    res.json({
      status: 'ok',
      tableExists: !!tableExists,
      recordCount: recordCount?.count || 0,
      recentRecords,
      databaseInfo: dbInfo,
      projectsWithAICosts: metricsWithCosts,
      serverTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in AI costs debug endpoint');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Format token count for display
 */
function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1) + 'M';
  } else if (count >= 1_000) {
    return (count / 1_000).toFixed(0) + 'K';
  }
  return count.toString();
}

export default router;
