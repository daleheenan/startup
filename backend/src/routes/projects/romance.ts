/**
 * Romance commercial routes
 * API endpoints for romance heat levels and emotional beats
 */

import { Router, Request, Response } from 'express';
import { romanceCommercialService } from '../../services/index.js';
import { createLogger } from '../../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:projects:romance');

// POST /api/projects/:id/romance-settings
// Set heat level configuration
router.post('/:id/romance-settings', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { heatLevel, contentWarnings, fadeToBlack, onPageIntimacy, sensualityFocus } = req.body;

    if (!heatLevel || heatLevel < 1 || heatLevel > 5) {
      return res.status(400).json({ error: 'Heat level must be between 1 and 5' });
    }

    const config = await romanceCommercialService.setHeatLevel(projectId, heatLevel, {
      contentWarnings,
      fadeToBlack,
      onPageIntimacy,
      sensualityFocus,
    });

    logger.info({ projectId, heatLevel }, 'Romance heat level set');
    res.json(config);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error setting romance heat level');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/romance-settings
// Get heat level configuration
router.get('/:id/romance-settings', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const config = await romanceCommercialService.getHeatLevel(projectId);

    if (!config) {
      return res.status(404).json({ error: 'No romance settings found for this project' });
    }

    res.json(config);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting romance heat level');
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id/romance-settings
// Delete heat level configuration
router.delete('/:id/romance-settings', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    await romanceCommercialService.deleteHeatLevel(projectId);

    logger.info({ projectId }, 'Romance heat level deleted');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error deleting romance heat level');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/romance-beats
// Track an emotional beat
router.post('/:id/romance-beats', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { beatType, chapterNumber, sceneDescription, emotionalIntensity, notes, completed } = req.body;

    if (!beatType) {
      return res.status(400).json({ error: 'Beat type is required' });
    }

    const beat = await romanceCommercialService.trackBeat(projectId, beatType, chapterNumber, {
      sceneDescription,
      emotionalIntensity,
      notes,
      completed,
    });

    logger.info({ projectId, beatType }, 'Romance beat tracked');
    res.json(beat);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error tracking romance beat');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/romance-beats
// Get all tracked beats
router.get('/:id/romance-beats', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const beats = await romanceCommercialService.getBeatTracking(projectId);

    res.json(beats);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting romance beats');
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id/romance-beats/:beatType
// Delete a tracked beat
router.delete('/:id/romance-beats/:beatType', async (req: Request, res: Response) => {
  try {
    const { id: projectId, beatType } = req.params;
    await romanceCommercialService.deleteBeat(projectId, beatType as any);

    logger.info({ projectId, beatType }, 'Romance beat deleted');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error deleting romance beat');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/romance-beats/validate
// Validate beat placement
router.get('/:id/romance-beats/validate', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { totalChapters } = req.query;

    if (!totalChapters) {
      return res.status(400).json({ error: 'totalChapters query parameter is required' });
    }

    const validation = await romanceCommercialService.validateBeats(
      projectId,
      parseInt(totalChapters as string, 10)
    );

    res.json(validation);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error validating romance beats');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/romance-beats/suggestions
// Get suggested beat placement
router.get('/:id/romance-beats/suggestions', async (req: Request, res: Response) => {
  try {
    const { totalChapters } = req.query;

    if (!totalChapters) {
      return res.status(400).json({ error: 'totalChapters query parameter is required' });
    }

    const suggestions = romanceCommercialService.getSuggestedBeats(
      parseInt(totalChapters as string, 10)
    );

    res.json(suggestions);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error getting beat suggestions');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/romance-beats/heartbreaker-check
// Check if story meets romance genre requirements
router.get('/:id/romance-beats/heartbreaker-check', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { totalChapters } = req.query;

    if (!totalChapters) {
      return res.status(400).json({ error: 'totalChapters query parameter is required' });
    }

    const check = await romanceCommercialService.isHeartbreaker(
      projectId,
      parseInt(totalChapters as string, 10)
    );

    res.json(check);
  } catch (error: any) {
    logger.error({ error, projectId: req.params.id }, 'Error checking heartbreaker status');
    res.status(500).json({ error: error.message });
  }
});

export default router;
