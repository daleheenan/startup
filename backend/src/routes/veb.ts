/**
 * VEB (Virtual Editorial Board) Routes
 *
 * Provides API endpoints for:
 * - Submitting manuscripts to VEB for review
 * - Checking VEB processing status
 * - Retrieving editorial reports
 * - Submitting feedback on findings
 */

import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:veb');

// =============================================================================
// Database Table Validation
// =============================================================================

/**
 * Check if VEB tables exist in the database
 * This prevents crashes when migration 027 hasn't been applied
 */
function checkVEBTablesExist(): { exists: boolean; missing: string[] } {
  const requiredTables = ['editorial_reports', 'veb_feedback'];
  const missing: string[] = [];

  try {
    for (const table of requiredTables) {
      const result = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name = ?
      `).get(table);
      if (!result) {
        missing.push(table);
      }
    }
    if (missing.length > 0) {
      logger.warn({ missing }, 'VEB tables check: some tables missing');
    }
    return { exists: missing.length === 0, missing };
  } catch (error) {
    logger.error({ error }, 'Error checking VEB tables');
    return { exists: false, missing: requiredTables };
  }
}

/**
 * Middleware to ensure VEB tables exist before processing requests
 */
function requireVEBTables(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tableCheck = checkVEBTablesExist();
  if (!tableCheck.exists) {
    logger.error({ missing: tableCheck.missing }, 'VEB tables not found - migration may not have run');
    return res.status(503).json({
      error: 'VEB feature unavailable',
      message: 'Database tables for Virtual Editorial Board are not initialized. Please contact support.',
      code: 'VEB_TABLES_MISSING',
      missingTables: tableCheck.missing,
    });
  }
  next();
}

// Apply table check middleware to all VEB routes
router.use(requireVEBTables);

// =============================================================================
// Helper Functions
// =============================================================================

function parseReportRow(row: any): any {
  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    betaSwarm: {
      status: row.beta_swarm_status,
      results: row.beta_swarm_results ? JSON.parse(row.beta_swarm_results) : null,
      completedAt: row.beta_swarm_completed_at,
    },
    ruthlessEditor: {
      status: row.ruthless_editor_status,
      results: row.ruthless_editor_results ? JSON.parse(row.ruthless_editor_results) : null,
      completedAt: row.ruthless_editor_completed_at,
    },
    marketAnalyst: {
      status: row.market_analyst_status,
      results: row.market_analyst_results ? JSON.parse(row.market_analyst_results) : null,
      completedAt: row.market_analyst_completed_at,
    },
    overallScore: row.overall_score,
    summary: row.summary,
    recommendations: row.recommendations ? JSON.parse(row.recommendations) : null,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    error: row.error,
  };
}

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * POST /api/projects/:projectId/veb/submit
 * Submit a completed manuscript to the Virtual Editorial Board
 *
 * The VEB will analyze the manuscript through three modules:
 * - Beta Swarm: Reader engagement analysis
 * - Ruthless Editor: Structural analysis
 * - Market Analyst: Commercial viability
 */
router.post('/projects/:projectId/veb/submit', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = db.prepare(`
      SELECT id, title, status FROM projects WHERE id = ?
    `).get(projectId) as any;

    if (!project) {
      return sendNotFound(res, 'Project');
    }

    // Check if project has completed chapters
    const chapterCount = db.prepare(`
      SELECT COUNT(*) as count FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ? AND c.status = 'completed' AND c.content IS NOT NULL
    `).get(projectId) as any;

    if (chapterCount.count === 0) {
      return sendBadRequest(res, 'Project has no completed chapters to analyze');
    }

    // Check if there's already a pending/processing VEB report
    const existingReport = db.prepare(`
      SELECT id, status FROM editorial_reports
      WHERE project_id = ? AND status IN ('pending', 'processing')
    `).get(projectId) as any;

    if (existingReport) {
      return res.status(409).json({
        error: 'A VEB analysis is already in progress for this project',
        reportId: existingReport.id,
        status: existingReport.status,
      });
    }

    // Import VEB service and submit
    const { vebService } = await import('../services/veb.service.js');
    const result = await vebService.submitToVEB(projectId);

    // Queue the three analysis modules as jobs
    const { QueueWorker } = await import('../queue/worker.js');
    QueueWorker.createJob('veb_beta_swarm', result.reportId);
    QueueWorker.createJob('veb_ruthless_editor', result.reportId);
    QueueWorker.createJob('veb_market_analyst', result.reportId);
    QueueWorker.createJob('veb_finalize', result.reportId);

    // Update report status to processing
    db.prepare(`
      UPDATE editorial_reports SET status = 'processing' WHERE id = ?
    `).run(result.reportId);

    logger.info({ projectId, reportId: result.reportId }, 'VEB submission initiated with jobs queued');

    res.status(201).json({
      success: true,
      reportId: result.reportId,
      status: 'processing',
      message: 'Manuscript submitted to Virtual Editorial Board',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error submitting to VEB');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * GET /api/projects/:projectId/veb/status
 * Check VEB processing status for a project
 */
router.get('/projects/:projectId/veb/status', (req, res) => {
  try {
    const { projectId } = req.params;

    // Get the most recent report for this project
    const report = db.prepare(`
      SELECT * FROM editorial_reports
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    if (!report) {
      return res.json({
        hasReport: false,
        status: null,
        modules: null,
        progress: 0,
      });
    }

    // Calculate progress based on module statuses
    let completedModules = 0;
    const modules = {
      betaSwarm: report.beta_swarm_status,
      ruthlessEditor: report.ruthless_editor_status,
      marketAnalyst: report.market_analyst_status,
    };

    if (report.beta_swarm_status === 'completed') completedModules++;
    if (report.ruthless_editor_status === 'completed') completedModules++;
    if (report.market_analyst_status === 'completed') completedModules++;

    const progress = Math.round((completedModules / 3) * 100);

    res.json({
      hasReport: true,
      reportId: report.id,
      status: report.status,
      modules,
      progress,
      createdAt: report.created_at,
      completedAt: report.completed_at,
      error: report.error,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting VEB status');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * GET /api/projects/:projectId/veb/report
 * Get the full editorial report for a project
 */
router.get('/projects/:projectId/veb/report', (req, res) => {
  try {
    const { projectId } = req.params;

    // Get the most recent completed report
    const report = db.prepare(`
      SELECT * FROM editorial_reports
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    if (!report) {
      return sendNotFound(res, 'Editorial report');
    }

    res.json(parseReportRow(report));
  } catch (error: any) {
    logger.error({ error }, 'Error getting VEB report');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * GET /api/projects/:projectId/veb/reports
 * Get all editorial reports for a project (history)
 */
router.get('/projects/:projectId/veb/reports', (req, res) => {
  try {
    const { projectId } = req.params;

    const reports = db.prepare(`
      SELECT * FROM editorial_reports
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as any[];

    res.json({
      reports: reports.map(parseReportRow),
      total: reports.length,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting VEB reports');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * GET /api/veb/reports/:reportId
 * Get a specific editorial report by ID
 */
router.get('/veb/reports/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;

    const report = db.prepare(`
      SELECT * FROM editorial_reports WHERE id = ?
    `).get(reportId) as any;

    if (!report) {
      return sendNotFound(res, 'Editorial report');
    }

    res.json(parseReportRow(report));
  } catch (error: any) {
    logger.error({ error }, 'Error getting VEB report');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * POST /api/veb/reports/:reportId/feedback
 * Submit feedback on a specific finding
 *
 * Allows users to:
 * - Accept a finding (acknowledge the issue)
 * - Reject a finding (disagree with the assessment)
 * - Queue for rewrite (mark chapter for revision based on finding)
 */
router.post('/veb/reports/:reportId/feedback', (req, res) => {
  try {
    const { reportId } = req.params;
    const { chapterId, module, findingIndex, feedbackType, notes } = req.body;

    // Validate required fields
    if (!module || feedbackType === undefined) {
      return sendBadRequest(res, 'module and feedbackType are required');
    }

    // Validate module
    const validModules = ['beta_swarm', 'ruthless_editor', 'market_analyst'];
    if (!validModules.includes(module)) {
      return sendBadRequest(res, `Invalid module. Must be one of: ${validModules.join(', ')}`);
    }

    // Validate feedback type
    const validFeedbackTypes = ['accept', 'reject', 'rewrite_queued', 'rewrite_completed'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return sendBadRequest(res, `Invalid feedbackType. Must be one of: ${validFeedbackTypes.join(', ')}`);
    }

    // Verify report exists
    const report = db.prepare(`
      SELECT id FROM editorial_reports WHERE id = ?
    `).get(reportId);

    if (!report) {
      return sendNotFound(res, 'Editorial report');
    }

    // Check for existing feedback on this finding
    const existingFeedback = db.prepare(`
      SELECT id FROM veb_feedback
      WHERE report_id = ? AND module = ? AND (finding_index = ? OR (finding_index IS NULL AND ? IS NULL))
        AND (chapter_id = ? OR (chapter_id IS NULL AND ? IS NULL))
    `).get(reportId, module, findingIndex, findingIndex, chapterId, chapterId) as any;

    const feedbackId = existingFeedback?.id || randomUUID();
    const now = new Date().toISOString();

    if (existingFeedback) {
      // Update existing feedback
      db.prepare(`
        UPDATE veb_feedback
        SET feedback_type = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(feedbackType, notes || null, now, feedbackId);
    } else {
      // Insert new feedback
      db.prepare(`
        INSERT INTO veb_feedback (id, report_id, chapter_id, module, finding_index, feedback_type, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(feedbackId, reportId, chapterId || null, module, findingIndex, feedbackType, notes || null, now, now);
    }

    logger.info({ reportId, feedbackId, module, feedbackType }, 'VEB feedback submitted');

    res.json({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error submitting VEB feedback');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * GET /api/veb/reports/:reportId/feedback
 * Get all feedback for a report
 */
router.get('/veb/reports/:reportId/feedback', (req, res) => {
  try {
    const { reportId } = req.params;

    const feedback = db.prepare(`
      SELECT * FROM veb_feedback
      WHERE report_id = ?
      ORDER BY created_at DESC
    `).all(reportId) as any[];

    res.json({
      feedback: feedback.map(f => ({
        id: f.id,
        reportId: f.report_id,
        chapterId: f.chapter_id,
        module: f.module,
        findingIndex: f.finding_index,
        feedbackType: f.feedback_type,
        notes: f.notes,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
      total: feedback.length,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting VEB feedback');
    sendInternalError(res, error, 'VEB operation');
  }
});

/**
 * DELETE /api/veb/reports/:reportId
 * Delete an editorial report (and its feedback)
 */
router.delete('/veb/reports/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;

    // Check if report exists
    const report = db.prepare(`
      SELECT id FROM editorial_reports WHERE id = ?
    `).get(reportId);

    if (!report) {
      return sendNotFound(res, 'Editorial report');
    }

    // Delete feedback first (foreign key constraint)
    db.prepare(`DELETE FROM veb_feedback WHERE report_id = ?`).run(reportId);

    // Delete report
    db.prepare(`DELETE FROM editorial_reports WHERE id = ?`).run(reportId);

    logger.info({ reportId }, 'VEB report deleted');

    res.json({
      success: true,
      message: 'Editorial report deleted',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error deleting VEB report');
    sendInternalError(res, error, 'VEB operation');
  }
});

export default router;
