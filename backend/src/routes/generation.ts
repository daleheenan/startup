import { Router } from 'express';
import { chapterOrchestratorService } from '../services/chapter-orchestrator.service.js';
import { progressTrackingService } from '../services/progress-tracking.service.js';
import { sendInternalError } from '../utils/response-helpers.js';

const router = Router();

/**
 * POST /api/generation/book/:bookId/start
 * Start generation for all chapters in a book
 */
router.post('/book/:bookId/start', (req, res) => {
  try {
    const result = chapterOrchestratorService.queueBookGeneration(req.params.bookId);
    res.json({
      success: true,
      message: `Queued ${result.chaptersQueued} chapters for generation`,
      ...result,
    });
  } catch (error: any) {
    sendInternalError(res, error, 'starting book generation');
  }
});

/**
 * GET /api/generation/book/:bookId/progress
 * Get generation progress for a book
 */
router.get('/book/:bookId/progress', (req, res) => {
  try {
    const progress = progressTrackingService.getBookProgress(req.params.bookId);
    res.json(progress);
  } catch (error: any) {
    sendInternalError(res, error, 'fetching book progress');
  }
});

/**
 * GET /api/generation/book/:bookId/stats
 * Get generation statistics for a book
 */
router.get('/book/:bookId/stats', (req, res) => {
  try {
    const stats = chapterOrchestratorService.getBookGenerationStats(req.params.bookId);
    res.json(stats);
  } catch (error: any) {
    sendInternalError(res, error, 'fetching book stats');
  }
});

/**
 * GET /api/generation/project/:projectId/progress
 * Get generation progress for entire project
 */
router.get('/project/:projectId/progress', (req, res) => {
  try {
    const progress = progressTrackingService.getProjectProgress(req.params.projectId);
    res.json(progress);
  } catch (error: any) {
    sendInternalError(res, error, 'fetching project progress');
  }
});

export default router;
