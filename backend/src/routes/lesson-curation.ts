/**
 * Lesson Curation Routes
 *
 * API endpoints for AI-assisted curation of editorial lessons
 */

import express from 'express';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { lessonCurationService, CurationStatus } from '../services/lesson-curation.service.js';

const router = express.Router();
const logger = createLogger('routes:lesson-curation');

// =============================================================================
// Analysis Endpoints
// =============================================================================

/**
 * POST /api/lesson-curation/analyse
 * Run AI-assisted analysis on all lessons to detect issues
 */
router.post('/analyse', async (req, res) => {
  const { projectId } = req.body;

  try {
    const result = await lessonCurationService.analyseLessons(projectId);
    res.json(result);
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to analyse lessons');
    return sendInternalError(res, error, 'analyse lessons');
  }
});

/**
 * GET /api/lesson-curation/stats
 * Get curation statistics
 */
router.get('/stats', (_req, res) => {
  try {
    const stats = lessonCurationService.getCurationStats();
    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Failed to get curation stats');
    return sendInternalError(res, error, 'get curation stats');
  }
});

/**
 * GET /api/lesson-curation/lessons
 * Get lessons filtered by curation status
 */
router.get('/lessons', (req, res) => {
  const status = (req.query.status as CurationStatus | 'all') || 'all';
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const lessons = lessonCurationService.getLessonsByCurationStatus(status, limit);

    // Map to camelCase for frontend
    const mapped = lessons.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      projectTitle: row.project_title,
      bookId: row.book_id,
      category: row.category,
      title: row.title,
      description: row.description,
      sourceModule: row.source_module,
      severityLevel: row.severity_level,
      isActive: row.is_active === 1,
      effectivenessScore: row.effectiveness_score,
      curationStatus: row.curation_status || 'pending_review',
      isBookSpecific: row.is_book_specific === 1,
      generalisedTitle: row.generalised_title,
      generalisedDescription: row.generalised_description,
      duplicateOfLessonId: row.duplicate_of_lesson_id,
      duplicateSimilarityScore: row.duplicate_similarity_score,
      curationNotes: row.curation_notes,
      lastCuratedAt: row.last_curated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ lessons: mapped });
  } catch (error) {
    logger.error({ error, status }, 'Failed to get lessons by status');
    return sendInternalError(res, error, 'get lessons by status');
  }
});

// =============================================================================
// Curation Action Endpoints
// =============================================================================

/**
 * POST /api/lesson-curation/lessons/:lessonId/decide
 * Apply a curation decision to a lesson
 */
router.post('/lessons/:lessonId/decide', (req, res) => {
  const { lessonId } = req.params;
  const { status, notes, duplicateOfId, similarityScore, generalisedTitle, generalisedDescription, isBookSpecific } = req.body;

  if (!status) {
    return sendBadRequest(res, 'status is required');
  }

  const validStatuses: CurationStatus[] = ['pending_review', 'approved', 'archived', 'duplicate', 'needs_generalisation'];
  if (!validStatuses.includes(status)) {
    return sendBadRequest(res, `status must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    lessonCurationService.applyCurationDecision(lessonId, {
      status,
      notes,
      duplicateOfId,
      similarityScore,
      generalisedTitle,
      generalisedDescription,
      isBookSpecific,
    });

    res.json({ success: true, message: `Lesson marked as ${status}` });
  } catch (error) {
    logger.error({ error, lessonId, status }, 'Failed to apply curation decision');
    return sendInternalError(res, error, 'apply curation decision');
  }
});

/**
 * POST /api/lesson-curation/lessons/:lessonId/generalise
 * Generate and apply generalised version of a book-specific lesson
 */
router.post('/lessons/:lessonId/generalise', async (req, res) => {
  const { lessonId } = req.params;
  const { applyImmediately } = req.body;

  try {
    const generalised = await lessonCurationService.generaliseLesson(lessonId);

    if (applyImmediately) {
      await lessonCurationService.applyGeneralisation(lessonId);
      res.json({
        success: true,
        applied: true,
        ...generalised,
        message: 'Lesson generalised and updated',
      });
    } else {
      res.json({
        success: true,
        applied: false,
        ...generalised,
        message: 'Generalisation generated - review before applying',
      });
    }
  } catch (error) {
    logger.error({ error, lessonId }, 'Failed to generalise lesson');
    return sendInternalError(res, error, 'generalise lesson');
  }
});

/**
 * POST /api/lesson-curation/lessons/:lessonId/apply-generalisation
 * Apply a previously generated generalisation
 */
router.post('/lessons/:lessonId/apply-generalisation', async (req, res) => {
  const { lessonId } = req.params;

  try {
    await lessonCurationService.applyGeneralisation(lessonId);
    res.json({ success: true, message: 'Generalisation applied' });
  } catch (error) {
    logger.error({ error, lessonId }, 'Failed to apply generalisation');
    return sendInternalError(res, error, 'apply generalisation');
  }
});

/**
 * POST /api/lesson-curation/batch-approve
 * Approve multiple lessons at once
 */
router.post('/batch-approve', (req, res) => {
  const { lessonIds } = req.body;

  if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    return sendBadRequest(res, 'lessonIds array is required');
  }

  try {
    const approved = lessonCurationService.batchApprove(lessonIds);
    res.json({
      success: true,
      requested: lessonIds.length,
      approved,
      message: `Approved ${approved} of ${lessonIds.length} lessons`,
    });
  } catch (error) {
    logger.error({ error, count: lessonIds.length }, 'Failed to batch approve');
    return sendInternalError(res, error, 'batch approve');
  }
});

/**
 * POST /api/lesson-curation/merge-duplicates
 * Merge duplicate lessons, keeping the canonical version
 */
router.post('/merge-duplicates', (req, res) => {
  const { canonicalId, duplicateIds } = req.body;

  if (!canonicalId) {
    return sendBadRequest(res, 'canonicalId is required');
  }
  if (!duplicateIds || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
    return sendBadRequest(res, 'duplicateIds array is required');
  }

  try {
    const deleted = lessonCurationService.mergeDuplicates(canonicalId, duplicateIds);
    res.json({
      success: true,
      canonicalId,
      deleted,
      message: `Merged ${deleted} duplicates into canonical lesson`,
    });
  } catch (error) {
    logger.error({ error, canonicalId, count: duplicateIds.length }, 'Failed to merge duplicates');
    return sendInternalError(res, error, 'merge duplicates');
  }
});

/**
 * POST /api/lesson-curation/detect-book-specific
 * Check if specific text contains book-specific content
 */
router.post('/detect-book-specific', (req, res) => {
  const { title, description } = req.body;

  if (!title && !description) {
    return sendBadRequest(res, 'title or description is required');
  }

  try {
    const result = lessonCurationService.detectBookSpecificContent(
      title || '',
      description || ''
    );
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to detect book-specific content');
    return sendInternalError(res, error, 'detect book-specific content');
  }
});

/**
 * POST /api/lesson-curation/bulk-archive
 * Archive multiple lessons at once
 */
router.post('/bulk-archive', (req, res) => {
  const { lessonIds, notes } = req.body;

  if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    return sendBadRequest(res, 'lessonIds array is required');
  }

  try {
    let archived = 0;
    for (const id of lessonIds) {
      try {
        lessonCurationService.applyCurationDecision(id, {
          status: 'archived',
          notes: notes || 'Bulk archived',
        });
        archived++;
      } catch (err) {
        logger.warn({ lessonId: id, error: err }, 'Failed to archive lesson in bulk operation');
      }
    }

    res.json({
      success: true,
      requested: lessonIds.length,
      archived,
      message: `Archived ${archived} of ${lessonIds.length} lessons`,
    });
  } catch (error) {
    logger.error({ error, count: lessonIds.length }, 'Failed to bulk archive');
    return sendInternalError(res, error, 'bulk archive');
  }
});

/**
 * POST /api/lesson-curation/bulk-generalise
 * Generalise multiple book-specific lessons at once
 */
router.post('/bulk-generalise', async (req, res) => {
  const { lessonIds } = req.body;

  if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    return sendBadRequest(res, 'lessonIds array is required');
  }

  try {
    let generalised = 0;
    const errors: Array<{ lessonId: string; error: string }> = [];

    for (const id of lessonIds) {
      try {
        await lessonCurationService.applyGeneralisation(id);
        generalised++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.warn({ lessonId: id, error: err }, 'Failed to generalise lesson in bulk operation');
        errors.push({ lessonId: id, error: errMsg });
      }
    }

    res.json({
      success: true,
      requested: lessonIds.length,
      generalised,
      errors: errors.length > 0 ? errors : undefined,
      message: `Generalised ${generalised} of ${lessonIds.length} lessons`,
    });
  } catch (error) {
    logger.error({ error, count: lessonIds.length }, 'Failed to bulk generalise');
    return sendInternalError(res, error, 'bulk generalise');
  }
});

/**
 * POST /api/lesson-curation/apply-suggestions
 * Apply all suggestions from analysis results
 */
router.post('/apply-suggestions', async (req, res) => {
  const { suggestions, archiveDuplicates, generaliseBookSpecific, approveClean } = req.body;

  if (!suggestions || !Array.isArray(suggestions)) {
    return sendBadRequest(res, 'suggestions array is required');
  }

  try {
    const results = {
      archived: 0,
      generalised: 0,
      approved: 0,
      errors: [] as Array<{ lessonId: string; action: string; error: string }>,
    };

    // Process duplicates first (archive them)
    if (archiveDuplicates) {
      const duplicates = suggestions.filter(s => s.suggestedStatus === 'duplicate');
      for (const dup of duplicates) {
        try {
          lessonCurationService.applyCurationDecision(dup.lessonId, {
            status: 'archived',
            duplicateOfId: dup.duplicateOfId,
            similarityScore: dup.similarityScore,
            notes: `Duplicate of ${dup.duplicateOfId} (${((dup.similarityScore || 0) * 100).toFixed(0)}% match)`,
          });
          results.archived++;
        } catch (err) {
          results.errors.push({
            lessonId: dup.lessonId,
            action: 'archive',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    // Process book-specific lessons (generalise them)
    if (generaliseBookSpecific) {
      const bookSpecific = suggestions.filter(s => s.isBookSpecific && s.suggestedStatus === 'needs_generalisation');
      for (const bs of bookSpecific) {
        try {
          await lessonCurationService.applyGeneralisation(bs.lessonId);
          results.generalised++;
        } catch (err) {
          results.errors.push({
            lessonId: bs.lessonId,
            action: 'generalise',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    // Approve clean lessons (not flagged)
    if (approveClean) {
      const cleanIds = suggestions
        .filter(s => s.suggestedStatus === 'approved')
        .map(s => s.lessonId);

      if (cleanIds.length > 0) {
        results.approved = lessonCurationService.batchApprove(cleanIds);
      }
    }

    res.json({
      success: true,
      ...results,
      message: `Applied suggestions: ${results.archived} archived, ${results.generalised} generalised, ${results.approved} approved`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to apply suggestions');
    return sendInternalError(res, error, 'apply suggestions');
  }
});

export default router;
