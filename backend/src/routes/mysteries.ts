import { Router } from 'express';
import { mysteryTrackingService } from '../services/mystery-tracking.service.js';

const router = Router();

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
    console.error('[API] Error getting series mysteries:', error);
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
    console.error('[API] Error getting open mysteries:', error);
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
    console.error('[API] Error getting mystery timeline:', error);
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
    console.error('[API] Error extracting mysteries:', error);
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
    console.error('[API] Error finding resolutions:', error);
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
    console.error('[API] Error updating mystery:', error);
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
    console.error('[API] Error deleting mystery:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export default router;
