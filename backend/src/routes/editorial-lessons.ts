/**
 * Editorial Lessons Routes
 *
 * Provides API endpoints for managing editorial lessons learned
 */

import express from 'express';
import db from '../db/connection.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { editorialLessonsService, LessonCategory, SourceModule, SeverityLevel } from '../services/editorial-lessons.service.js';

const router = express.Router();
const logger = createLogger('routes:editorial-lessons');

// =============================================================================
// Database Table Validation
// =============================================================================

/**
 * Check if editorial lessons tables exist
 */
function checkTablesExist(): { exists: boolean; missing: string[] } {
  const requiredTables = ['editorial_lessons', 'editorial_lesson_applications'];
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
      logger.warn({ missing }, 'Editorial lessons tables check: some tables missing');
    }
    return { exists: missing.length === 0, missing };
  } catch (error) {
    logger.error({ error }, 'Error checking editorial lessons tables');
    return { exists: false, missing: requiredTables };
  }
}

/**
 * Middleware to ensure tables exist
 */
function requireTables(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tableCheck = checkTablesExist();
  if (!tableCheck.exists) {
    logger.error({ missing: tableCheck.missing }, 'Editorial lessons tables not found');
    return sendInternalError(res, new Error('Tables not found'), 'editorial lessons initialization');
  }
  next();
}

// Apply middleware to all routes
router.use(requireTables);

// =============================================================================
// Lesson CRUD Endpoints
// =============================================================================

/**
 * POST /api/editorial-lessons
 * Create a new lesson
 */
router.post('/', async (req, res) => {
  const {
    projectId,
    bookId,
    category,
    title,
    description,
    sourceModule,
    originalIssue,
    resolution,
    wordCountImpact,
    severityLevel,
    appliesToGenre,
    appliesToTone,
  } = req.body;

  // Validate required fields
  if (!projectId) {
    return sendBadRequest(res, 'projectId is required');
  }
  if (!category) {
    return sendBadRequest(res, 'category is required');
  }
  if (!title) {
    return sendBadRequest(res, 'title is required');
  }
  if (!description) {
    return sendBadRequest(res, 'description is required');
  }

  try {
    const lesson = editorialLessonsService.createLesson({
      projectId,
      bookId,
      category: category as LessonCategory,
      title,
      description,
      sourceModule: sourceModule as SourceModule,
      originalIssue,
      resolution,
      wordCountImpact,
      severityLevel: severityLevel as SeverityLevel,
      appliesToGenre,
      appliesToTone,
    });

    res.status(201).json(lesson);
  } catch (error) {
    logger.error({ error }, 'Failed to create lesson');
    return sendInternalError(res, error, 'create lesson');
  }
});

/**
 * GET /api/editorial-lessons
 * Get all editorial lessons across all projects
 */
router.get('/', (_req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM editorial_lessons
      ORDER BY created_at DESC
      LIMIT 500
    `);
    const rows = stmt.all() as any[];

    // Map to camelCase for frontend
    const lessons = rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      bookId: row.book_id,
      category: row.category,
      title: row.title,
      description: row.description,
      sourceModule: row.source_module,
      originalIssue: row.original_issue,
      resolution: row.resolution,
      wordCountImpact: row.word_count_impact,
      severityLevel: row.severity_level,
      appliesToGenre: row.applies_to_genre,
      appliesToTone: row.applies_to_tone,
      isActive: row.is_active === 1,
      timesApplied: row.times_applied,
      effectivenessScore: row.effectiveness_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ lessons });
  } catch (error) {
    logger.error({ error }, 'Failed to get all editorial lessons');
    return sendInternalError(res, error, 'get all editorial lessons');
  }
});

/**
 * GET /api/editorial-lessons/projects/:projectId
 * Get all lessons for a project
 */
router.get('/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { activeOnly, category, genre, tone } = req.query;

  try {
    const lessons = editorialLessonsService.getLessonsForProject(projectId, {
      activeOnly: activeOnly === 'true',
      category: category as LessonCategory,
      genre: genre as string,
      tone: tone as string,
    });

    res.json({ lessons });
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get lessons');
    return sendInternalError(res, error, 'get lessons');
  }
});

/**
 * GET /api/editorial-lessons/projects/:projectId/applicable
 * Get lessons applicable to a specific book generation
 */
router.get('/projects/:projectId/applicable', (req, res) => {
  const { projectId } = req.params;
  const { genre, tone } = req.query;

  try {
    const lessons = editorialLessonsService.getApplicableLessons(
      projectId,
      genre as string,
      tone as string
    );

    res.json({ lessons });
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get applicable lessons');
    return sendInternalError(res, error, 'get applicable lessons');
  }
});

/**
 * GET /api/editorial-lessons/projects/:projectId/prompt
 * Get lessons formatted for AI prompt inclusion
 */
router.get('/projects/:projectId/prompt', (req, res) => {
  const { projectId } = req.params;
  const { genre, tone } = req.query;

  try {
    const summary = editorialLessonsService.getLessonsSummaryForPrompt(
      projectId,
      genre as string,
      tone as string
    );

    res.json({ prompt: summary });
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to get lessons prompt');
    return sendInternalError(res, error, 'get lessons prompt');
  }
});

/**
 * GET /api/editorial-lessons/:lessonId
 * Get a specific lesson
 */
router.get('/:lessonId', (req, res) => {
  const { lessonId } = req.params;

  try {
    const lesson = editorialLessonsService.getLesson(lessonId);
    res.json(lesson);
  } catch (error) {
    logger.error({ error, lessonId }, 'Failed to get lesson');
    if (error instanceof Error && error.message.includes('not found')) {
      return sendNotFound(res, 'Lesson');
    }
    return sendInternalError(res, error, 'get lesson');
  }
});

/**
 * PATCH /api/editorial-lessons/:lessonId
 * Update a lesson
 */
router.patch('/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const updates = req.body;

  try {
    const lesson = editorialLessonsService.updateLesson(lessonId, updates);
    res.json(lesson);
  } catch (error) {
    logger.error({ error, lessonId }, 'Failed to update lesson');
    if (error instanceof Error && error.message.includes('not found')) {
      return sendNotFound(res, 'Lesson');
    }
    return sendInternalError(res, error, 'update lesson');
  }
});

/**
 * DELETE /api/editorial-lessons/:lessonId
 * Delete a lesson
 */
router.delete('/:lessonId', (req, res) => {
  const { lessonId } = req.params;

  try {
    editorialLessonsService.deleteLesson(lessonId);
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (error) {
    logger.error({ error, lessonId }, 'Failed to delete lesson');
    return sendInternalError(res, error, 'delete lesson');
  }
});

// =============================================================================
// Lesson Application Endpoints
// =============================================================================

/**
 * POST /api/editorial-lessons/:lessonId/apply
 * Record that a lesson was applied
 */
router.post('/:lessonId/apply', (req, res) => {
  const { lessonId } = req.params;
  const { bookId, chapterId } = req.body;

  if (!bookId) {
    return sendBadRequest(res, 'bookId is required');
  }

  try {
    const application = editorialLessonsService.recordApplication(lessonId, bookId, chapterId);
    res.json(application);
  } catch (error) {
    logger.error({ error, lessonId, bookId }, 'Failed to record application');
    return sendInternalError(res, error, 'record application');
  }
});

/**
 * POST /api/editorial-lessons/applications/:applicationId/feedback
 * Record feedback on lesson effectiveness
 */
router.post('/applications/:applicationId/feedback', (req, res) => {
  const { applicationId } = req.params;
  const { wasEffective, notes } = req.body;

  if (wasEffective === undefined || ![-1, 0, 1].includes(wasEffective)) {
    return sendBadRequest(res, 'wasEffective must be -1, 0, or 1');
  }

  try {
    editorialLessonsService.recordEffectiveness(applicationId, wasEffective, notes);
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    logger.error({ error, applicationId }, 'Failed to record feedback');
    return sendInternalError(res, error, 'record feedback');
  }
});

// =============================================================================
// Extraction Endpoints
// =============================================================================

/**
 * POST /api/editorial-lessons/extract/veb
 * Extract lessons from a VEB report
 */
router.post('/extract/veb', async (req, res) => {
  const { projectId, bookId, vebReport } = req.body;

  if (!projectId || !bookId || !vebReport) {
    return sendBadRequest(res, 'projectId, bookId, and vebReport are required');
  }

  try {
    const lessons = editorialLessonsService.extractLessonsFromVEB(projectId, bookId, vebReport);
    res.json({ lessons, count: lessons.length });
  } catch (error) {
    logger.error({ error, projectId, bookId }, 'Failed to extract VEB lessons');
    return sendInternalError(res, error, 'extract VEB lessons');
  }
});

/**
 * POST /api/editorial-lessons/extract/revision
 * Extract lessons from a word count revision
 */
router.post('/extract/revision', async (req, res) => {
  const { projectId, bookId, revision } = req.body;

  if (!projectId || !bookId || !revision) {
    return sendBadRequest(res, 'projectId, bookId, and revision are required');
  }

  try {
    const lessons = editorialLessonsService.extractLessonsFromRevision(projectId, bookId, revision);
    res.json({ lessons, count: lessons.length });
  } catch (error) {
    logger.error({ error, projectId, bookId }, 'Failed to extract revision lessons');
    return sendInternalError(res, error, 'extract revision lessons');
  }
});

/**
 * POST /api/editorial-lessons/import-from-report/:reportId
 * Import lessons from an existing editorial report (VEB or Outline Editorial)
 * Used for retroactively extracting lessons from reports that were created
 * before automatic lesson extraction was implemented
 */
router.post('/import-from-report/:reportId', async (req, res) => {
  const { reportId } = req.params;

  try {
    // Try to find as VEB report first
    let report = db.prepare(`
      SELECT *, 'veb' as report_type FROM editorial_reports WHERE id = ?
    `).get(reportId) as any;

    // If not found, try outline editorial report
    if (!report) {
      try {
        report = db.prepare(`
          SELECT *, 'outline_editorial' as report_type FROM outline_editorial_reports WHERE id = ?
        `).get(reportId) as any;
      } catch (e) {
        // Table may not exist
      }
    }

    if (!report) {
      return sendNotFound(res, 'Editorial report');
    }

    if (report.status !== 'completed') {
      return sendBadRequest(res, 'Can only import lessons from completed reports');
    }

    // Get book ID for this project
    const bookRow = db.prepare(`
      SELECT b.id FROM books b WHERE b.project_id = ? ORDER BY b.book_number LIMIT 1
    `).get(report.project_id) as any;

    if (!bookRow) {
      return sendBadRequest(res, 'No book found for this project');
    }

    // Check if lessons already exist for this project
    const existingLessons = db.prepare(`
      SELECT COUNT(*) as count FROM editorial_lessons
      WHERE project_id = ? AND book_id = ?
    `).get(report.project_id, bookRow.id) as any;

    let lessons: any[] = [];

    if (report.report_type === 'veb') {
      // Parse VEB results
      const betaSwarm = report.beta_swarm_results ? JSON.parse(report.beta_swarm_results) : null;
      const ruthlessEditor = report.ruthless_editor_results ? JSON.parse(report.ruthless_editor_results) : null;
      const marketAnalyst = report.market_analyst_results ? JSON.parse(report.market_analyst_results) : null;
      const recommendations = report.recommendations ? JSON.parse(report.recommendations) : [];

      // Build the VEB report structure for extraction
      const vebReportData = {
        ruthlessEditor: ruthlessEditor ? {
          chapterResults: ruthlessEditor.chapterResults,
          summaryVerdict: ruthlessEditor.summaryVerdict,
        } : undefined,
        betaSwarm: betaSwarm ? {
          chapterResults: betaSwarm.chapterResults,
          summaryReaction: betaSwarm.summaryReaction,
        } : undefined,
        marketAnalyst: marketAnalyst ? {
          hookAnalysis: marketAnalyst.hookAnalysis,
          marketPositioning: marketAnalyst.marketPositioning,
          agentNotes: marketAnalyst.summaryPitch,
        } : undefined,
        recommendations,
        summary: report.summary,
      };

      // Extract lessons from VEB
      lessons = editorialLessonsService.extractLessonsFromVEB(
        report.project_id,
        bookRow.id,
        vebReportData
      );
    } else if (report.report_type === 'outline_editorial') {
      // Parse Outline Editorial results
      const structureAnalyst = report.structure_analyst_results ? JSON.parse(report.structure_analyst_results) : null;
      const characterArc = report.character_arc_results ? JSON.parse(report.character_arc_results) : null;
      const marketFit = report.market_fit_results ? JSON.parse(report.market_fit_results) : null;
      const recommendations = report.recommendations ? JSON.parse(report.recommendations) : [];

      // Extract lessons from key findings in outline editorial
      // Structure lessons
      if (structureAnalyst?.pacing_issues && structureAnalyst.pacing_issues.length >= 2) {
        lessons.push(editorialLessonsService.createLesson({
          projectId: report.project_id,
          bookId: bookRow.id,
          category: 'pacing',
          title: 'Address outline pacing issues',
          description: `${structureAnalyst.pacing_issues.length} pacing issues identified in outline structure. Review scene distribution and tension arc.`,
          sourceModule: 'ruthless_editor',
          severityLevel: 'moderate',
        }));
      }

      // Character arc lessons
      if (characterArc?.weak_arcs && characterArc.weak_arcs.length > 0) {
        lessons.push(editorialLessonsService.createLesson({
          projectId: report.project_id,
          bookId: bookRow.id,
          category: 'character',
          title: 'Strengthen character arcs',
          description: `Character arc weaknesses identified: ${characterArc.weak_arcs.map((a: any) => a.character || a).join(', ')}. Ensure clear transformation and motivation.`,
          sourceModule: 'beta_swarm',
          severityLevel: 'major',
        }));
      }

      // Market fit lessons
      if (marketFit?.genre_alignment_score && marketFit.genre_alignment_score < 7) {
        lessons.push(editorialLessonsService.createLesson({
          projectId: report.project_id,
          bookId: bookRow.id,
          category: 'market',
          title: 'Improve genre alignment',
          description: `Genre alignment score is ${marketFit.genre_alignment_score}/10. Review genre conventions and reader expectations.`,
          sourceModule: 'market_analyst',
          severityLevel: 'moderate',
        }));
      }

      // Add recommendations as lessons
      if (recommendations && recommendations.length > 0) {
        for (const rec of recommendations.slice(0, 3)) {
          const recText = typeof rec === 'string' ? rec : rec.text || rec.recommendation || '';
          if (recText) {
            lessons.push(editorialLessonsService.createLesson({
              projectId: report.project_id,
              bookId: bookRow.id,
              category: 'other',
              title: 'Outline recommendation',
              description: recText,
              sourceModule: 'ruthless_editor',
              severityLevel: 'moderate',
            }));
          }
        }
      }
    }

    logger.info({
      reportId,
      reportType: report.report_type,
      projectId: report.project_id,
      bookId: bookRow.id,
      lessonsExtracted: lessons.length,
      existingLessons: existingLessons.count
    }, 'Imported lessons from editorial report');

    res.json({
      success: true,
      reportId,
      reportType: report.report_type,
      projectId: report.project_id,
      lessonsImported: lessons.length,
      previousLessonsCount: existingLessons.count,
      message: lessons.length > 0
        ? `Successfully imported ${lessons.length} lessons from the ${report.report_type === 'veb' ? 'manuscript review' : 'outline review'}`
        : 'No lessons could be extracted from this report (thresholds not met)',
    });
  } catch (error) {
    logger.error({ error, reportId }, 'Failed to import lessons from report');
    return sendInternalError(res, error, 'import lessons from report');
  }
});

/**
 * GET /api/editorial-lessons/reports-available
 * Get list of editorial reports that can have lessons imported
 * Includes both VEB (manuscript) and Outline Editorial reports
 */
router.get('/reports-available', async (_req, res) => {
  try {
    const reports: any[] = [];

    // Get VEB (manuscript review) reports
    try {
      const vebReports = db.prepare(`
        SELECT
          er.id,
          er.project_id,
          er.overall_score,
          er.summary,
          er.created_at,
          er.completed_at,
          p.title as project_title,
          'veb' as report_type,
          (SELECT COUNT(*) FROM editorial_lessons el WHERE el.project_id = er.project_id) as lesson_count,
          CASE
            WHEN er.beta_swarm_results IS NOT NULL THEN 1 ELSE 0
          END +
          CASE
            WHEN er.ruthless_editor_results IS NOT NULL THEN 1 ELSE 0
          END +
          CASE
            WHEN er.market_analyst_results IS NOT NULL THEN 1 ELSE 0
          END as modules_completed
        FROM editorial_reports er
        JOIN projects p ON er.project_id = p.id
        WHERE er.status = 'completed'
      `).all() as any[];
      reports.push(...vebReports);
    } catch (e) {
      logger.warn({ error: e }, 'Could not fetch VEB reports - table may not exist');
    }

    // Get Outline Editorial reports
    try {
      const outlineReports = db.prepare(`
        SELECT
          oer.id,
          oer.project_id,
          oer.overall_score,
          oer.summary,
          oer.created_at,
          oer.completed_at,
          p.title as project_title,
          'outline_editorial' as report_type,
          (SELECT COUNT(*) FROM editorial_lessons el WHERE el.project_id = oer.project_id) as lesson_count,
          CASE
            WHEN oer.structure_analyst_results IS NOT NULL THEN 1 ELSE 0
          END +
          CASE
            WHEN oer.character_arc_results IS NOT NULL THEN 1 ELSE 0
          END +
          CASE
            WHEN oer.market_fit_results IS NOT NULL THEN 1 ELSE 0
          END as modules_completed
        FROM outline_editorial_reports oer
        JOIN projects p ON oer.project_id = p.id
        WHERE oer.status = 'completed'
      `).all() as any[];
      reports.push(...outlineReports);
    } catch (e) {
      logger.warn({ error: e }, 'Could not fetch outline editorial reports - table may not exist');
    }

    // Sort by completed_at descending
    reports.sort((a, b) => {
      const dateA = new Date(a.completed_at || a.created_at).getTime();
      const dateB = new Date(b.completed_at || b.created_at).getTime();
      return dateB - dateA;
    });

    res.json({
      reports: reports.map(r => ({
        id: r.id,
        projectId: r.project_id,
        projectTitle: r.project_title,
        reportType: r.report_type,
        reportTypeLabel: r.report_type === 'veb' ? 'Manuscript Review (VEB)' : 'Outline Review',
        overallScore: r.overall_score,
        summary: r.summary,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        modulesCompleted: r.modules_completed,
        existingLessonCount: r.lesson_count,
      })),
      total: reports.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get available reports');
    return sendInternalError(res, error, 'get available reports');
  }
});

export default router;
