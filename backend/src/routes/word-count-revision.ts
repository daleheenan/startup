/**
 * Word Count Revision Routes
 *
 * Provides API endpoints for:
 * - Starting a word count revision session
 * - Generating AI condensation proposals
 * - Approving/rejecting proposals
 * - Tracking progress toward target
 */

import express from 'express';
import db from '../db/connection.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';
import { wordCountRevisionService } from '../services/word-count-revision.service.js';

const router = express.Router();
const logger = createLogger('routes:word-count-revision');

// =============================================================================
// Database Table Validation
// =============================================================================

/**
 * Check if word count revision tables exist
 */
function checkTablesExist(): { exists: boolean; missing: string[] } {
  const requiredTables = ['word_count_revisions', 'chapter_reduction_proposals'];
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
      logger.warn({ missing }, 'Word count revision tables check: some tables missing');
    }
    return { exists: missing.length === 0, missing };
  } catch (error) {
    logger.error({ error }, 'Error checking word count revision tables');
    return { exists: false, missing: requiredTables };
  }
}

/**
 * Middleware to ensure tables exist
 */
function requireTables(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tableCheck = checkTablesExist();
  if (!tableCheck.exists) {
    logger.error({ missing: tableCheck.missing }, 'Word count revision tables not found');
    return sendInternalError(res, new Error('Tables not found'), 'word count revision initialization');
  }
  next();
}

// Apply middleware to all routes
router.use(requireTables);

// =============================================================================
// Revision Session Endpoints
// =============================================================================

/**
 * POST /api/word-count-revision/books/:bookId/start
 * Start a new revision session
 *
 * Body params:
 * - targetWordCount: number (required, >= 1000)
 * - tolerancePercent: number (optional, default 5)
 * - forceRestart: boolean (optional, abandons existing revision if true)
 */
router.post('/books/:bookId/start', async (req, res) => {
  const { bookId } = req.params;
  const { targetWordCount, tolerancePercent, forceRestart } = req.body;

  logger.info({ bookId, targetWordCount, tolerancePercent, forceRestart }, 'Starting word count revision');

  // Validate required fields
  if (!targetWordCount || typeof targetWordCount !== 'number' || targetWordCount < 1000) {
    return sendBadRequest(res, 'targetWordCount must be a number >= 1000');
  }

  // Check book exists
  const bookStmt = db.prepare<[string], { id: string }>(`SELECT id FROM books WHERE id = ?`);
  const book = bookStmt.get(bookId);
  if (!book) {
    return sendNotFound(res, 'Book');
  }

  try {
    // If forceRestart is true, abandon any existing revision first
    if (forceRestart) {
      const existingRevision = wordCountRevisionService.getActiveRevision(bookId);
      if (existingRevision) {
        logger.info({ existingRevisionId: existingRevision.id }, 'Abandoning existing revision due to forceRestart');
        wordCountRevisionService.abandonRevision(existingRevision.id);
      }
    }

    const revision = await wordCountRevisionService.startRevision(
      bookId,
      targetWordCount,
      tolerancePercent || 5
    );

    res.json(revision);
  } catch (error) {
    logger.error({ error, bookId }, 'Failed to start revision');
    return sendInternalError(res, error, 'start revision');
  }
});

/**
 * GET /api/word-count-revision/books/:bookId/current
 * Get the current active revision for a book
 */
router.get('/books/:bookId/current', (req, res) => {
  const { bookId } = req.params;

  try {
    const revision = wordCountRevisionService.getActiveRevision(bookId);

    if (!revision) {
      return sendNotFound(res, 'Active revision');
    }

    res.json(revision);
  } catch (error) {
    logger.error({ error, bookId }, 'Failed to get current revision');
    return sendInternalError(res, error, 'get current revision');
  }
});

/**
 * GET /api/word-count-revision/:revisionId
 * Get a specific revision by ID
 */
router.get('/:revisionId', (req, res) => {
  const { revisionId } = req.params;

  try {
    const revision = wordCountRevisionService.getRevision(revisionId);
    res.json(revision);
  } catch (error) {
    logger.error({ error, revisionId }, 'Failed to get revision');
    if (error instanceof Error && error.message.includes('not found')) {
      return sendNotFound(res, 'Revision');
    }
    return sendInternalError(res, error, 'get revision');
  }
});

/**
 * DELETE /api/word-count-revision/:revisionId/abandon
 * Abandon a revision session
 */
router.delete('/:revisionId/abandon', (req, res) => {
  const { revisionId } = req.params;

  try {
    wordCountRevisionService.abandonRevision(revisionId);
    res.json({ success: true, message: 'Revision abandoned' });
  } catch (error) {
    logger.error({ error, revisionId }, 'Failed to abandon revision');
    return sendInternalError(res, error, 'abandon revision');
  }
});

/**
 * GET /api/word-count-revision/:revisionId/progress
 * Get progress toward target
 */
router.get('/:revisionId/progress', async (req, res) => {
  const { revisionId } = req.params;

  try {
    const progress = await wordCountRevisionService.getProgress(revisionId);
    res.json(progress);
  } catch (error) {
    logger.error({ error, revisionId }, 'Failed to get progress');
    return sendInternalError(res, error, 'get progress');
  }
});

/**
 * GET /api/word-count-revision/:revisionId/validate
 * Validate if word count is within tolerance
 */
router.get('/:revisionId/validate', async (req, res) => {
  const { revisionId } = req.params;

  try {
    const validation = await wordCountRevisionService.validateCompletion(revisionId);
    res.json(validation);
  } catch (error) {
    logger.error({ error, revisionId }, 'Failed to validate');
    return sendInternalError(res, error, 'validate completion');
  }
});

// =============================================================================
// Chapter Proposal Endpoints
// =============================================================================

/**
 * GET /api/word-count-revision/:revisionId/proposals
 * Get all proposals for a revision
 */
router.get('/:revisionId/proposals', (req, res) => {
  const { revisionId } = req.params;

  try {
    const proposals = wordCountRevisionService.getProposals(revisionId);
    res.json({ proposals });
  } catch (error) {
    logger.error({ error, revisionId }, 'Failed to get proposals');
    return sendInternalError(res, error, 'get proposals');
  }
});

/**
 * GET /api/word-count-revision/:revisionId/chapters/:chapterId/proposal
 * Get the proposal for a specific chapter
 */
router.get('/:revisionId/chapters/:chapterId/proposal', (req, res) => {
  const { revisionId, chapterId } = req.params;

  try {
    const proposals = wordCountRevisionService.getProposals(revisionId);
    const proposal = proposals.find(p => p.chapterId === chapterId);

    if (!proposal) {
      return sendNotFound(res, 'Proposal');
    }

    res.json(proposal);
  } catch (error) {
    logger.error({ error, revisionId, chapterId }, 'Failed to get proposal');
    return sendInternalError(res, error, 'get proposal');
  }
});

/**
 * POST /api/word-count-revision/:revisionId/chapters/:chapterId/generate
 * Generate AI condensation proposal for a chapter
 */
router.post('/:revisionId/chapters/:chapterId/generate', async (req, res) => {
  const { revisionId, chapterId } = req.params;

  logger.info({ revisionId, chapterId }, 'Generating proposal');

  try {
    const proposal = await wordCountRevisionService.generateProposal(revisionId, chapterId);
    res.json(proposal);
  } catch (error) {
    logger.error({ error, revisionId, chapterId }, 'Failed to generate proposal');
    return sendInternalError(res, error, 'generate proposal');
  }
});

/**
 * POST /api/word-count-revision/:revisionId/chapters/:chapterId/approve
 * Approve a proposal - applies condensed content
 */
router.post('/:revisionId/chapters/:chapterId/approve', async (req, res) => {
  const { revisionId, chapterId } = req.params;

  logger.info({ revisionId, chapterId }, 'Approving proposal');

  try {
    // Get the proposal ID
    const proposals = wordCountRevisionService.getProposals(revisionId);
    const proposal = proposals.find(p => p.chapterId === chapterId);

    if (!proposal) {
      return sendNotFound(res, 'Proposal');
    }

    await wordCountRevisionService.approveProposal(proposal.id);

    // Return updated progress
    const progress = await wordCountRevisionService.getProgress(revisionId);
    res.json({ success: true, progress });
  } catch (error) {
    logger.error({ error, revisionId, chapterId }, 'Failed to approve proposal');
    return sendInternalError(res, error, 'approve proposal');
  }
});

/**
 * POST /api/word-count-revision/:revisionId/chapters/:chapterId/reject
 * Reject a proposal
 */
router.post('/:revisionId/chapters/:chapterId/reject', async (req, res) => {
  const { revisionId, chapterId } = req.params;
  const { notes } = req.body;

  logger.info({ revisionId, chapterId }, 'Rejecting proposal');

  try {
    // Get the proposal ID
    const proposals = wordCountRevisionService.getProposals(revisionId);
    const proposal = proposals.find(p => p.chapterId === chapterId);

    if (!proposal) {
      return sendNotFound(res, 'Proposal');
    }

    await wordCountRevisionService.rejectProposal(proposal.id, notes);

    // Return updated progress
    const progress = await wordCountRevisionService.getProgress(revisionId);
    res.json({ success: true, progress });
  } catch (error) {
    logger.error({ error, revisionId, chapterId }, 'Failed to reject proposal');
    return sendInternalError(res, error, 'reject proposal');
  }
});

/**
 * POST /api/word-count-revision/:revisionId/chapters/:chapterId/regenerate
 * Regenerate a proposal with fresh AI generation
 */
router.post('/:revisionId/chapters/:chapterId/regenerate', async (req, res) => {
  const { revisionId, chapterId } = req.params;

  logger.info({ revisionId, chapterId }, 'Regenerating proposal');

  try {
    // Reset proposal status first
    const proposals = wordCountRevisionService.getProposals(revisionId);
    const proposal = proposals.find(p => p.chapterId === chapterId);

    if (!proposal) {
      return sendNotFound(res, 'Proposal');
    }

    // Reset status to pending
    const resetStmt = db.prepare(`
      UPDATE chapter_reduction_proposals
      SET status = 'pending', condensed_content = NULL, condensed_word_count = NULL,
          actual_reduction = NULL, cuts_explanation = NULL, preserved_elements = NULL,
          error_message = NULL, updated_at = ?
      WHERE id = ?
    `);
    resetStmt.run(new Date().toISOString(), proposal.id);

    // Generate new proposal
    const newProposal = await wordCountRevisionService.generateProposal(revisionId, chapterId);
    res.json(newProposal);
  } catch (error) {
    logger.error({ error, revisionId, chapterId }, 'Failed to regenerate proposal');
    return sendInternalError(res, error, 'regenerate proposal');
  }
});

export default router;
