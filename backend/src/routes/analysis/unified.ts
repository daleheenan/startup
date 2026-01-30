/**
 * Unified Analysis Routes
 *
 * Provides endpoints for comprehensive manuscript analysis using the
 * Unified Analysis Engine that orchestrates all analysis types.
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '../../services/logger.service.js';
import {
  unifiedAnalysisService,
  type AnalysisType,
  type AnalysisOptions
} from '../../services/unified-analysis.service.js';

const router = Router();
const logger = createLogger('routes:analysis:unified');

/**
 * POST /api/analysis/:bookId/comprehensive
 * Run comprehensive analysis on a book (all applicable analyses based on genre)
 */
router.post('/:bookId/comprehensive', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const options: AnalysisOptions = {
      forceRefresh: req.body.forceRefresh || false,
      includeChapterBreakdown: req.body.options?.includeChapterBreakdown ?? true,
      detailLevel: req.body.options?.detailLevel || 'standard'
    };

    logger.info({ bookId, options }, '[UnifiedAnalysis] Running comprehensive analysis');

    const report = await unifiedAnalysisService.analyse(
      bookId,
      ['comprehensive'],
      options
    );

    res.json(report);
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error running comprehensive analysis'
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analysis/:bookId/custom
 * Run custom selection of analyses on a book
 */
router.post('/:bookId/custom', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const { analysisTypes, forceRefresh } = req.body;

    if (!analysisTypes || !Array.isArray(analysisTypes)) {
      return res.status(400).json({
        error: 'analysisTypes array is required'
      });
    }

    const options: AnalysisOptions = {
      forceRefresh: forceRefresh || false,
      includeChapterBreakdown: req.body.options?.includeChapterBreakdown ?? true,
      detailLevel: req.body.options?.detailLevel || 'standard'
    };

    logger.info({ bookId, analysisTypes, options }, '[UnifiedAnalysis] Running custom analysis');

    const report = await unifiedAnalysisService.analyse(
      bookId,
      analysisTypes as AnalysisType[],
      options
    );

    res.json(report);
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error running custom analysis'
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/:bookId/status
 * Get cached analysis status and freshness information
 */
router.get('/:bookId/status', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    const status = await unifiedAnalysisService.getAnalysisStatus(bookId);

    res.json(status);
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error getting analysis status'
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/analysis/:bookId/cache
 * Invalidate all cached analyses for a book
 */
router.delete('/:bookId/cache', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    unifiedAnalysisService.invalidateCache(bookId);

    logger.info({ bookId }, '[UnifiedAnalysis] Cache invalidated');

    res.json({
      success: true,
      message: 'Cache invalidated successfully'
    });
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error invalidating cache'
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analysis/:bookId/prose
 * Run all prose quality analyses (readability, sentence variety, passive voice, adverbs)
 */
router.post('/:bookId/prose', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const options: AnalysisOptions = {
      forceRefresh: req.body.forceRefresh || false,
      detailLevel: req.body.detailLevel || 'standard'
    };

    logger.info({ bookId, options }, '[UnifiedAnalysis] Running prose analysis');

    const report = await unifiedAnalysisService.analyse(
      bookId,
      ['prose-full'],
      options
    );

    res.json(report);
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error running prose analysis'
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analysis/:bookId/bestseller
 * Run all bestseller formula validations (opening hook, tension arc, character arc)
 */
router.post('/:bookId/bestseller', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const options: AnalysisOptions = {
      forceRefresh: req.body.forceRefresh || false,
      detailLevel: req.body.detailLevel || 'standard'
    };

    logger.info({ bookId, options }, '[UnifiedAnalysis] Running bestseller analysis');

    const report = await unifiedAnalysisService.analyse(
      bookId,
      ['bestseller-full'],
      options
    );

    res.json(report);
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error running bestseller analysis'
    );
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analysis/:bookId/genre
 * Run genre convention validation
 */
router.post('/:bookId/genre', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const options: AnalysisOptions = {
      forceRefresh: req.body.forceRefresh || false,
      detailLevel: req.body.detailLevel || 'standard'
    };

    logger.info({ bookId, options }, '[UnifiedAnalysis] Running genre analysis');

    const report = await unifiedAnalysisService.analyse(
      bookId,
      ['genre-conventions'],
      options
    );

    res.json(report);
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack, bookId: req.params.bookId },
      '[UnifiedAnalysis] Error running genre analysis'
    );
    res.status(500).json({ error: error.message });
  }
});

export default router;
