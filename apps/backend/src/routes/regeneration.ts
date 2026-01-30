import express from 'express';
import { regenerationService } from '../services/regeneration.service.js';
import type {
  RegenerateSelectionRequest,
  ApplyVariationRequest,
  RegenerateSceneRequest,
} from '../shared/types/index.js';
import { createLogger } from '../services/logger.service.js';

const router = express.Router();
const logger = createLogger('routes:regeneration');

/**
 * POST /api/regeneration/chapters/:chapterId/regenerate-selection
 * Generate 3 variations for a selected text range
 */
router.post('/chapters/:chapterId/regenerate-selection', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { selectionStart, selectionEnd, mode, contextTokens }: RegenerateSelectionRequest = req.body;

    // Validation
    if (typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') {
      return res.status(400).json({ error: 'selectionStart and selectionEnd are required' });
    }

    if (!mode || !['general', 'dialogue', 'description', 'scene'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid regeneration mode' });
    }

    if (selectionStart < 0 || selectionEnd <= selectionStart) {
      return res.status(400).json({ error: 'Invalid selection range' });
    }

    // Generate variations
    const result = await regenerationService.generateVariations(
      chapterId,
      selectionStart,
      selectionEnd,
      mode,
      contextTokens || 500
    );

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, chapterId: req.params.chapterId }, 'Error generating variations');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/regeneration/chapters/:chapterId/apply-variation
 * Apply a selected variation to the chapter edit
 */
router.post('/chapters/:chapterId/apply-variation', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { variationId, selectedVariation }: ApplyVariationRequest = req.body;

    // Validation
    if (!variationId) {
      return res.status(400).json({ error: 'variationId is required' });
    }

    if (typeof selectedVariation !== 'number' || selectedVariation < 0 || selectedVariation > 3) {
      return res.status(400).json({ error: 'selectedVariation must be 0-3' });
    }

    // Apply variation
    const result = await regenerationService.applyVariation(
      chapterId,
      variationId,
      selectedVariation
    );

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, chapterId: req.params.chapterId }, 'Error applying variation');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/regeneration/chapters/:chapterId/regenerate-scene
 * Regenerate an entire scene within a chapter
 */
router.post('/chapters/:chapterId/regenerate-scene', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { sceneIndex }: RegenerateSceneRequest = req.body;

    // Validation
    if (typeof sceneIndex !== 'number' || sceneIndex < 0) {
      return res.status(400).json({ error: 'Invalid sceneIndex' });
    }

    // Regenerate scene
    const result = await regenerationService.regenerateScene(chapterId, sceneIndex);

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, chapterId: req.params.chapterId }, 'Error regenerating scene');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/regeneration/chapters/:chapterId/history
 * Get regeneration history for a chapter
 */
router.get('/chapters/:chapterId/history', (req, res) => {
  try {
    const { chapterId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validation
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100' });
    }

    if (offset < 0) {
      return res.status(400).json({ error: 'offset must be >= 0' });
    }

    const result = regenerationService.getHistory(chapterId, limit, offset);

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, chapterId: req.params.chapterId }, 'Error getting regeneration history');
    res.status(500).json({ error: error.message });
  }
});

export default router;
