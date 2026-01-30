import express from 'express';
import { completionDetectionService } from '../services/completion-detection.service.js';
import { followUpService } from '../services/follow-up.service.js';
import { QueueWorker } from '../queue/worker.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../utils/response-helpers.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:completion');

/**
 * GET /api/completion/book/:bookId/status
 * Check completion status for a book
 */
router.get('/book/:bookId/status', (req, res) => {
  try {
    const { bookId } = req.params;
    const status = completionDetectionService.checkBookCompletion(bookId);
    res.json(status);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Book');
    }
    sendInternalError(res, error, 'checking completion status');
  }
});

/**
 * POST /api/completion/book/:bookId/mark-complete
 * Manually mark a book as complete
 */
router.post('/book/:bookId/mark-complete', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book is actually complete
    const status = await completionDetectionService.checkBookCompletion(bookId);
    if (!status.isComplete) {
      return sendBadRequest(
        res,
        `Book is not complete. ${status.completedChapters}/${status.totalChapters} chapters have content.`
      );
    }

    // Mark as complete
    const record = await completionDetectionService.markBookComplete(bookId);

    // Trigger auto-analysis
    const analysisResult = completionDetectionService.triggerAutoAnalysis(bookId);

    res.json({
      completionRecord: record,
      analysisTriggered: analysisResult.success,
      message: analysisResult.message,
    });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return sendNotFound(res, 'Book');
    }
    sendInternalError(res, error, 'marking book complete');
  }
});

/**
 * GET /api/completion/book/:bookId
 * Get completion record for a book
 */
router.get('/book/:bookId', (req, res) => {
  try {
    const { bookId } = req.params;
    const record = completionDetectionService.getCompletionRecord(bookId);

    if (!record) {
      return sendNotFound(res, 'Completion record');
    }

    // Parse cached analytics if present
    let cachedAnalytics = null;
    if (record.cached_analytics) {
      try {
        cachedAnalytics = JSON.parse(record.cached_analytics);
      } catch {
        // Ignore parse errors
      }
    }

    res.json({
      ...record,
      cached_analytics: cachedAnalytics,
    });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching completion record');
  }
});

/**
 * GET /api/completion/project/:projectId
 * Get all completion records for a project
 */
router.get('/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const records = completionDetectionService.getProjectCompletions(projectId);
    res.json({ completions: records });
  } catch (error: any) {
    sendInternalError(res, error, 'fetching project completions');
  }
});

/**
 * POST /api/completion/book/:bookId/reanalyse
 * Re-run analytics for a completed book
 */
router.post('/book/:bookId/reanalyse', (req, res) => {
  try {
    const { bookId } = req.params;
    const result = completionDetectionService.reanalyse(bookId);

    if (!result.success) {
      return sendBadRequest(res, result.message);
    }

    res.json({ success: true, message: result.message });
  } catch (error: any) {
    sendInternalError(res, error, 're-analysing book');
  }
});

// =============================================================================
// Follow-Up Recommendations Routes
// =============================================================================

/**
 * GET /api/completion/book/:bookId/follow-up
 * Get follow-up recommendations for a book
 */
router.get('/book/:bookId/follow-up', (req, res) => {
  try {
    const { bookId } = req.params;
    const recommendations = followUpService.getFollowUpRecommendations(bookId);

    if (!recommendations) {
      return sendNotFound(res, 'Follow-up recommendations');
    }

    res.json(recommendations);
  } catch (error: any) {
    sendInternalError(res, error, 'fetching follow-up recommendations');
  }
});

/**
 * POST /api/completion/book/:bookId/follow-up/generate
 * Generate follow-up recommendations for a completed book
 */
router.post('/book/:bookId/follow-up/generate', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book is complete
    const status = await completionDetectionService.checkBookCompletion(bookId);
    if (!status.isComplete) {
      return sendBadRequest(
        res,
        `Book must be complete to generate follow-up recommendations. ${status.completedChapters}/${status.totalChapters} chapters have content.`
      );
    }

    // Check if already generating
    const existing = followUpService.getFollowUpRecommendations(bookId);
    if (existing && existing.status === 'generating') {
      return sendBadRequest(res, 'Follow-up recommendations are already being generated.');
    }

    // Queue the job
    const jobId = QueueWorker.createJob('generate_follow_up', bookId);

    res.json({
      success: true,
      message: 'Follow-up generation job queued.',
      jobId,
    });
  } catch (error: any) {
    sendInternalError(res, error, 'generating follow-up recommendations');
  }
});

/**
 * POST /api/completion/book/:bookId/follow-up/regenerate
 * Regenerate follow-up recommendations
 */
router.post('/book/:bookId/follow-up/regenerate', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book is complete
    const status = await completionDetectionService.checkBookCompletion(bookId);
    if (!status.isComplete) {
      return sendBadRequest(res, 'Book must be complete to generate follow-up recommendations.');
    }

    // Queue the job (it will reset and regenerate)
    const jobId = QueueWorker.createJob('generate_follow_up', bookId);

    res.json({
      success: true,
      message: 'Follow-up regeneration job queued.',
      jobId,
    });
  } catch (error: any) {
    sendInternalError(res, error, 'regenerating follow-up recommendations');
  }
});

export default router;
