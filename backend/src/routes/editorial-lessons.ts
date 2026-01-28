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

export default router;
