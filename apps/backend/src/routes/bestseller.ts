/**
 * Bestseller Analysis Routes
 * Sprint 43-44: Bestseller Formula Integration & Bestseller Mode
 *
 * Provides endpoints for bestseller analysis and validation
 */
import { Router, Request, Response } from 'express';
import db from '../db/connection.js';
import { createLogger } from '../services/logger.service.js';
import { OpeningHookValidatorService } from '../services/opening-hook-validator.service.js';
import { TensionArcValidatorService } from '../services/tension-arc-validator.service.js';
import { CharacterArcValidatorService } from '../services/character-arc-validator.service.js';
import { BestsellerModeService } from '../services/bestseller-mode.service.js';

const router = Router();
const logger = createLogger('routes:bestseller');

const openingHookValidator = new OpeningHookValidatorService();
const tensionArcValidator = new TensionArcValidatorService();
const characterArcValidator = new CharacterArcValidatorService();
const bestsellerModeService = new BestsellerModeService();

/**
 * GET /api/bestseller/:bookId/analysis
 * Get full bestseller analysis for a book
 */
router.get('/:bookId/analysis', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;

    const [openingHook, tensionArc, characterArc] = await Promise.all([
      openingHookValidator.analyseOpeningHook(bookId),
      tensionArcValidator.analyseTensionArc(bookId),
      characterArcValidator.analyseCharacterArc(bookId)
    ]);

    // Calculate overall bestseller score from available metrics
    const scores: number[] = [
      openingHook.score || 0,
      tensionArc.overallArcScore || 0
    ];

    // Add character arc completion if we have characters
    if (characterArc.characters.length > 0) {
      const avgArcCompleteness = characterArc.characters.reduce((sum, char) => sum + char.arcCompleteness, 0) / characterArc.characters.length;
      scores.push(avgArcCompleteness / 10); // Normalize to 0-10 scale
    }

    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    res.json({
      bookId,
      overallScore,
      openingHook,
      tensionArc,
      characterArc
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error running bestseller analysis');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bestseller/:projectId/enable
 * Enable bestseller mode for a project
 */
router.post('/:projectId/enable', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    bestsellerModeService.toggleBestsellerMode(projectId, true);

    logger.info({ projectId }, 'Bestseller mode enabled');
    res.json({ success: true, message: 'Bestseller mode enabled' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error enabling bestseller mode');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bestseller/:projectId/disable
 * Disable bestseller mode for a project
 */
router.post('/:projectId/disable', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    bestsellerModeService.toggleBestsellerMode(projectId, false);

    logger.info({ projectId }, 'Bestseller mode disabled');
    res.json({ success: true, message: 'Bestseller mode disabled' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error disabling bestseller mode');
    res.status(500).json({ error: error.message });
  }
});

export default router;
