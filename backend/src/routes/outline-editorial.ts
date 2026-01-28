/**
 * Outline Editorial Board Routes
 *
 * Provides API endpoints for:
 * - Submitting outlines for editorial review
 * - Checking review processing status
 * - Retrieving outline editorial reports
 * - Skipping review to proceed to chapters
 * - Submitting feedback on findings
 */

import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:outline-editorial');

// =============================================================================
// Database Table Validation
// =============================================================================

/**
 * Check if outline editorial tables exist in the database
 */
function checkOutlineEditorialTablesExist(): { exists: boolean; missing: string[] } {
  const requiredTables = ['outline_editorial_reports', 'outline_editorial_feedback'];
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
    return { exists: missing.length === 0, missing };
  } catch (error) {
    logger.error({ error }, 'Error checking outline editorial tables');
    return { exists: false, missing: requiredTables };
  }
}

/**
 * Middleware to ensure outline editorial tables exist
 */
function requireOutlineEditorialTables(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tableCheck = checkOutlineEditorialTablesExist();
  if (!tableCheck.exists) {
    logger.error({ missing: tableCheck.missing }, 'Outline editorial tables not found');
    return res.status(503).json({
      error: 'Outline Editorial feature unavailable',
      message: 'Database tables for Outline Editorial Board are not initialised. Please contact support.',
      code: 'OUTLINE_EDITORIAL_TABLES_MISSING',
      missingTables: tableCheck.missing,
    });
  }
  next();
}

// Apply table check middleware to all routes
router.use(requireOutlineEditorialTables);

// =============================================================================
// Helper Functions
// =============================================================================

function parseReportRow(row: any): any {
  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    outlineId: row.outline_id,
    status: row.status,
    structureAnalyst: {
      status: row.structure_analyst_status,
      results: row.structure_analyst_results ? JSON.parse(row.structure_analyst_results) : null,
      completedAt: row.structure_analyst_completed_at,
    },
    characterArc: {
      status: row.character_arc_status,
      results: row.character_arc_results ? JSON.parse(row.character_arc_results) : null,
      completedAt: row.character_arc_completed_at,
    },
    marketFit: {
      status: row.market_fit_status,
      results: row.market_fit_results ? JSON.parse(row.market_fit_results) : null,
      completedAt: row.market_fit_completed_at,
    },
    overallScore: row.overall_score,
    summary: row.summary,
    recommendations: row.recommendations ? JSON.parse(row.recommendations) : null,
    readyForGeneration: row.ready_for_generation === 1,
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
 * POST /api/projects/:projectId/outline-editorial/submit
 * Submit outline for editorial review
 */
router.post('/projects/:projectId/outline-editorial/submit', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = db.prepare(`
      SELECT id, title, status, outline_review_status FROM projects WHERE id = ?
    `).get(projectId) as any;

    if (!project) {
      return sendNotFound(res, 'Project');
    }

    // Check if project has an outline
    const outline = db.prepare(`
      SELECT o.id, o.structure FROM outlines o
      JOIN books b ON o.book_id = b.id
      WHERE b.project_id = ?
      LIMIT 1
    `).get(projectId) as any;

    if (!outline || !outline.structure) {
      return sendBadRequest(res, 'Project has no outline to review. Create an outline first.');
    }

    // Check if there's already a pending/processing report
    const existingReport = db.prepare(`
      SELECT id, status FROM outline_editorial_reports
      WHERE project_id = ? AND status IN ('pending', 'processing')
    `).get(projectId) as any;

    if (existingReport) {
      return res.status(409).json({
        error: 'An outline editorial review is already in progress',
        reportId: existingReport.id,
        status: existingReport.status,
      });
    }

    // Import service and submit
    const { outlineEditorialService } = await import('../services/outline-editorial.service.js');
    const result = await outlineEditorialService.submitOutlineForReview(projectId);

    // Queue the three analysis modules as jobs
    // Note: outline_editorial_finalize is NOT queued here - it will be queued automatically
    // by the last module to complete (see worker.ts maybeQueueOutlineEditorialFinalize)
    const { QueueWorker } = await import('../queue/worker.js');
    QueueWorker.createJob('outline_structure_analyst', result.reportId);
    QueueWorker.createJob('outline_character_arc', result.reportId);
    QueueWorker.createJob('outline_market_fit', result.reportId);

    // Update report status to processing
    db.prepare(`
      UPDATE outline_editorial_reports SET status = 'processing' WHERE id = ?
    `).run(result.reportId);

    logger.info({ projectId, reportId: result.reportId }, 'Outline editorial submission initiated with jobs queued');

    res.status(201).json({
      success: true,
      reportId: result.reportId,
      status: 'processing',
      message: 'Outline submitted for editorial review',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error submitting outline for editorial review');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

/**
 * GET /api/projects/:projectId/outline-editorial/status
 * Check outline editorial processing status
 */
router.get('/projects/:projectId/outline-editorial/status', (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project review status
    const project = db.prepare(`
      SELECT outline_review_status, outline_review_completed_at FROM projects WHERE id = ?
    `).get(projectId) as any;

    if (!project) {
      return sendNotFound(res, 'Project');
    }

    // Get the most recent report
    const report = db.prepare(`
      SELECT * FROM outline_editorial_reports
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    if (!report) {
      return res.json({
        hasReport: false,
        projectReviewStatus: project.outline_review_status,
        status: null,
        modules: null,
        progress: 0,
      });
    }

    // Calculate progress based on module statuses
    let completedModules = 0;
    const modules = {
      structureAnalyst: report.structure_analyst_status,
      characterArc: report.character_arc_status,
      marketFit: report.market_fit_status,
    };

    if (report.structure_analyst_status === 'completed') completedModules++;
    if (report.character_arc_status === 'completed') completedModules++;
    if (report.market_fit_status === 'completed') completedModules++;

    const progress = Math.round((completedModules / 3) * 100);

    res.json({
      hasReport: true,
      projectReviewStatus: project.outline_review_status,
      reportId: report.id,
      status: report.status,
      modules,
      progress,
      overallScore: report.overall_score,
      readyForGeneration: report.ready_for_generation === 1,
      createdAt: report.created_at,
      completedAt: report.completed_at,
      error: report.error,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error getting outline editorial status');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

/**
 * GET /api/projects/:projectId/outline-editorial/report
 * Get the full outline editorial report
 */
router.get('/projects/:projectId/outline-editorial/report', (req, res) => {
  try {
    const { projectId } = req.params;

    const report = db.prepare(`
      SELECT * FROM outline_editorial_reports
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(projectId) as any;

    if (!report) {
      return sendNotFound(res, 'Outline editorial report');
    }

    res.json(parseReportRow(report));
  } catch (error: any) {
    logger.error({ error }, 'Error getting outline editorial report');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

/**
 * POST /api/projects/:projectId/outline-editorial/skip
 * Skip outline editorial review and proceed to chapters
 */
router.post('/projects/:projectId/outline-editorial/skip', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const project = db.prepare(`
      SELECT id, outline_review_status FROM projects WHERE id = ?
    `).get(projectId) as any;

    if (!project) {
      return sendNotFound(res, 'Project');
    }

    // Check if already reviewed or skipped
    if (project.outline_review_status === 'approved' || project.outline_review_status === 'skipped') {
      return res.json({
        success: true,
        message: 'Outline review already completed or skipped',
        status: project.outline_review_status,
      });
    }

    // Skip the review
    const { outlineEditorialService } = await import('../services/outline-editorial.service.js');
    await outlineEditorialService.skipOutlineReview(projectId);

    logger.info({ projectId }, 'Outline editorial review skipped');

    res.json({
      success: true,
      message: 'Outline review skipped. You can proceed to chapter generation.',
      status: 'skipped',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error skipping outline editorial review');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

/**
 * POST /api/outline-editorial/reports/:reportId/feedback
 * Submit feedback on a specific finding
 */
router.post('/outline-editorial/reports/:reportId/feedback', (req, res) => {
  try {
    const { reportId } = req.params;
    const { module, findingIndex, feedbackType, notes } = req.body;

    // Validate required fields
    if (!module || feedbackType === undefined) {
      return sendBadRequest(res, 'module and feedbackType are required');
    }

    // Validate module
    const validModules = ['structure_analyst', 'character_arc', 'market_fit'];
    if (!validModules.includes(module)) {
      return sendBadRequest(res, `Invalid module. Must be one of: ${validModules.join(', ')}`);
    }

    // Validate feedback type
    const validFeedbackTypes = ['accept', 'reject', 'revision_planned', 'revision_completed'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return sendBadRequest(res, `Invalid feedbackType. Must be one of: ${validFeedbackTypes.join(', ')}`);
    }

    // Verify report exists
    const report = db.prepare(`
      SELECT id FROM outline_editorial_reports WHERE id = ?
    `).get(reportId);

    if (!report) {
      return sendNotFound(res, 'Outline editorial report');
    }

    // Check for existing feedback
    const existingFeedback = db.prepare(`
      SELECT id FROM outline_editorial_feedback
      WHERE report_id = ? AND module = ? AND (finding_index = ? OR (finding_index IS NULL AND ? IS NULL))
    `).get(reportId, module, findingIndex, findingIndex) as any;

    const feedbackId = existingFeedback?.id || randomUUID();
    const now = new Date().toISOString();

    if (existingFeedback) {
      db.prepare(`
        UPDATE outline_editorial_feedback
        SET feedback_type = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(feedbackType, notes || null, now, feedbackId);
    } else {
      db.prepare(`
        INSERT INTO outline_editorial_feedback (id, report_id, module, finding_index, feedback_type, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(feedbackId, reportId, module, findingIndex, feedbackType, notes || null, now, now);
    }

    logger.info({ reportId, feedbackId, module, feedbackType }, 'Outline editorial feedback submitted');

    res.json({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error submitting outline editorial feedback');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

/**
 * GET /api/outline-editorial/reports/:reportId/feedback
 * Get all feedback for a report
 */
router.get('/outline-editorial/reports/:reportId/feedback', (req, res) => {
  try {
    const { reportId } = req.params;

    const feedback = db.prepare(`
      SELECT * FROM outline_editorial_feedback
      WHERE report_id = ?
      ORDER BY created_at DESC
    `).all(reportId) as any[];

    res.json({
      feedback: feedback.map(f => ({
        id: f.id,
        reportId: f.report_id,
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
    logger.error({ error }, 'Error getting outline editorial feedback');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

/**
 * DELETE /api/outline-editorial/reports/:reportId
 * Delete an outline editorial report
 */
router.delete('/outline-editorial/reports/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;

    const report = db.prepare(`
      SELECT id, project_id FROM outline_editorial_reports WHERE id = ?
    `).get(reportId) as any;

    if (!report) {
      return sendNotFound(res, 'Outline editorial report');
    }

    // Delete feedback first
    db.prepare(`DELETE FROM outline_editorial_feedback WHERE report_id = ?`).run(reportId);

    // Delete report
    db.prepare(`DELETE FROM outline_editorial_reports WHERE id = ?`).run(reportId);

    // Reset project review status
    db.prepare(`
      UPDATE projects SET outline_review_status = NULL, outline_review_completed_at = NULL WHERE id = ?
    `).run(report.project_id);

    logger.info({ reportId }, 'Outline editorial report deleted');

    res.json({
      success: true,
      message: 'Outline editorial report deleted',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error deleting outline editorial report');
    sendInternalError(res, error, 'Outline editorial operation');
  }
});

export default router;
