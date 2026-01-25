import { Router } from 'express';
import { mysteryTrackingService } from '../services/mystery-tracking.service.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:mysteries');

/**
 * GET /api/mysteries/series/:seriesId
 * Get all mysteries for a series
 */
router.get('/series/:seriesId', (req, res) => {
  try {
    const { seriesId } = req.params;

    const mysteries = mysteryTrackingService.getSeriesMysteries(seriesId);

    res.json({ mysteries });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting series mysteries');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/mysteries/series/:seriesId/open
 * Get open mysteries only
 */
router.get('/series/:seriesId/open', (req, res) => {
  try {
    const { seriesId } = req.params;

    const mysteries = mysteryTrackingService.getOpenMysteries(seriesId);

    res.json({ mysteries });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting open mysteries');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/mysteries/series/:seriesId/timeline
 * Get mystery timeline with raise/resolve points
 */
router.get('/series/:seriesId/timeline', (req, res) => {
  try {
    const { seriesId } = req.params;

    const timeline = mysteryTrackingService.getMysteryTimeline(seriesId);

    res.json({ timeline });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error getting mystery timeline');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/mysteries/chapters/:chapterId/extract
 * Extract mysteries from a chapter
 */
router.post('/chapters/:chapterId/extract', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Content is required' },
      });
    }

    const mysteries = await mysteryTrackingService.extractMysteriesFromChapter(
      chapterId,
      content
    );

    res.json({ mysteries });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error extracting mysteries');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/mysteries/chapters/:chapterId/find-resolutions
 * Find resolutions to open mysteries in a chapter
 */
router.post('/chapters/:chapterId/find-resolutions', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Content is required' },
      });
    }

    const resolutions = await mysteryTrackingService.findMysteryResolutions(
      chapterId,
      content
    );

    res.json({ resolutions });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error finding resolutions');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * PATCH /api/mysteries/:id
 * Update mystery status
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, answer, answeredBook, answeredChapter } = req.body;

    if (!status || !['open', 'resolved', 'red_herring'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Valid status is required (open, resolved, red_herring)',
        },
      });
    }

    const mystery = mysteryTrackingService.updateMysteryStatus(
      id,
      status,
      answer,
      answeredBook,
      answeredChapter
    );

    res.json({ mystery });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating mystery');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * DELETE /api/mysteries/:id
 * Delete a mystery
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    mysteryTrackingService.deleteMystery(id);

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting mystery');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export default router;
